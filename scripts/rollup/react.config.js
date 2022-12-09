import { getPkgPath, getBasicRollupPlugins, getPkgPackageJson } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';

// const pkgDir = pkgPath('react');
// const pkgDistDir = distPkgPath('react');
const { module, name } = getPkgPackageJson('react');
const [inputPath, outputPath] = getPkgPath(name);

export default [
	{
		input: `${inputPath}/${module}`,
		output: { file: `${outputPath}/index.js`, format: 'umd', name: 'index.js' },
		plugins: [
			...getBasicRollupPlugins(),
			generatePackageJson({
				inputFolder: `${inputPath}`,
				outputFolder: `${outputPath}`,
				baseContents({ name, description, version }) {
					return {
						name,
						description,
						version,
						main: 'index.js'
					};
				}
			})
		]
	},
	{
		input: `${inputPath}/src/jsx.ts`,
		output: [
			{
				file: `${outputPath}/jsx-runtime.js`,
				format: 'umd',
				name: 'jsx-runtime.js'
			},
			{
				file: `${outputPath}/jsx-dev-runtime.js`,
				format: 'umd',
				name: 'jsx-dev-runtime.js'
			}
		],
		plugins: getBasicRollupPlugins()
	}
];
