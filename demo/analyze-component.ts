import fs from 'fs/promises';
import path from 'path';
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import type { NodePath, Visitor } from '@babel/traverse';
import type { File, ObjectExpression, Identifier, JSXElement, ImportDeclaration } from '@babel/types';

// ===================== 【仅需修改这3个配置项】 =====================
const WORKSPACE_DIR = path.resolve(__dirname, 'src'); // 你的项目工作目录（如src）
const OUTPUT_MD_PATH = path.resolve(__dirname, 'docs/prompt/capability-report.md'); // 报告输出路径
const TARGET_COMPONENT = 'Capability'; // 要分析的React组件名
// =====================================================================

// 类型定义
interface ImportInfo {
  originalSource: string;
  resolvedSource: string;
  importedName: string;
  type: string;
}

interface PropInfo {
  tsType: string;
  count: number;
  files: Set<string>;
  sources: Set<string>;
  imports: Set<string>;
}

interface VarTypeResult {
  typeName: string;
  typeDef: string;
}

interface ConfigAlias {
  [key: string]: string;
}

// 全局存储：解析出的对象类型接口（如Permission/PermissionRead）
const globalVarTypeDefs: Set<string> = new Set();
// 自动解析的别名配置
let ALIAS_CONFIG: ConfigAlias = {};
// 存储组件属性分析结果
const capabilityProps: Record<string, PropInfo> = {};

/**
 * 递归向上查找构建配置文件（webpack/vite/vue.config.js）
 */
async function findFileUpwards(startDir: string, filenames: string[]): Promise<string | null> {
  try {
    const entries = await fs.readdir(startDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && filenames.includes(entry.name)) {
        return path.join(startDir, entry.name);
      }
    }
    const parentDir = path.dirname(startDir);
    if (parentDir === startDir) return null; // 已到系统根目录
    return await findFileUpwards(parentDir, filenames);
  } catch (err) {
    return null;
  }
}

/**
 * 自动解析项目别名配置（适配Vite/Webpack/Vue CLI）
 */
async function autoResolveAlias(workspaceDir: string): Promise<ConfigAlias> {
  const aliasMap: ConfigAlias = {};
  // 优先级：Vite > Webpack > Vue CLI
  const configFiles = [
    'vite.config.js', 'vite.config.ts',
    'webpack.config.js', 'webpack.config.ts',
    'vue.config.js'
  ];

  const configPath = await findFileUpwards(workspaceDir, configFiles);
  if (!configPath) {
    console.log(`⚠️ 未找到构建配置文件，使用默认别名: @ → ${path.join(workspaceDir, 'src')}`);
    aliasMap['@'] = path.join(workspaceDir, 'src');
    return aliasMap;
  }
  console.log(`📌 找到构建配置文件: ${configPath}`);

  try {
    // 动态导入配置文件（避免TS编译时的类型报错）
    const config = await import(configPath);
    const configDir = path.dirname(configPath);

    // 适配Vite别名（对象/数组两种格式）
    if (configPath.includes('vite.config')) {
      const viteAlias = config.default?.resolve?.alias || {};
      if (Array.isArray(viteAlias)) {
        viteAlias.forEach((item: { find: string; replacement: string }) => {
          if (item.find && item.replacement) {
            aliasMap[item.find] = path.resolve(configDir, item.replacement);
          }
        });
      } else if (typeof viteAlias === 'object') {
        Object.entries(viteAlias).forEach(([alias, target]) => {
          aliasMap[alias] = path.resolve(configDir, target as string);
        });
      }
    }
    // 适配Webpack别名
    else if (configPath.includes('webpack.config')) {
      const webpackAlias = config.default?.resolve?.alias || {};
      Object.entries(webpackAlias).forEach(([alias, target]) => {
        aliasMap[alias] = path.isAbsolute(target as string) 
          ? target as string 
          : path.resolve(configDir, target as string);
      });
    }
    // 适配Vue CLI别名
    else if (configPath.includes('vue.config.js')) {
      const vueAlias = config.default?.configureWebpack?.resolve?.alias || {};
      Object.entries(vueAlias).forEach(([alias, target]) => {
        aliasMap[alias] = path.resolve(configDir, target as string);
      });
    }

    if (Object.keys(aliasMap).length === 0) {
      aliasMap['@'] = path.join(workspaceDir, 'src');
      console.log(`⚠️ 配置文件中未找到别名，使用默认别名`);
    } else {
      console.log(`✅ 自动解析到别名配置:`, aliasMap);
    }
    return aliasMap;
  } catch (err) {
    console.log(`⚠️ 解析配置文件出错: ${(err as Error).message}，使用默认别名`);
    aliasMap['@'] = path.join(workspaceDir, 'src');
    return aliasMap;
  }
}

