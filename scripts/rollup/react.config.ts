// scr 路径
// dist 路径
// base 插件

import { getBasePlugins, getDistPath, getPkgJson, getPkgPath } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';

const { name, module } = getPkgJson('react');
const sourcePath = getPkgPath(name);
const distPath = getDistPath(name);

export default [
	{
		input: `${sourcePath}/${module}`,
		output: {
			file: `${distPath}/index.js`,
			name: 'React',
			exports: 'named',
			format: 'umd'
		},
		plugins: [
			...getBasePlugins(),
			generatePackageJson({
				inputFolder: sourcePath,
				outputFolder: distPath,
				baseContents: ({ description, name, version }) => {
					return {
						name,
						version,
						description,
						main: 'index.js'
					};
				}
			})
		]
	},
	{
		input: `${sourcePath}/src/jsx.ts`,
		output: {
			exports: 'named',
			file: `${distPath}/jsx-runtime.js`,
			name: 'jsx-runtime',
			format: 'umd'
		},
		plugins: getBasePlugins()
	},
	{
		input: `${sourcePath}/src/jsx.ts`,
		output: {
			exports: 'named',
			file: `${distPath}/jsx-dev-runtime.js`,
			name: 'jsx-dev-runtime',
			format: 'umd'
		},
		plugins: getBasePlugins()
	}
];
