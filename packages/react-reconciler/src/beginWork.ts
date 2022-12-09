import { HostRoot, HostComponent, HostText } from './workTags';
import { FiberNode } from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { ReactElementType } from 'shared/ReactTypes';

import { mountChildFiber, reconcileChildFiber } from './childFiber';

export const beginWork = (wip: FiberNode) => {
	// todo
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		default:
			if (__DEV__) {
				console.warn('未实现的类型', wip);
			}
	}

	return null;
};

const updateHostRoot = (wip: FiberNode) => {
	const baseState = wip.memorizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const { memorizedState } = processUpdateQueue(baseState, pending);
	wip.memorizedState = memorizedState;
	const nextChild = wip.memorizedState;
	reconcileChildren(wip, nextChild);

	return wip.child;
};

const reconcileChildren = (wip: FiberNode, children?: ReactElementType) => {
	const current = wip.alternate;
	if (current) {
		wip.child = reconcileChildFiber(wip, current.child, children);
	} else {
		wip.child = mountChildFiber(wip, null, children);
	}
};

const updateHostComponent = (wip: FiberNode) => {
	const nextChild = wip.pendingProps.children;
	reconcileChildren(wip, nextChild);
	return wip.child;
};
