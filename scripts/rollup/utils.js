import path from 'path';
import fs from 'fs';
import ts from 'rollup-plugin-typescript2';
import cjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

export function getBasicRollupPlugins({ typescript = {} } = {}) {
	return [
		replace({ __DEV__: true, preventAssignment: true }),
		cjs(),
		ts(typescript)
	];
}

export function getPkgPath(name) {
	return [
		resolvePath(`packages/${name}`),
		resolvePath(`dist/node_modules/${name}`)
	];
	function resolvePath(p) {
		return path.resolve(__dirname, `../../${p}`);
	}
}

export function getPkgPackageJson(name) {
	const packageJson = fs.readFileSync(getPkgPath(`${name}/package.json`)[0]);
	return JSON.parse(packageJson);
}