/**
 * 核心：解析ObjectExpression的完整结构，生成嵌套TS接口
 * @param {ObjectExpression} objExpr AST的ObjectExpression节点
 * @param {string} interfaceName 接口名（如Permission）
 * @returns {string} 完整TS接口字符串
 */
function parseObjectStructure(objExpr: ObjectExpression, interfaceName: string): string {
  if (!t.isObjectExpression(objExpr)) return `type ${interfaceName} = any`;

  let interfaceStr = `interface ${interfaceName} {\n`;
  // 遍历对象所有属性
  objExpr.properties.forEach(prop => {
    if (t.isObjectProperty(prop)) {
      const propName = prop.key.name || (prop.key as t.StringLiteral).value; // 属性名（read/delete）
      let propType = 'any';

      // 递归解析属性值类型
      if (t.isStringLiteral(prop.value)) {
        propType = 'string';
      } else if (t.isNumericLiteral(prop.value)) {
        propType = 'number';
      } else if (t.isBooleanLiteral(prop.value)) {
        propType = 'boolean';
      } else if (t.isArrayExpression(prop.value)) {
        propType = 'any[]';
      } else if (t.isObjectExpression(prop.value)) {
        // 嵌套对象：生成子接口（如PermissionRead）
        const subInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1)}`;
        const subInterface = parseObjectStructure(prop.value, subInterfaceName);
        // 子接口拼到前面，避免引用报错
        interfaceStr = `${subInterface}\n\n${interfaceStr}`;
        propType = subInterfaceName;
      }

      interfaceStr += `  ${propName}: ${propType};\n`;
    }
  });
  interfaceStr += `}`;
  return interfaceStr;
}

/**
 * 增强版：解析导入变量的精准类型（返回类型名+TS接口定义）
 * @param {string} varName 变量名（如permission/role）
 * @param {string} importRealPath 变量的实际导入路径
 * @returns {VarTypeResult} 类型结果
 */
async function resolveImportVarTypeEnhanced(varName: string, importRealPath: string): Promise<VarTypeResult> {
  // 处理省略文件后缀的情况（@/constants/auth → @/constants/auth.js）
  const validExts = ['.js', '.jsx', '.ts', '.tsx'];
  let realFilePath = importRealPath;

  if (!validExts.includes(path.extname(realFilePath))) {
    const possiblePaths = [
      `${realFilePath}.js`,
      `${realFilePath}.jsx`,
      `${realFilePath}/index.js`,
      `${realFilePath}/index.jsx`
    ];
    for (const p of possiblePaths) {
      try {
        await fs.access(p); // 检查文件是否存在
        realFilePath = p;
        break;
      } catch (err) {
        continue;
      }
    }
  }

  try {
    // 读取文件内容并生成AST
    const fileContent = await fs.readFile(realFilePath, 'utf8');
    const ast = parser.parse(fileContent, {
      sourceType: 'module',
      plugins: ['jsx', 'es6', 'optionalChaining']
    }) as File;

    let result: VarTypeResult = { typeName: 'any', typeDef: '' };

    // 遍历AST查找变量定义
    traverse(ast, {
      // 处理命名导出：export const xxx = ...
      ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
        if (!path.node.declaration || !t.isVariableDeclaration(path.node.declaration)) return;
        
        path.node.declaration.declarations.forEach(decl => {
          if ((decl.id as Identifier).name === varName && decl.init) {
            // 基础类型
            if (t.isStringLiteral(decl.init)) {
              result = { typeName: 'string', typeDef: '' };
            } else if (t.isNumericLiteral(decl.init)) {
              result = { typeName: 'number', typeDef: '' };
            } else if (t.isBooleanLiteral(decl.init)) {
              result = { typeName: 'boolean', typeDef: '' };
            } else if (t.isArrayExpression(decl.init)) {
              result = { typeName: 'any[]', typeDef: '' };
            }
            // 对象类型：解析完整结构并生成TS接口
            else if (t.isObjectExpression(decl.init)) {
              const interfaceName = varName.charAt(0).toUpperCase() + varName.slice(1); // Permission
              const typeDef = parseObjectStructure(decl.init, interfaceName);
              result = { typeName: interfaceName, typeDef };
              globalVarTypeDefs.add(typeDef); // 存入全局接口定义
            }
          }
        });
      },
      // 处理默认导出：export default ...
      ExportDefaultDeclaration(path: NodePath<t.ExportDefaultDeclaration>) {
        if (varName === 'default' && path.node.declaration) {
          if (t.isObjectExpression(path.node.declaration)) {
            const interfaceName = 'DefaultExport';
            const typeDef = parseObjectStructure(path.node.declaration, interfaceName);
            result = { typeName: interfaceName, typeDef };
            globalVarTypeDefs.add(typeDef);
          } else if (t.isStringLiteral(path.node.declaration)) {
            result = { typeName: 'string', typeDef: '' };
          } else if (t.isNumericLiteral(path.node.declaration)) {
            result = { typeName: 'number', typeDef: '' };
          } else if (t.isBooleanLiteral(path.node.declaration)) {
            result = { typeName: 'boolean', typeDef: '' };
          } else if (t.isArrayExpression(path.node.declaration)) {
            result = { typeName: 'any[]', typeDef: '' };
          }
        }
      }
    } as Visitor<File>);

    return result;
  } catch (err) {
    // 文件不存在/解析失败，返回any
    return { typeName: 'any', typeDef: '' };
  }
}

/**
 * 递归遍历目录，获取所有.js/.jsx文件路径
 */
async function getAllJsFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await getAllJsFiles(fullPath);
        results = [...results, ...subFiles];
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.js' || ext === '.jsx') {
          results.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`读取目录失败: ${dir}`, (err as Error).message);
  }
  return results;
}

/**
 * 解析别名路径为实际物理路径
 * @param {string} importPath 源码中的导入路径（如@/constants/auth）
 * @param {string} currentFileDir 当前文件所在目录
 * @returns {object} { originalPath: 原路径, resolvedPath: 实际路径 }
 */
function resolveAliasPath(importPath: string, currentFileDir: string): { originalPath: string; resolvedPath: string } {
  if (!importPath || typeof importPath !== 'string') {
    return { originalPath: importPath, resolvedPath: importPath };
  }

  let resolvedPath = importPath;
  const aliasEntries = Object.entries(ALIAS_CONFIG);
  for (const [alias, aliasRealPath] of aliasEntries) {
    if (importPath.startsWith(`${alias}/`) || importPath === alias) {
      resolvedPath = importPath.replace(alias, aliasRealPath);
      resolvedPath = path.resolve(currentFileDir, resolvedPath);
      break;
    }
  }

  return {
    originalPath: importPath,
    resolvedPath: path.normalize(resolvedPath),
  };
}

/**
 * 递归解析表达式，找到最底层的导入变量
 * @param {t.Expression} expr AST表达式节点
 * @param {Map<string, ImportInfo>} importMap 导入变量映射表
 * @returns {object} { rootVar: 根变量名, importInfo: 导入信息, fullExpr: 完整表达式 }
 */
function resolveExpressionRoot(
  expr: t.Expression, 
  importMap: Map<string, ImportInfo>
): { rootVar: string | null; importInfo: ImportInfo | null; fullExpr: string } {
  let rootVar: string | null = null;
  let importInfo: ImportInfo | null = null;
  let fullExpr = generate(expr).code;

  function traverseExpr(node: t.Node) {
    if (t.isIdentifier(node)) {
      rootVar = node.name;
      importInfo = importMap.get(node.name) || null;
      return;
    } else if (t.isMemberExpression(node)) {
      traverseExpr(node.object);
    } else if (t.isOptionalMemberExpression(node)) {
      traverseExpr(node.object);
    } else {
      rootVar = `[复杂表达式: ${fullExpr}]`;
      importInfo = null;
    }
  }

  traverseExpr(expr);
  return { rootVar, importInfo, fullExpr };
}

/**
 * 解析单个文件，分析Target Component的所有属性
 */
async function parseFile(filePath: string): Promise<void> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const ast = parser.parse(fileContent, {
      sourceType: 'module',
      plugins: ['jsx', 'es6', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    }) as File;

    const importMap = new Map<string, ImportInfo>();
    const currentFileDir = path.dirname(filePath);

    // 第一步：构建导入变量映射表（解析别名）
    traverse(ast, {
      ImportDeclaration(path: NodePath<ImportDeclaration>) {
        const source = path.node.source.value;
        const { originalPath, resolvedPath } = resolveAliasPath(source, currentFileDir);

        path.node.specifiers.forEach(specifier => {
          let localName = '';
          let importedName = '';
          let type = '';

          if (t.isImportDefaultSpecifier(specifier)) {
            localName = specifier.local.name;
            importedName = 'default';
            type = 'ImportDefaultSpecifier';
          } else if (t.isImportNamedSpecifier(specifier)) {
            localName = specifier.local.name;
            importedName = (specifier.imported as Identifier)?.name || localName;
            type = 'ImportNamedSpecifier';
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            localName = specifier.local.name;
            importedName = '*';
            type = 'ImportNamespaceSpecifier';
          }

          if (localName) {
            importMap.set(localName, {
              originalSource: originalPath,
              resolvedSource: resolvedPath,
              importedName,
              type,
            });
          }
        });
      },
    } as Visitor<File>);

    // 第二步：分析Target Component的属性
    traverse(ast, {
      JSXElement: async (path: NodePath<JSXElement>) => {
        const openingElement = path.node.openingElement;
        let componentName: string | undefined;

        // 获取组件名
        if (t.isJSXIdentifier(openingElement.name)) {
          componentName = openingElement.name.name;
        } else if (t.isJSXMemberExpression(openingElement.name)) {
          componentName = (openingElement.name.property as t.JSXIdentifier).name;
        }

        if (componentName !== TARGET_COMPONENT) return;

        // 遍历所有属性
        for (const attr of openingElement.attributes) {
          if (t.isJSXSpreadAttribute(attr)) continue;

          // 获取属性名
          let propName: string | undefined;
          if (t.isJSXIdentifier(attr.name)) {
            propName = attr.name.name;
          } else if (t.isJSXNamespacedName(attr.name)) {
            propName = `${attr.name.namespace.name}:${attr.name.name.name}`;
          }
          if (!propName) continue;

          let propValue: string = '';
          let propSourceCode: string = '';
          let importInfo: ImportInfo | null = null;
          let varTypeName = 'any'; // 最终的TS类型名

          // 解析属性值
          if (attr.value) {
            // 字符串字面量
            if (t.isStringLiteral(attr.value)) {
              propValue = attr.value.value;
              propSourceCode = `"${propValue}"`;
              varTypeName = 'string';
            }
            // 数字字面量
            else if (t.isNumericLiteral(attr.value)) {
              propValue = attr.value.value.toString();
              propSourceCode = propValue;
              varTypeName = 'number';
            }
            // 布尔字面量
            else if (t.isBooleanLiteral(attr.value)) {
              propValue = attr.value.value.toString();
              propSourceCode = propValue;
              varTypeName = 'boolean';
            }
            // 表达式容器（如{permission}）
            else if (t.isJSXExpressionContainer(attr.value)) {
              const expr = attr.value.expression;
              const { rootVar, importInfo: exprImportInfo, fullExpr } = resolveExpressionRoot(expr, importMap);
              
              propSourceCode = `{${fullExpr}}`;
              importInfo = exprImportInfo;

              // 解析导入变量的精准类型
              if (rootVar && !rootVar.startsWith('[复杂表达式:')) {
                if (importInfo) {
                  const typeResult = await resolveImportVarTypeEnhanced(
                    importInfo.importedName,
                    importInfo.resolvedSource
                  );
                  varTypeName = typeResult.typeName;
                }
                propValue = `引用变量: ${rootVar} (类型: ${varTypeName}) (完整表达式: ${fullExpr})`;
              }
              // 直接写的对象字面量
              else if (t.isObjectExpression(expr)) {
                propValue = '对象类型';
                propSourceCode = `{${fullExpr}}`;
                varTypeName = 'object';
              }
              // 直接写的数组字面量
              else if (t.isArrayExpression(expr)) {
                propValue = '数组类型';
                propSourceCode = `{${fullExpr}}`;
                varTypeName = 'any[]';
              }
              // 函数调用/复杂表达式
              else {
                propValue = '复杂表达式';
                propSourceCode = `{${fullExpr}}`;
                varTypeName = 'any';
              }
            }
          }
          // 无值属性（如disabled）
          else {
            propValue = '布尔值（存在即true）';
            propSourceCode = propName;
            varTypeName = 'boolean';
          }

          // 标准化文件路径
          const relativeFilePath = path.relative(WORKSPACE_DIR, filePath);

          // 更新属性统计结果
          if (!capabilityProps[propName]) {
            capabilityProps[propName] = {
              tsType: varTypeName,
              count: 1,
              files: new Set([relativeFilePath]),
              sources: new Set([propSourceCode]),
              imports: importInfo ? new Set([JSON.stringify(importInfo)]) : new Set(),
            };
          } else {
            const propInfo = capabilityProps[propName];
            propInfo.count += 1;
            propInfo.files.add(relativeFilePath);
            propInfo.sources.add(propSourceCode);
            if (importInfo) propInfo.imports.add(JSON.stringify(importInfo));

            // 合并多场景的类型（如string | number）
            if (!propInfo.tsType.includes(varTypeName)) {
              propInfo.tsType = `${propInfo.tsType} | ${varTypeName}`;
            }
          }
        }
      },
    } as Visitor<File>);
  } catch (err) {
    console.error(`解析文件失败: ${filePath}`, (err as Error).message);
  }
}

/**
 * 生成精准的TS类型定义字符串（包含所有嵌套接口）
 */
function generateTsType(): string {
  // 第一步：拼接所有解析出的对象接口
  let typeDefStr = '';
  globalVarTypeDefs.forEach(def => {
    if (def) typeDefStr += `${def}\n\n`;
  });

  // 第二步：拼接Component属性接口
  typeDefStr += `interface ${TARGET_COMPONENT}Props {\n`;
  Object.entries(capabilityProps).forEach(([propName, propInfo]) => {
    typeDefStr += `  ${propName}?: ${propInfo.tsType};\n`;
  });
  typeDefStr += `}\n`;

  return typeDefStr;
}

/**
 * 生成完整的Markdown分析报告
 */
async function generateMarkdown(): Promise<string> {
  const tsTypeCode = generateTsType();

  // 拼接属性统计信息
  let propsStats = '';
  Object.entries(capabilityProps).forEach(([propName, propInfo]) => {
    propsStats += `### ${propName}\n`;
    propsStats += `- **引用次数**: ${propInfo.count}\n`;
    propsStats += `- **引用文件**: \n  - ${Array.from(propInfo.files).join('\n  - ')}\n`;
    propsStats += `- **源码写法示例**: \n  - ${Array.from(propInfo.sources).join('\n  - ')}\n`;
    if (propInfo.imports.size > 0) {
      propsStats += `- **导入信息**: \n`;
      Array.from(propInfo.imports).forEach(importStr => {
        const { originalSource, resolvedSource, importedName, type } = JSON.parse(importStr) as ImportInfo;
        propsStats += `  - 源码路径: ${originalSource} | 实际路径: ${resolvedSource} | 导出名: ${importedName} | 导入类型: ${type}\n`;
      });
    }
    propsStats += `- **TS类型**: ${propInfo.tsType}\n\n`;
  });

  // 完整报告内容
  return `# ${TARGET_COMPONENT}组件属性分析报告

## 1. 精准TS类型定义
\`\`\`typescript
${tsTypeCode}
\`\`\`

## 2. 属性使用统计
${propsStats || `未找到任何${TARGET_COMPONENT}组件的使用记录`}

## 3. 分析信息
- 分析目录: ${WORKSPACE_DIR}
- 自动解析的别名配置: ${JSON.stringify(ALIAS_CONFIG, null, 2)}
- 分析文件数: ${(await getAllJsFiles(WORKSPACE_DIR)).length} 个.js/.jsx文件
- 分析属性数: ${Object.keys(capabilityProps).length} 个不同属性
- 生成的TS接口数: ${Array.from(globalVarTypeDefs).length} 个嵌套接口
- 分析时间: ${new Date().toLocaleString()}
`;
}

