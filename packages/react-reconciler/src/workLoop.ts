import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { FiberNode } from './fiber';

let workInProcess: FiberNode | null = null;

export function renderRoot(root: FiberNode) {
	prepareFreshStack(root);

	while (true) {
		try {
			workLoop();
			break;
		} catch (error) {
			workInProcess = null;
			console.log('workLoop error', error);
		}
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

function prepareFreshStack(fiber: FiberNode) {
	// Implement
	workInProcess = fiber;
}
