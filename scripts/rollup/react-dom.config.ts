// scr 路径
// dist 路径
// base 插件

import { getBasePlugins, getDistPath, getPkgJson, getPkgPath } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module } = getPkgJson('react-dom');
const sourcePath = getPkgPath(name);
const distPath = getDistPath(name);

export default [
	{
		input: `${sourcePath}/${module}`,
		output: [
			{
				file: `${distPath}/index.js`,
				name,
				format: 'umd'
			},
			{
				file: `${distPath}/client.js`,
				name,
				format: 'umd'
			}
		],
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
	}
];