/**
 * 主函数：执行完整的分析流程
 */
async function main(): Promise<void> {
  console.log(`=== 开始分析${TARGET_COMPONENT}组件属性（含对象结构深度解析） ===`);
  
  // 1. 自动解析项目别名配置
  ALIAS_CONFIG = await autoResolveAlias(WORKSPACE_DIR);
  
  // 2. 获取所有待分析的JS/JSX文件
  const jsFiles = await getAllJsFiles(WORKSPACE_DIR);
  console.log(`✅ 找到 ${jsFiles.length} 个.js/.jsx文件`);

  // 3. 逐个解析文件，分析组件属性
  for (const filePath of jsFiles) {
    await parseFile(filePath);
  }

  // 4. 生成并写入Markdown报告
  const markdownContent = await generateMarkdown();
  const outputDir = path.dirname(OUTPUT_MD_PATH);
  await fs.mkdir(outputDir, { recursive: true }); // 确保输出目录存在
  await fs.writeFile(OUTPUT_MD_PATH, markdownContent, 'utf8');

  // 输出完成信息
  console.log(`✅ 分析完成！报告已保存至: ${OUTPUT_MD_PATH}`);
  console.log(`✅ 共分析出 ${Object.keys(capabilityProps).length} 个不同属性`);
  console.log(`✅ 生成了 ${Array.from(globalVarTypeDefs).length} 个TS对象接口`);
}

// 执行主函数（捕获全局异常）
main().catch(err => {
  console.error(`❌ 分析过程出错:`, (err as Error).message);
  process.exit(1);
});
