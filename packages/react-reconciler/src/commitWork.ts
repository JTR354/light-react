import { HostRoot, HostComponent, HostText } from './workTags';
import { FiberNode, FiberRootNode } from './fiber';
import { MutationMask, Placement } from './fiberFlags';
import { Instance, appendChildToContainer } from 'hostConfig';

let nextEffect: FiberNode | null = null;
export const commitMutationEffects = (fiber: FiberNode) => {
	nextEffect = fiber;
	while (nextEffect) {
		if (nextEffect.child && nextEffect.subtreeFlags & MutationMask) {
			nextEffect = nextEffect.child;
		} else {
			up: while (nextEffect) {
				commitMutationEffectOnFiber(nextEffect);
				if (nextEffect.sibling) {
					nextEffect = nextEffect.sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
};

const commitMutationEffectOnFiber = (fiber: FiberNode) => {
	const flags = fiber.flags;
	if (flags & Placement) {
		fiber.flags ^= Placement;
		commitPlacement(fiber);
	}
};

const commitPlacement = (finishedWork: FiberNode) => {
	if (__DEV__) {
		console.warn('执行Placement操作', finishedWork);
	}
	const hostParent = getHostParent(finishedWork);
	if (hostParent) {
		appendPlacementIntoContainer(hostParent, finishedWork);
	}
};

const getHostParent = (finishedWork: FiberNode) => {
	let parent = finishedWork.return;
	while (parent) {
		if (parent.tag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		if (parent.tag === HostComponent) {
			return parent.stateNode;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('getHostParent 为找到hostParent', finishedWork);
	}
	return null;
};

const appendPlacementIntoContainer = (
	hostParent: Instance,
	fiber: FiberNode
) => {
	if (fiber.tag === HostComponent || fiber.tag === HostText) {
		appendChildToContainer(hostParent, fiber.stateNode);
		return;
	}
	const child = fiber.sibling;
	if (child) {
		appendChildToContainer(hostParent, child.stateNode);
		let sibling = child.sibling;
		while (sibling) {
			appendChildToContainer(hostParent, sibling.stateNode);
			sibling = sibling.sibling;
		}
	}
};
