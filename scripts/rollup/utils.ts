import fs from 'fs';
import path from 'path';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';

export const ROOT_PATH = path.resolve(__dirname, '../..');
export const PKG_PATH = path.join(ROOT_PATH, 'packages');
export const DIST_PATH = path.join(ROOT_PATH, 'dist/node_modules');
export function getPkgPath(name = '') {
	return `${PKG_PATH}/${name}`;
}
export function getDistPath(name = '') {
	return `${DIST_PATH}/${name}`;
}
export const getPkgJson = (name: string) => {
	const packageJsonPath = path.join(PKG_PATH, name, 'package.json');
	const packageJsonBody = fs.readFileSync(packageJsonPath, {
		encoding: 'utf-8'
	});
	return JSON.parse(packageJsonBody);
};
export const getBasePlugins = ({ typescript = {} } = {}) => {
	return [cjs, ts(typescript)];
};
