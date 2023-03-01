import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import internals from 'shared/internals';
import { Action } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue
} from './updateQueue';
import { scheduleUpdateOnFiber } from './workLoop';

let currentlyRendingFiber: FiberNode | null = null;
let workInProcessHook: Hook | null = null;

interface Hook {
	memorizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}
const { currentDispatcher } = internals;
export function renderWithHooks(wip: FiberNode) {
	currentlyRendingFiber = wip;
	// 重置
	workInProcessHook = null;
	const current = wip.alternate;
	if (current === null) {
		// mount
		currentDispatcher.current = HooksDispatchOnMount;
	} else {
		// update
	}

	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);

	// 重置
	currentlyRendingFiber = null;
	return children;
}

const HooksDispatchOnMount: Dispatcher = {
	useState: mountState
};

function mountState<State>(
	initialState: State | (() => State)
): [State, Dispatch<State>] {
	const hook = mountWorkInProcess();
	let memorizedState;
	if (initialState instanceof Function) {
		memorizedState = initialState();
	} else {
		memorizedState = initialState;
	}
	hook.memorizedState = memorizedState;

	const updateQueue = createUpdateQueue<State>();
	hook.updateQueue = updateQueue;
	// @ts-ignore
	const dispatch = dispatchSetState.bind(
		null,
		currentlyRendingFiber,
		updateQueue
	);

	updateQueue.dispatch = dispatch;
	return [memorizedState, dispatch];
}

function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const update = createUpdate(action);
	enqueueUpdate(updateQueue, update);
	scheduleUpdateOnFiber(fiber);
}

function mountWorkInProcess(): Hook {
	const hook: Hook = {
		next: null,
		memorizedState: null,
		updateQueue: null
	};
	if (workInProcessHook === null) {
		if (currentlyRendingFiber === null) {
			throw new Error('请在函数组件中使用hook');
		} else {
			workInProcessHook = hook;
			currentlyRendingFiber.memorizedState = workInProcessHook;
		}
	} else {
		workInProcessHook.next = hook;
		workInProcessHook = hook;
	}
	return workInProcessHook;
}
