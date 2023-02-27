import { HostRoot } from './workTags';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { createWorkInProcess, FiberNode, FiberRootNode } from './fiber';
import { MutationMask } from './fiberFlags';
import { commitMutationEffects } from './commitWork';

let workInProcess: FiberNode | null = null;

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	const root = markUpdateFromFiberToRoot(fiber);
	renderRoot(root);
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber,
		parent = fiber.return;

	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}

function renderRoot(root: FiberRootNode) {
	prepareFreshStack(root);

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
	root.finishedWork = null;

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
	// Implement
	while (workInProcess !== null) {
		performanceUnitOfWork(workInProcess);
	}
}

function performanceUnitOfWork(fiber: FiberNode) {
	// Implement
	const next = beginWork(fiber);
	fiber.memorizedProps = fiber.pendingProps;
	if (next !== null) {
		workInProcess = next;
		return;
	}
	completeUnitOfWork(fiber);
}

function completeUnitOfWork(fiber: FiberNode) {
	// Implement
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

function prepareFreshStack(root: FiberRootNode) {
	// Implement
	workInProcess = createWorkInProcess(root.current, {});
}
