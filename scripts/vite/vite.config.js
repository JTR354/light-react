import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import replace from '@rollup/plugin-replace';
import { getPkgPath } from '../rollup/utils';
import path from 'path';
// https://vitejs.dev/config/
const [rdPath] = getPkgPath('react-dom');
export default defineConfig({
	plugins: [react(), replace({ __DEV__: true, preventAssignment: true })],
	resolve: {
		alias: [
			{
				find: 'react',
				replacement: getPkgPath('react')[0]
			},
			{
				find: 'react-dom',
				replacement: rdPath
			},
			{
				find: 'hostConfig',
				replacement: path.resolve(rdPath, './src/hostConfig.ts')
			}
		]
	}
});
