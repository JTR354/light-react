import {
	getHighestPriorityLanes,
	Lane,
	lanesToSchedulePriority,
	mergeLanes,
	NoLane,
	NoLanes,
	SyncLane,
} from './fiberLanes';
import { HostRoot } from './workTags';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import {
	createWorkInProcess,
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects,
} from './fiber';
import { MutationMask, PassiveMask } from './fiberFlags';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects,
} from './commitWork';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { scheduleMicroTask } from 'hostConfig';
import {
	unstable_cancelCallback,
	unstable_NormalPriority,
	unstable_scheduleCallback,
	unstable_shouldYield,
} from 'scheduler';
import { Passive, HookHasEffect } from './hookEffectTags';

let workInProcess: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffect = false;

type RootExistStatus = number;
const RootInComplete = 1;
const RootCompleted = 2;

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFromFiberToRoot(fiber);
	if (root === null) return;
	markRootUpdateLane(root, lane);
	ensureRootIsScheduled(root);
	// renderRoot(root);
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLanes(root.pendingLanes);
	const existingCallback = root.callbackNode;
	if (updateLane === NoLane) {
		if (existingCallback !== null) {
			unstable_cancelCallback(existingCallback);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const curPriority = updateLane;
	const prevPriority = root.callbackPriority;

	if (curPriority === prevPriority) {
		return;
	}

	if (existingCallback !== null) {
		unstable_cancelCallback(existingCallback);
	}

	let newCallbackNode = null;

	if (updateLane === SyncLane) {
		// 同步优先级， 用微任务调度
		if (__DEV__) {
			console.info('在微任务调度中，优先级：', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// 其他优先级， 用宏任务调度
		const schedulePriority = lanesToSchedulePriority(updateLane);
		newCallbackNode = unstable_scheduleCallback(
			schedulePriority,
			// @ts-ignore
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}
	root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
}

function markRootUpdateLane(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
	let node = fiber,
		parent = fiber.return;

	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	if (__DEV__) {
		console.warn('markUpdateFromFiberToRoot 未找到root fiber', fiber);
	}
	return null;
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	// 保证useEffect的回调执行
	const curCallback = root.callbackNode;
	const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects);
	if (didFlushPassiveEffect) {
		if (curCallback !== root.callbackNode) {
			// 高优先级打断
			return;
		}
	}

	const lane = getHighestPriorityLanes(root.pendingLanes);
	if (lane === NoLane) return;
	const curCallbackNode = root.callbackNode;

	const needSync = lane === SyncLane || didTimeout;

	// render阶段
	const existStatus = renderRoot(root, lane, !needSync);

	ensureRootIsScheduled(root);

	if (existStatus === RootInComplete) {
		// 中断
		if (root.callbackNode !== curCallbackNode) return;
		return performConcurrentWorkOnRoot.bind(null, root);
	}
	if (existStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = lane;
		wipRootRenderLane = NoLane;
		commitRoot(root);
	} else if (__DEV__) {
		console.warn('还未实现并发更新的结束状态');
	}
}

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLanes(root.pendingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}

	if (__DEV__) {
		console.warn(performSyncWorkOnRoot.name, root);
	}

	const existStatus = renderRoot(root, nextLane, false);

	if (existStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = lane;
		wipRootRenderLane = NoLane;

		commitRoot(root);
	} else if (__DEV__) {
		console.warn('还未实现同步更新结束状态');
	}
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
	if (__DEV__) {
		console.warn(`开始${shouldTimeSlice ? '并发' : '同步'}更新`);
	}
	if (wipRootRenderLane !== lane) {
		prepareFreshStack(root, lane);
	}

	do {
		try {
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (error) {
			workInProcess = null;
			if (__DEV__) {
				console.log('workLoop error', error);
			}
		}
	} while (true);

	// 中断执行
	if (shouldTimeSlice && workInProcess !== null) {
		return RootInComplete;
	}
	// render阶段
	if (!shouldTimeSlice && workInProcess !== null && __DEV__) {
		console.error('render结束wip应该为null', workInProcess);
	}
	// TODO 报错
	return RootCompleted;
}

function commitRoot(root: FiberRootNode) {
	// Implement
	const finishedWork = root.finishedWork;
	if (!finishedWork) return;
	if (__DEV__) {
		console.warn('---commit begin---', finishedWork);
	}
	// 重置
	const lane = root.finishedLane;
	root.finishedWork = null;
	root.finishedLane = NoLane;
	root.pendingLanes ^= lane;

	if (
		finishedWork.flags & PassiveMask ||
		finishedWork.subTreeFlags & PassiveMask
	) {
		if (!rootDoesHasPassiveEffect) {
			rootDoesHasPassiveEffect = true;
			// 调度副作用
			unstable_scheduleCallback(unstable_NormalPriority, () => {
				// 执行副作用
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}

	const subTreeHasEffect = finishedWork.subTreeFlags & MutationMask;
	const rootHasEffect = finishedWork.flags & MutationMask;

	if (rootHasEffect || subTreeHasEffect) {
		// beforeMutation
		// mutation
		// layout
		commitMutationEffects(finishedWork, root);
		root.current = finishedWork;
	} else {
		root.current = finishedWork;
	}

	rootDoesHasPassiveEffect = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffect: PendingPassiveEffects) {
	const { update, unmount } = pendingPassiveEffect;
	let didFlushPassiveEffect = false;
	unmount.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffect.unmount = [];

	update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffect.update = [];

	flushSyncCallbacks();

	return didFlushPassiveEffect;
}

function workLoopConcurrent() {
	while (workInProcess !== null && !unstable_shouldYield()) {
		performanceUnitOfWork(workInProcess);
	}
}
function workLoopSync() {
	while (workInProcess !== null) {
		performanceUnitOfWork(workInProcess);
	}
}

function performanceUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane);
	fiber.memorizedProps = fiber.pendingProps;
	if (next !== null) {
		workInProcess = next;
		return;
	}
	completeUnitOfWork(fiber);
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;
	do {
		completeWork(node);
		const sibling = node.sibling;
		if (sibling !== null) {
			workInProcess = sibling;
			return;
		}
		node = node.return;
		workInProcess = node;
	} while (node !== null);
}

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane;
	root.finishedWork = null;
	workInProcess = createWorkInProcess(root.current, {});
	wipRootRenderLane = lane;
}
