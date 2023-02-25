import fs from 'fs';
import path from 'path';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';

export const ROOT_PATH = path.resolve(__dirname, '../..');
export const PKG_PATH = path.join(ROOT_PATH, 'packages');
export const DIST_PATH = path.join(ROOT_PATH, 'dist/node_modules');
export const getPkgJson = (name) => {
	const p = path.join(PKG_PATH, name, 'package.json');
	const r = fs.readFileSync(p, { encoding: 'utf-8' });
	return JSON.parse(r);
};

export const getBasePlugins = ({ typescript = {} } = {}) => {
	return [cjs, ts(typescript)];
};
