import { HostComponent, HostRoot, HostText } from './workTags';
import { FiberNode, FiberRootNode } from './fiber';
import { MutationMask, Placement } from './fiberFlags';
import { appendChildToParent, Container } from 'hostConfig';

let nextEffect: FiberNode | null = null;
export function commitMutationEffects(finishedWork: FiberNode) {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		if (nextEffect.subTreeFlags & MutationMask && child) {
			nextEffect = child;
		} else {
			up: while (nextEffect !== null) {
				commitMutationOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
}

function commitMutationOnFiber(finishedWork: FiberNode) {
	const flags = finishedWork.flags;
	if (flags & Placement) {
		commitPlacement(finishedWork);
		finishedWork.flags ^= Placement;
	}
	// Update
	// ChildrenDeletion
}

function commitPlacement(finishedWork: FiberNode) {
	// get parent
	// insert
	if (__DEV__) {
		console.warn('---placement begin---', finishedWork);
	}
	const hostParent = getHostParent(finishedWork);
	if (hostParent) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
}

function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	const tag = finishedWork.tag;
	if (tag === HostComponent || tag === HostText) {
		appendChildToParent(hostParent, finishedWork.stateNode);
		return;
	} else {
		const child = finishedWork.child;
		if (child) {
			appendPlacementNodeIntoContainer(child, hostParent);
			let sibling = child.sibling;
			while (sibling) {
				appendPlacementNodeIntoContainer(sibling, hostParent);
				sibling = sibling.sibling;
			}
		}
	}
}

function getHostParent(fiber: FiberNode) {
	let parent = fiber.return;
	while (parent) {
		const parentTag = parent.tag;
		if (parentTag === HostComponent) {
			return parent.stateNode;
		} else if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}
	console.warn('未找到hostParent', fiber);
}
