import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';
import { FiberNode, FiberRootNode } from './fiber';
import { ChildDeletion, MutationMask, Placement, Update } from './fiberFlags';
import {
	appendChildToParent,
	commitUpdate,
	Container,
	removeChild
} from 'hostConfig';

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
	if (flags & Update) {
		commitUpdate(finishedWork);
		finishedWork.flags ^= Update;
	}
	// ChildrenDeletion
	if (flags & ChildDeletion) {
		commitDeletion(finishedWork);
		finishedWork.flags ^= ChildDeletion;
	}
}

function commitDeletion(finishedWork: FiberNode) {
	const { deletions } = finishedWork;
	if (deletions === null) return;
	if (__DEV__) {
		console.warn('---ChildrenDeletion begin---', finishedWork);
	}
	deletions.forEach((childToDeletion: FiberNode) => {
		let rootHostNode: FiberNode | null = null;
		commitNestedComponent(childToDeletion, (unmountFiber) => {
			// todo
			switch (unmountFiber.tag) {
				case HostComponent:
					if (rootHostNode === null) {
						rootHostNode = unmountFiber;
					}
					// todo 解绑ref
					break;

				case HostText:
					if (rootHostNode === null) {
						rootHostNode = unmountFiber;
					}
					break;
				case FunctionComponent:
					// useEffect unmount 解绑ref
					break;
				default:
					if (__DEV__) {
						console.warn(
							commitNestedComponent.name + '未实现的类型',
							unmountFiber
						);
					}
					break;
			}
		});
		if (rootHostNode !== null) {
			const hostParent = getHostParent(childToDeletion);
			if (hostParent !== null) {
				removeChild(hostParent, (rootHostNode as FiberNode).stateNode);
			}
		}
		childToDeletion.child = null;
		childToDeletion.return = null;
	});
}

function commitNestedComponent(
	root: FiberNode,
	onUnmount: (fiber: FiberNode) => void
) {
	let node = root;
	while (true) {
		onUnmount(node);
		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		if (node === root) return;
		while (node.sibling === null) {
			if (node.return === null || node.return === root) return;
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
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

function getHostParent(fiber: FiberNode): Container | null {
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
	return null;
}
