import { getPkgPath, getPkgPackageJson, getBasicRollupPlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module } = getPkgPackageJson('react-dom');
const [inputFolder, outputFolder] = getPkgPath(name);
export default [
	{
		input: `${inputFolder}/${module}`,
		output: [
			{
				file: `${outputFolder}/index.js`,
				name: 'index.js',
				format: 'umd'
			},
			{
				file: `${outputFolder}/client.js`,
				name: 'client.js',
				format: 'umd'
			}
		],
		plugins: [
			...getBasicRollupPlugins(),
			alias({
				entries: {
					hostConfig: `${inputFolder}/src/hostConfig.ts`
				}
			}),
			generatePackageJson({
				inputFolder,
				outputFolder,
				baseContents({ version, description, name }) {
					return {
						version,
						description,
						name,
						peerDependencies: {
							react: version
						},
						main: 'index.js'
					};
				}
			})
		]
	}
];
