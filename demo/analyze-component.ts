/**
pnpm add -w -D @babel/parser @babel/traverse @babel/types @babel/generator  @types/node @types/babel__parser @types/babel__traverse @types/babel__generator
typescript 
*/

import fs from 'fs/promises';
import path from 'path';
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import type { NodePath, Visitor } from '@babel/traverse';
import type { File, ObjectExpression, Identifier, JSXElement, ImportDeclaration, ExportNamedDeclaration, ExportDefaultDeclaration } from '@babel/types';

// ===================== 【仅需修改这3个配置项】 =====================
const WORKSPACE_DIR = path.resolve(__dirname, 'src');
const OUTPUT_MD_PATH = path.resolve(__dirname, 'docs/prompt/capability-report.md');
const TARGET_COMPONENT = 'Capability';
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

// 全局变量
const globalVarTypeDefs: Set<string> = new Set();
let ALIAS_CONFIG: ConfigAlias = {};
const capabilityProps: Record<string, PropInfo> = {};

/**
 * 递归向上查找构建配置文件
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
    if (parentDir === startDir) return null;
    return await findFileUpwards(parentDir, filenames);
  } catch (err) {
    console.error(`查找配置文件失败: ${(err as Error).message}`);
    return null;
  }
}

/**
 * 自动解析项目别名配置
 */
