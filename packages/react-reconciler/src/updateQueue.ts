import { Action } from 'shared/ReactTypes';

export interface Update<S> {
	action: Action<S>;
}

export interface UpdateQueue<S> {
	shared: {
		pending: Update<S> | null;
	};
}

export const createUpdateQueue = <S>() =>
	({ shared: { pending: null } } as UpdateQueue<S>);

export const createUpdate = <S>(action: Action<S>): Update<S> => {
	return { action };
};

export const enqueueUpdate = <S>(
	updateQueue: UpdateQueue<S>,
	update: Update<S>
) => {
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <S>(
	baseState: S,
	updateQueue: Update<S> | null
): { memorizedState: S } => {
	const result: ReturnType<typeof processUpdateQueue<S>> = {
		memorizedState: baseState
	};
	if (updateQueue !== null) {
		const action = updateQueue.action;
		if (action instanceof Function) {
			result.memorizedState = action(baseState);
		} else {
			result.memorizedState = action;
		}
	}
	return result;
};
