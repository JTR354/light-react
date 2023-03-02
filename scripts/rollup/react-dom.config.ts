// scr 路径
// dist 路径
// base 插件

import { getBasePlugins, getDistPath, getPkgJson, getPkgPath } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPkgJson('react-dom');
const sourcePath = getPkgPath(name);
const distPath = getDistPath(name);

export default [
	{
		input: `${sourcePath}/${module}`,
		output: [
			{
				file: `${distPath}/index.js`,
				name: 'ReactDOM',
				exports: 'named',
				format: 'umd',
				globals: {
					react: 'React'
				}
			},
			{
				file: `${distPath}/client.js`,
				name: 'client',
				format: 'umd',
				globals: {
					react: 'React'
				}
			}
		],
		external: [...Object.keys(peerDependencies)],
		plugins: [
			alias({
				entries: {
					hostConfig: `${sourcePath}/src/hostConfig.ts`
				}
			}),
			...getBasePlugins(),
			generatePackageJson({
				inputFolder: sourcePath,
				outputFolder: distPath,
				baseContents: ({ description, name, version }) => {
					return {
						name,
						version,
						description,
						main: 'index.js',
						peerDependencies: {
							react: version
						}
					};
				}
			})
		]
	},
	{
		input: `${sourcePath}/test-utils.ts`,
		output: [
			{
				file: `${distPath}/test-utils.js`,
				name: 'test-utils',
				format: 'umd',
				globals: {
					'react-dom': 'reactDom'
				}
			}
		],
		external: ['react', 'react-dom'],
		plugins: [...getBasePlugins()]
	}
];
