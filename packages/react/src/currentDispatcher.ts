import { Action } from 'shared/ReactTypes';

export interface Dispatcher {
	useState: <T>(intiState: T | (() => T)) => [T, Dispatch<T>];
}

export type Dispatch<State> = (action: Action<State>) => void;

export const currentDispatcher: { current: Dispatcher | null } = {
	current: null,
};

export function resolveDispatcher() {
	const dispatcher = currentDispatcher.current;
	if (dispatcher === null) {
		throw new Error(`必须在react组件内使用hook`);
	}
	return dispatcher;
}