async function autoResolveAlias(workspaceDir: string): Promise<ConfigAlias> {
  const aliasMap: ConfigAlias = {};
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
    // 动态导入配置文件（使用 require 避免 ES 模块兼容问题）
    const config = require(configPath);
    const resolvedConfig = config.default || config; // 兼容 ES Module 和 CommonJS
    const configDir = path.dirname(configPath);

    if (configPath.includes('vite.config')) {
      const viteAlias = resolvedConfig.resolve?.alias || {};
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
    } else if (configPath.includes('webpack.config')) {
      const webpackAlias = resolvedConfig.resolve?.alias || {};
      Object.entries(webpackAlias).forEach(([alias, target]) => {
        aliasMap[alias] = path.isAbsolute(target as string) 
          ? target as string 
          : path.resolve(configDir, target as string);
      });
    } else if (configPath.includes('vue.config.js')) {
      const vueAlias = resolvedConfig.configureWebpack?.resolve?.alias || resolvedConfig.chainWebpack?.()?.resolve?.alias || {};
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
 * 解析 ObjectExpression 生成 TS 接口
 */
function parseObjectStructure(objExpr: ObjectExpression, interfaceName: string): string {
  if (!t.isObjectExpression(objExpr)) return `type ${interfaceName} = any`;

  let interfaceStr = `interface ${interfaceName} {\n`;
  objExpr.properties.forEach(prop => {
    if (t.isObjectProperty(prop)) {
      // 修复：严格判断 key 类型，避免类型报错
      const propKey = prop.key;
      let propName: string;
      if (t.isIdentifier(propKey)) {
        propName = propKey.name;
      } else if (t.isStringLiteral(propKey)) {
        propName = propKey.value;
      } else {
        propName = 'unknown-key';
        return;
      }

      let propType = 'any';
      if (t.isStringLiteral(prop.value)) {
        propType = 'string';
      } else if (t.isNumericLiteral(prop.value)) {
        propType = 'number';
      } else if (t.isBooleanLiteral(prop.value)) {
        propType = 'boolean';
      } else if (t.isArrayExpression(prop.value)) {
        propType = 'any[]';
      } else if (t.isObjectExpression(prop.value)) {
        const subInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1)}`;
        const subInterface = parseObjectStructure(prop.value, subInterfaceName);
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
 * 增强版：解析导入变量的精准类型
 */
async function resolveImportVarTypeEnhanced(varName: string, importRealPath: string): Promise<VarTypeResult> {
  const validExts = ['.js', '.jsx', '.ts', '.tsx'];
  let realFilePath = importRealPath;

  if (!validExts.includes(path.extname(realFilePath))) {
    const possiblePaths = [
      `${realFilePath}.js`, `${realFilePath}.jsx`,
      `${realFilePath}/index.js`, `${realFilePath}/index.jsx`
    ];
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        realFilePath = p;
        break;
      } catch (err) {
        continue;
      }
    }
  }

  try {
    const fileContent = await fs.readFile(realFilePath, 'utf8');
    const ast = parser.parse(fileContent, {
      sourceType: 'module',
      plugins: ['jsx', 'es6', 'optionalChaining']
    }) as File;

    let result: VarTypeResult = { typeName: 'any', typeDef: '' };

    traverse(ast, {
      ExportNamedDeclaration(path: NodePath<ExportNamedDeclaration>) {
        if (!path.node.declaration || !t.isVariableDeclaration(path.node.declaration)) return;
        
        path.node.declaration.declarations.forEach(decl => {
          if (!t.isIdentifier(decl.id)) return; // 修复：判断 decl.id 是 Identifier 类型
          if (decl.id.name === varName && decl.init) {
            if (t.isStringLiteral(decl.init)) {
              result = { typeName: 'string', typeDef: '' };
            } else if (t.isNumericLiteral(decl.init)) {
              result = { typeName: 'number', typeDef: '' };
            } else if (t.isBooleanLiteral(decl.init)) {
              result = { typeName: 'boolean', typeDef: '' };
            } else if (t.isArrayExpression(decl.init)) {
              result = { typeName: 'any[]', typeDef: '' };
            } else if (t.isObjectExpression(decl.init)) {
              const interfaceName = varName.charAt(0).toUpperCase() + varName.slice(1);
              const typeDef = parseObjectStructure(decl.init, interfaceName);
              result = { typeName: interfaceName, typeDef };
              globalVarTypeDefs.add(typeDef);
            }
          }
        });
      },
      ExportDefaultDeclaration(path: NodePath<ExportDefaultDeclaration>) {
        if (varName !== 'default' || !path.node.declaration) return;
        const decl = path.node.declaration;

        if (t.isStringLiteral(decl)) {
          result = { typeName: 'string', typeDef: '' };
        } else if (t.isNumericLiteral(decl)) {
          result = { typeName: 'number', typeDef: '' };
        } else if (t.isBooleanLiteral(decl)) {
          result = { typeName: 'boolean', typeDef: '' };
        } else if (t.isArrayExpression(decl)) {
          result = { typeName: 'any[]', typeDef: '' };
        } else if (t.isObjectExpression(decl)) {
          const interfaceName = 'DefaultExport';
          const typeDef = parseObjectStructure(decl, interfaceName);
          result = { typeName: interfaceName, typeDef };
          globalVarTypeDefs.add(typeDef);
        }
      }
    } as Visitor<File>);

    return result;
  } catch (err) {
    console.error(`解析变量类型失败: ${(err as Error).message}`);
    return { typeName: 'any', typeDef: '' };
  }
}

/**
 * 递归遍历目录获取 JS/JSX 文件
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
    console.error(`读取目录失败: ${dir} → ${(err as Error).message}`);
  }
  return results;
}

/**
 * 解析别名路径为实际路径
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

  return { originalPath: importPath, resolvedPath: path.normalize(resolvedPath) };
}

/**
 * 递归解析表达式根变量
 */
function resolveExpressionRoot(
  expr: t.Expression,
  importMap: Map<string, ImportInfo>
): { rootVar: string | null; importInfo: ImportInfo | null; fullExpr: string } {
  let rootVar: string | null = null;
  let importInfo: ImportInfo | null = null;
  const fullExpr = generate(expr).code;

  function traverseExpr(node: t.Node) {
    if (t.isIdentifier(node)) {
      rootVar = node.name;
      importInfo = importMap.get(node.name) || null;
    } else if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
      traverseExpr(node.object);
    } else {
      rootVar = `[复杂表达式: ${fullExpr}]`;
    }
  }

  traverseExpr(expr);
  return { rootVar, importInfo, fullExpr };
}

/**
 * 解析单个文件的组件属性
 */
async function parseFile(filePath: string): Promise<void> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const ast = parser.parse(fileContent, {
      sourceType: 'module',
      plugins: ['jsx', 'es6', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator']
    }) as File;

    const importMap = new Map<string, ImportInfo>();
    const currentFileDir = path.dirname(filePath);

    // 构建导入映射
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
            importedName = specifier.imported ? (specifier.imported as Identifier).name : localName;
            type = 'ImportNamedSpecifier';
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            localName = specifier.local.name;
            importedName = '*';
            type = 'ImportNamespaceSpecifier';
          }

          if (localName) {
            importMap.set(localName, { originalSource, resolvedSource, importedName, type });
          }
        });
      }
    } as Visitor<File>);

    // 分析组件属性
    traverse(ast, {
      JSXElement: async (path: NodePath<JSXElement>) => {
        const openingElement = path.node.openingElement;
        let componentName: string | undefined;

        if (t.isJSXIdentifier(openingElement.name)) {
          componentName = openingElement.name.name;
        } else if (t.isJSXMemberExpression(openingElement.name)) {
          componentName = t.isJSXIdentifier(openingElement.name.property) ? openingElement.name.property.name : undefined;
        }

        if (componentName !== TARGET_COMPONENT) return;

        for (const attr of openingElement.attributes) {
          if (t.isJSXSpreadAttribute(attr)) continue;
          if (!t.isJSXAttribute(attr)) continue; // 修复：确保是 JSXAttribute 类型

          let propName: string | undefined;
          if (t.isJSXIdentifier(attr.name)) {
            propName = attr.name.name;
          } else if (t.isJSXNamespacedName(attr.name)) {
            propName = `${attr.name.namespace.name}:${attr.name.name.name}`;
          }
          if (!propName) continue;

          let propValue = '';
          let propSourceCode = '';
          let importInfo: ImportInfo | null = null;
          let varTypeName = 'any';

          if (attr.value) {
            if (t.isStringLiteral(attr.value)) {
              propValue = attr.value.value;
              propSourceCode = `"${propValue}"`;
              varTypeName = 'string';
            } else if (t.isNumericLiteral(attr.value)) {
              propValue = attr.value.value.toString();
              propSourceCode = propValue;
              varTypeName = 'number';
            } else if (t.isBooleanLiteral(attr.value)) {
              propValue = attr.value.value.toString();
              propSourceCode = propValue;
              varTypeName = 'boolean';
            } else if (t.isJSXExpressionContainer(attr.value)) {
              const expr = attr.value.expression;
              const { rootVar, importInfo: exprImportInfo, fullExpr } = resolveExpressionRoot(expr as t.Expression, importMap);
              
              propSourceCode = `{${fullExpr}}`;
              importInfo = exprImportInfo;

              if (rootVar && !rootVar.startsWith('[复杂表达式:')) {
                if (importInfo) {
                  const typeResult = await resolveImportVarTypeEnhanced(importInfo.importedName, importInfo.resolvedSource);
                  varTypeName = typeResult.typeName;
                }
                propValue = `引用变量: ${rootVar} (类型: ${varTypeName}) (完整表达式: ${fullExpr})`;
              } else if (t.isObjectExpression(expr)) {
                propValue = '对象类型';
                propSourceCode = `{${fullExpr}}`;
                varTypeName = 'object';
              } else if (t.isArrayExpression(expr)) {
                propValue = '数组类型';
                propSourceCode = `{${fullExpr}}`;
                varTypeName = 'any[]';
              } else {
                propValue = '复杂表达式';
                propSourceCode = `{${fullExpr}}`;
                varTypeName = 'any';
              }
            }
          } else {
            propValue = '布尔值（存在即true）';
            propSourceCode = propName;
            varTypeName = 'boolean';
          }

          const relativeFilePath = path.relative(WORKSPACE_DIR, filePath);
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

            if (!propInfo.tsType.includes(varTypeName)) {
              propInfo.tsType = `${propInfo.tsType} | ${varTypeName}`;
            }
          }
        }
      }
    } as Visitor<File>);
  } catch (err) {
    console.error(`解析文件失败: ${filePath} → ${(err as Error).message}`);
  }
}

/**
 * 生成 TS 类型定义
 */
function generateTsType(): string {
  let typeDefStr = '';
  globalVarTypeDefs.forEach(def => {
    if (def) typeDefStr += `${def}\n\n`;
  });

  typeDefStr += `interface ${TARGET_COMPONENT}Props {\n`;
  Object.entries(capabilityProps).forEach(([propName, propInfo]) => {
    typeDefStr += `  ${propName}?: ${propInfo.tsType};\n`;
  });
  typeDefStr += `}\n`;
  return typeDefStr;
}

/**
 * 生成 Markdown 报告
 */
async function generateMarkdown(): Promise<string> {
  const tsTypeCode = generateTsType();
  let propsStats = '';

  Object.entries(capabilityProps).forEach(([propName, propInfo]) => {
    propsStats += `### ${propName}\n`;
    propsStats += `- **引用次数**: ${propInfo.count}\n`;
    propsStats += `- **引用文件**: \n  - ${Array.from(propInfo.files).join('\n  - ')}\n`;
    propsStats += `- **源码写法示例**: \n  - ${Array.from(propInfo.sources).join('\n  - ')}\n`;
    if (propInfo.imports.size > 0) {
      propsStats += `- **导入信息**: \n`;
      Array.from(propInfo.imports).forEach(importStr => {
        const importInfo = JSON.parse(importStr) as ImportInfo;
        propsStats += `  - 源码路径: ${importInfo.originalSource} | 实际路径: ${importInfo.resolvedSource} | 导出名: ${importInfo.importedName} | 导入类型: ${importInfo.type}\n`;
      });
    }
    propsStats += `- **TS类型**: ${propInfo.tsType}\n\n`;
  });

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
 * 主函数
 */
async function main(): Promise<void> {
  console.log(`=== 开始分析${TARGET_COMPONENT}组件属性 ===`);
  ALIAS_CONFIG = await autoResolveAlias(WORKSPACE_DIR);
  
  const jsFiles = await getAllJsFiles(WORKSPACE_DIR);
  console.log(`✅ 找到 ${jsFiles.length} 个待分析文件`);

  for (const filePath of jsFiles) {
    await parseFile(filePath);
  }

  const markdownContent = await generateMarkdown();
  const outputDir = path.dirname(OUTPUT_MD_PATH);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(OUTPUT_MD_PATH, markdownContent, 'utf8');

  console.log(`✅ 分析完成！报告路径: ${OUTPUT_MD_PATH}`);
  console.log(`✅ 分析属性数: ${Object.keys(capabilityProps).length}`);
  console.log(`✅ 生成接口数: ${Array.from(globalVarTypeDefs).length}`);
}

main().catch(err => {
  console.error(`❌ 执行失败: ${(err as Error).message}`);
  process.exit(1);
});
