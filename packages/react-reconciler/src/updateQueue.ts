import { Action } from 'shared/ReactTypes';

export const createUpdateQueue = <S>() => {
	return {
		shared: {
			pending: null
		}
	} as UpdateQueue<S>;
};

export interface UpdateQueue<S> {
	shared: {
		pending: Update<S> | null;
	};
}

export interface Update<S> {
	action: Action<S>;
}

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
	pendingUpdate: Update<S> | null
): { memoizedState: S } => {
	const result: ReturnType<typeof processUpdateQueue<S>> = {
		memoizedState: baseState
	};
	if (pendingUpdate != null) {
		const action = pendingUpdate.action;
		if (action instanceof Function) {
			result.memoizedState = action(baseState);
		} else {
			result.memoizedState = action;
		}
	}
	return result;
};
