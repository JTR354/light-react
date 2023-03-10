import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import internals from 'shared/internals';
import { Action } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { requestUpdateLane, NoLane, Lane } from './fiberLanes';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdateQueue,
	processUpdateQueue,
	UpdateQueue,
} from './updateQueue';
import { scheduleUpdateOnFiber } from './workLoop';

let currentlyRendingFiber: FiberNode | null = null;
let workInProcessHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

interface Hook {
	memorizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}
const { currentDispatcher } = internals;
export function renderWithHooks(wip: FiberNode, lane: Lane) {
	currentlyRendingFiber = wip;
	renderLane = lane;
	// 重置
	wip.memorizedState = null;
	wip.updateQueue = null;

	const current = wip.alternate;
	if (current === null) {
		// mount
		currentDispatcher.current = HooksDispatchOnMount;
	} else {
		// update
		currentDispatcher.current = HooksDispatchOnUpdate;
	}

	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);

	// 重置
	currentlyRendingFiber = null;
	workInProcessHook = null;
	currentHook = null;
	lane = NoLane;
	return children;
}

const HooksDispatchOnMount: Dispatcher = {
	useState: mountState,
};

const HooksDispatchOnUpdate: Dispatcher = {
	useState: updateState,
};

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updateWorkInProcess();
	const updateQueue = hook.updateQueue as UpdateQueue<State>;
	const pending = updateQueue.shared.pending;
	if (pending !== null) {
		const { memorizedState } = processUpdateQueue(
			hook.memorizedState,
			pending,
			renderLane
		);
		hook.memorizedState = memorizedState;
	}
	updateQueue.shared.pending = null;
	return [hook.memorizedState, updateQueue.dispatch as Dispatch<State>];
}

function updateWorkInProcess(): Hook {
	let nextCurrentHook: Hook | null = null;
	if (currentHook === null) {
		const current = currentlyRendingFiber?.alternate;
		if (current !== null) {
			nextCurrentHook = current?.memorizedState;
		} else {
			nextCurrentHook = null;
		}
	} else {
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook === null) {
		throw new Error('这次hook比上次多');
	}

	currentHook = nextCurrentHook;
	const newHook: Hook = {
		memorizedState: currentHook.memorizedState,
		updateQueue: currentHook.updateQueue,
		next: null,
	};

	if (workInProcessHook === null) {
		if (currentlyRendingFiber === null) {
			throw new Error('请在react组件中使用hook');
		}
		workInProcessHook = newHook;
		currentlyRendingFiber.memorizedState = workInProcessHook;
	} else {
		workInProcessHook.next = newHook;
		workInProcessHook = newHook;
	}

	return workInProcessHook;
}

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
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);
	enqueueUpdateQueue(updateQueue, update);
	scheduleUpdateOnFiber(fiber, lane);
}

function mountWorkInProcess(): Hook {
	const hook: Hook = {
		next: null,
		memorizedState: null,
		updateQueue: null,
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
