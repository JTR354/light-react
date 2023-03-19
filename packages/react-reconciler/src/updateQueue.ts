import { render } from 'react-dom';
import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { isSubsetOfLanes, Lane, NoLane } from './fiberLanes';

export interface Update<State> {
	action: Action<State>;
	lane: Lane;
	next: Update<any> | null;
}
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return {
		action,
		lane,
		next: null,
	};
};

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
	return {
		shared: {
			pending: null,
		},
		dispatch: null,
	};
};

export const enqueueUpdateQueue = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		update.next = update;
	} else {
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): {
	memorizedState: State;
	baseState: State;
	baseQueue: Update<State> | null;
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memorizedState: baseState,
		baseState,
		baseQueue: null,
	};
	// 第一个update

	if (pendingUpdate !== null) {
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;

		let newBaseState = baseState;
		let newBaseQueueFirst: Update<State> | null = null;
		let newBaseQueueLast: Update<State> | null = null;
		let newState = baseState;

		do {
			const updateLane = pending.lane;
			if (!isSubsetOfLanes(renderLane, updateLane)) {
				// 优先级不够，跳过
				const clone = createUpdate(pending.action, pending.lane);
				if (newBaseQueueFirst === null) {
					newBaseQueueFirst = clone;
					newBaseQueueLast = clone;
					newBaseState = newState;
				} else {
					(newBaseQueueLast as Update<State>).next = clone;
					newBaseQueueLast = clone;
				}
			} else {
				// 优先级足够
				if (newBaseQueueLast !== null) {
					const clone = createUpdate(pending.action, NoLane);
					newBaseQueueLast.next = clone;
					newBaseQueueLast = clone;
				}
				const action = pending?.action;
				if (action instanceof Function) {
					newState = action(baseState);
				} else {
					newState = action;
				}
			}
			// if (pending === null) break;
			// if (pending.lane === renderLane) {
			// } else {
			// 	if (__DEV__) {
			// 		console.error(processUpdateQueue.name, pending.lane, renderLane);
			// 	}
			// }
			pending = pending.next as Update<any>;
		} while (pending !== first);
		if (newBaseQueueLast === null) {
			// 本次计算update没有被跳过
			newBaseState = newState;
		} else {
			//
			newBaseQueueLast.next = newBaseQueueFirst;
		}
		result.memorizedState = newState;
		result.baseState = baseState;
		result.baseQueue = newBaseQueueLast;
	}
	// result.memorizedState = baseState;
	return result;
};
