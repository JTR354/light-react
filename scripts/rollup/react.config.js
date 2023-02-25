// scr 路径
// dist 路径
// base 插件

import { DIST_PATH, getBasePlugins, getPkgJson, PKG_PATH } from './utils';

import generatePackageJson from 'rollup-plugin-generate-package-json';
const { name, module } = getPkgJson('react');

export default [
	{
		input: `${PKG_PATH}/${name}/${module}`,
		output: {
			file: `${DIST_PATH}/${name}/index.js`,
			name: 'react',
			format: 'umd'
		},
		plugins: [
			...getBasePlugins(),
			generatePackageJson({
				inputFolder: `${PKG_PATH}/${name}`,
				outputFolder: `${DIST_PATH}/${name}`,
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
		input: `${PKG_PATH}/${name}/src/jsx.ts`,
		output: {
			file: `${DIST_PATH}/${name}/jsx-runtime.js`,
			name: 'jsx-runtime',
			format: 'umd'
		},
		plugins: getBasePlugins()
	},
	{
		input: `${PKG_PATH}/${name}/src/jsx.ts`,
		output: {
			file: `${DIST_PATH}/${name}/jsx-dev-runtime.js`,
			name: 'jsx-dev-runtime',
			format: 'umd'
		},
		plugins: getBasePlugins()
	}
];
