// scr 路径
// dist 路径
// base 插件

import { getBasePlugins, getDistPath, getPkgJson, getPkgPath } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPkgJson('react-noop-renderer');
const sourcePath = getPkgPath(name);
const distPath = getDistPath(name);

export default [
	{
		input: `${sourcePath}/${module}`,
		output: [
			{
				file: `${distPath}/index.js`,
				name: 'ReactNoopRenderer',
				exports: 'named',
				format: 'umd',
				globals: {
					react: 'React',
					scheduler: 'Scheduler',
				},
			},
		],
		external: [...Object.keys(peerDependencies)],
		plugins: [
			alias({
				entries: {
					hostConfig: `${sourcePath}/src/hostConfig.ts`,
				},
			}),
			...getBasePlugins({
				typescript: {
					exclude: ['./packages/react-dom/**/*'],
					tsconfigOverride: {
						compilerOptions: {
							paths: {
								hostConfig: [`${sourcePath}/src/hostConfig.ts`],
							},
						},
					},
				},
			}),
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
							...peerDependencies,
							react: version,
						},
					};
				},
			}),
		],
	},
];
