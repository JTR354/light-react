import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import replace from '@rollup/plugin-replace';
import { getPkgPath } from '../rollup/utils';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), replace({ __DEV__: true })],
	resolve: {
		alias: [
			{
				find: 'react',
				replacement: getPkgPath('react'),
			},
			{
				find: 'react-dom',
				replacement: getPkgPath('react-dom'),
			},
			{
				find: 'react-reconciler',
				replacement: getPkgPath('react-reconciler'),
			},
			{
				find: 'shared',
				replacement: getPkgPath('shared'),
			},
			{
				find: 'hostConfig',
				replacement: `${getPkgPath('react-dom')}/src/hostConfig.ts`,
			},
		],
	},
});
