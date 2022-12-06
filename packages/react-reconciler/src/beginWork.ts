import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { HostRoot, HostComponent, HostText } from './workTags';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import { mountChildFibers, reconcileChildFibers } from './childFibers';
// 递归中的递
export const beginWork = (wip: FiberNode) => {
	// 比较返回的fiberNode
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
			break;
	}
	return null;
};

function updateHostRoot(wip: FiberNode) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const { memoizedState } = processUpdateQueue(baseState, pending);
	wip.memoizedState = memoizedState;
	const nextChildren = wip.memoizedState;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
	const current = wip.alternate;
	if (current == null) {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	} else {
		// update
		wip.child = reconcileChildFibers(wip, current?.child, children);
	}
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}
