import { HostRoot } from './workTags';
import { FiberNode, FiberRootNode } from './fiber';
import { Container } from 'hostConfig';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdateQueue,
	UpdateQueue,
} from './updateQueue';
import { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { requestUpdateLane } from './fiberLanes';
import {
	unstable_ImmediatePriority,
	unstable_runWithPriority,
} from 'scheduler';

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}
export function updateContainer(
	element: ReactElementType,
	root: FiberRootNode
) {
	unstable_runWithPriority(unstable_ImmediatePriority, () => {
		const lane = requestUpdateLane();
		const hostRootFiber = root.current;
		const update = createUpdate(element, lane);
		const updateQueue = hostRootFiber.updateQueue as UpdateQueue<
			typeof element
		>;
		enqueueUpdateQueue(updateQueue, update);

		scheduleUpdateOnFiber(hostRootFiber, lane);
	});
	return element;
}
