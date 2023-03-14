/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
import { defaults } from 'jest-config';

export default {
	...defaults,
	rootDir: process.cwd(),
	modulePathIgnorePatterns: ['<rootDir>/.history'],
	moduleDirectories: [...defaults.moduleDirectories, 'dist/node_modules'],
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'^scheduler$': '<rootDir>/node_modules/scheduler/unstable_mock.js',
	},
	fakeTimers: {
		enableGlobally: true,
		legacyFakeTimers: true,
	},
	setupFilesAfterEnv: ['./scripts/jest/setupJest.js'],
};
