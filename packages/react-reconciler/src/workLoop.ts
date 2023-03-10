import {
	getHighestPriorityLanes,
	Lane,
	mergeLanes,
	NoLane,
	SyncLane,
} from './fiberLanes';
import { HostRoot } from './workTags';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { createWorkInProcess, FiberNode, FiberRootNode } from './fiber';
import { MutationMask } from './fiberFlags';
import { commitMutationEffects } from './commitWork';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { scheduleMicroTask } from 'hostConfig';

let workInProcess: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFromFiberToRoot(fiber);
	if (root === null) return;
	markRootUpdateLane(root, lane);
	ensureRootIsScheduled(root);
	// renderRoot(root);
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLanes(root.pendingLanes);
	if (updateLane === NoLane) return;

	if (updateLane === SyncLane) {
		// 同步优先级， 用微任务调度
		if (__DEV__) {
			console.info('在微任务调度中，优先级：', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// 其他优先级， 用宏任务调度
	}
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

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLanes(root.pendingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}

	if (__DEV__) {
		console.warn(performSyncWorkOnRoot.name, root);
	}

	prepareFreshStack(root, lane);

	while (true) {
		try {
			workLoop();
			break;
		} catch (error) {
			workInProcess = null;
			if (__DEV__) {
				console.log('workLoop error', error);
			}
		}
	}

	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	root.finishedLanes = lane;
	wipRootRenderLane = NoLane;

	commitWork(root);
}

function commitWork(root: FiberRootNode) {
	// Implement
	const finishedWork = root.finishedWork;
	if (!finishedWork) return;
	if (__DEV__) {
		console.warn('---commit begin---', finishedWork);
	}
	// 重置
	const lane = root.finishedLanes;
	root.finishedWork = null;
	root.finishedLanes = NoLane;
	root.pendingLanes ^= lane;

	const subTreeHasEffect = finishedWork.subTreeFlags & MutationMask;
	const rootHasEffect = finishedWork.flags & MutationMask;

	if (rootHasEffect || subTreeHasEffect) {
		// beforeMutation
		// mutation
		// layout
		commitMutationEffects(finishedWork);
		root.current = finishedWork;
	} else {
		root.current = finishedWork;
	}
}

function workLoop() {
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
	workInProcess = createWorkInProcess(root.current, {});
	wipRootRenderLane = lane;
}
