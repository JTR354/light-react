import { FiberNode, FiberRootNode, createWorkInProcess } from './fiber';
import { HostRoot } from './workTags';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { MutationMask } from './fiberFlags';
import { commitMutationEffects } from './commitWork';

let workInProcess: FiberNode | null = null;
export const scheduleUpdateOnFiber = (fiber: FiberNode) => {
	// todo
	const root = markUpdateFromFiberToRoot(fiber);
	renderRoot(root);
};

const markUpdateFromFiberToRoot = (fiber: FiberNode) => {
	let node = fiber;
	let parent = node.return;
	while (parent) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
};

const renderRoot = (root: FiberRootNode) => {
	// todo
	prepareFleshStack(root);
	do {
		try {
			workLoop();
			break;
		} catch (e) {
			console.warn('workLoop Error', e);
			workInProcess = null;
		}
	} while (true);

	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	console.log(finishedWork);
	commitRoot(root);
};

const commitRoot = (root: FiberRootNode) => {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}
	if (__DEV__) {
		console.warn('commitRoot', finishedWork);
	}
	root.finishedWork = null;

	// beforeMutation
	// mutation
	const rootHasEffect = finishedWork.flags & MutationMask;
	const subtreeHasEffect = finishedWork.subtreeFlags & MutationMask;
	if (rootHasEffect || subtreeHasEffect) {
		commitMutationEffects(finishedWork);
		root.current = finishedWork;
	} else {
		root.current = finishedWork;
	}
	// layout
};

const prepareFleshStack = (root: FiberRootNode) => {
	workInProcess = createWorkInProcess(root.current, {});
};

const workLoop = () => {
	while (workInProcess) {
		performUnitOfFiber(workInProcess);
	}
};

const performUnitOfFiber = (fiber: FiberNode) => {
	const next = beginWork(fiber);
	fiber.memorizedState = fiber.pendingProps;
	// workInProcess = next;
	if (next) {
		workInProcess = next;
	} else {
		completeUnitOfFiber(fiber);
	}
};

const completeUnitOfFiber = (fiber: FiberNode) => {
	let node: FiberNode | null = fiber;
	do {
		completeWork(node);
		const sibling = node.sibling;
		if (sibling) {
			workInProcess = sibling;
			return;
		}
		node = node.return;
		workInProcess = node;
	} while (node);
};
