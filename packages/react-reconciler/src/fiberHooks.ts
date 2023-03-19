import internals from 'shared/internals';
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { Flags, PassiveEffect } from './fiberFlags';
import { requestUpdateLane, NoLane, Lane } from './fiberLanes';
import { HookHasEffect, Passive } from './hookEffectTags';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdateQueue,
	processUpdateQueue,
	Update,
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
	baseState: any;
	baseQueue: Update<any> | null;
}
const { currentDispatcher } = internals;
export function renderWithHooks(wip: FiberNode, lane: Lane) {
	currentlyRendingFiber = wip;
	renderLane = lane;
	// 重置 hook 链表
	wip.memorizedState = null;
	// 重置 effect 链表
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
	useEffect: mountEffect,
};

const HooksDispatchOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
};

type EffectCallback = () => void;
type EffectDeps = any[] | null;
export interface Effect {
	tag: Flags;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = mountWorkInProcess();
	const nextDeps = deps === undefined ? null : deps;
	(currentlyRendingFiber as FiberNode).flags |= PassiveEffect;

	hook.memorizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
}

function pushEffect(
	hookTag: Flags,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag: hookTag,
		create,
		destroy,
		deps,
		next: null,
	};
	const fiber = currentlyRendingFiber as FiberNode;
	let updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue === null) {
		updateQueue = createFCUpdateQueue();
		effect.next = effect;
		updateQueue.lastEffect = effect;
		fiber.updateQueue = updateQueue;
	} else {
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
}

function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = updateWorkInProcess();
	const nextDeps = deps === undefined ? null : deps;
	if (currentHook === null) return;
	const prevEffect = hook.memorizedState as Effect;
	const destroy: EffectCallback | void = prevEffect.destroy;
	if (nextDeps !== null) {
		// 浅比较
		const prevDeps = prevEffect.deps;
		if (areHookInputsEqual(nextDeps, prevDeps)) {
			hook.memorizedState = pushEffect(Passive, create, destroy, nextDeps);
			return;
		}
	}

	(currentlyRendingFiber as FiberNode).flags |= PassiveEffect;
	hook.memorizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		destroy,
		nextDeps
	);
}

function areHookInputsEqual(d1: EffectDeps, d2: EffectDeps) {
	if (d1 === null || d2 === null) {
		return false;
	}
	for (let i = 0; i < d1.length || i < d2.length; i++) {
		if (Object.is(d1[i], d2[i])) {
			continue;
		}
		return false;
	}
	return true;
}

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updateWorkInProcess();
	const baseState = hook.baseState;
	const updateQueue = hook.updateQueue as UpdateQueue<State>;
	const pending = updateQueue.shared.pending;
	const current = currentHook as Hook;
	let baseQueue = current.baseQueue;
	// updateQueue.shared.pending = null;
	if (pending !== null) {
		// const { memorizedState } = processUpdateQueue(
		// 	hook.memorizedState,
		// 	pending,
		// 	renderLane
		// );
		// hook.memorizedState = memorizedState;
		if (baseQueue !== null) {
			//
			const baseFirst = baseQueue.next;
			const pendingFirst = pending.next;
			baseQueue.next = pendingFirst;
			pending.next = baseFirst;
		}
		baseQueue = pending;
		current.baseQueue = pending;
		updateQueue.shared.pending = null;
		if (baseQueue !== null) {
			//
			const {
				memorizedState,
				baseState: newBaseState,
				baseQueue: newBaseQueue,
			} = processUpdateQueue(baseState, baseQueue, renderLane);
			hook.memorizedState = memorizedState;
			hook.baseState = newBaseState;
			hook.baseQueue = newBaseQueue;
		}
	}
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
		baseState: currentHook.baseState,
		baseQueue: currentHook.baseQueue,
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
		baseQueue: null,
		baseState: null,
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
