import { ReactElementType } from 'shared/ReactTypes';
import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';
import {
	createUpdateQueue,
	createUpdate,
	enqueueUpdate,
	UpdateQueue
} from './updateQueue';
import { scheduleUpdateOnFiber } from './workLoop';

export const createContainer = (container: Container) => {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
};

export const updateContainer = (
	root: FiberRootNode,
	element: ReactElementType
) => {
	const update = createUpdate(element);
	const hostRootFiber = root.current;
	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElementType>,
		update
	);
	scheduleUpdateOnFiber(hostRootFiber);
	return element;
};
