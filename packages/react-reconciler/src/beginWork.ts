import {
	HostRoot,
	HostComponent,
	HostText,
	FunctionComponent,
	Fragment,
} from './workTags';
import { FiberNode } from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { ReactElementType } from 'shared/ReactTypes';
import { mountChildFibers, reconcileChildFibers } from './childFibers';
import { renderWithHooks } from './fiberHooks';

// 递归中的递  比较， 返回子fiberNode
export function beginWork(fiber: FiberNode) {
	const wip = fiber;
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip);
		case Fragment:
			return updateFragmentComponent(wip);
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的fiber类型', fiber);
			}
			break;
	}
	return null;
}

function updateFragmentComponent(wip: FiberNode) {
	const nextChild = wip.pendingProps;
	reconcileChildren(wip, nextChild);
	return wip.child;
}

function updateFunctionComponent(wip: FiberNode) {
	const nextChild = renderWithHooks(wip);
	reconcileChildren(wip, nextChild);
	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const pendingProps = wip.pendingProps;
	const nextChild = pendingProps.children;
	reconcileChildren(wip, nextChild);
	return wip.child;
}

function updateHostRoot(wip: FiberNode) {
	const baseState = wip.memorizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<typeof baseState>;
	const pending = updateQueue.shared.pending;
	const { memorizedState } = processUpdateQueue(baseState, pending);
	wip.memorizedState = memorizedState;
	const nextChild = wip.memorizedState;
	reconcileChildren(wip, nextChild);
	return wip.child;
}

function reconcileChildren(wip: FiberNode, children: ReactElementType) {
	// Implement
	const current = wip.alternate;
	if (current == null) {
		wip.child = mountChildFibers(wip, null, children);
	} else {
		wip.child = reconcileChildFibers(wip, current?.child, children);
	}
}
