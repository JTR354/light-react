import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
} from './workTags';
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber';
import {
	ChildDeletion,
	Flags,
	MutationMask,
	NoFlags,
	PassiveEffect,
	PassiveMask,
	Placement,
	Update,
} from './fiberFlags';
import {
	appendChildToParent,
	commitUpdate,
	Container,
	insertChildToContainer,
	Instance,
	removeChild,
} from 'hostConfig';
import { Effect, FCUpdateQueue } from './fiberHooks';
import { HookHasEffect } from './hookEffectTags';

let nextEffect: FiberNode | null = null;
export function commitMutationEffects(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		if (nextEffect.subTreeFlags & (MutationMask | PassiveMask) && child) {
			nextEffect = child;
		} else {
			up: while (nextEffect !== null) {
				commitMutationOnFiber(nextEffect, root);
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

function commitMutationOnFiber(finishedWork: FiberNode, root: FiberRootNode) {
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
		commitDeletion(finishedWork, root);
		finishedWork.flags ^= ChildDeletion;
	}
	// Passive
	if (flags & PassiveEffect) {
		commitPassiveEffect(finishedWork, root, 'update');
		finishedWork.flags ^= PassiveEffect;
	}
}

function commitPassiveEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	// update mount
	if (fiber.tag !== FunctionComponent) return;
	if (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags) return;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue === null) return;
	if (updateQueue.lastEffect === null && __DEV__) {
		console.error('当FC标记PassiveEffect时，应该存在Effect', fiber);
	}
	root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect);
}

function recordHostChildDeletion(
	deletions: FiberNode[],
	unmountFiber: FiberNode
) {
	// 1. 找到第一个fiber
	// 2. 记录第一个fiber的所有sibling
	const lastOne = deletions[deletions.length - 1];
	if (lastOne == null) {
		deletions.push(unmountFiber);
	} else {
		let node = lastOne.sibling;
		while (node != null) {
			if (node === unmountFiber) {
				deletions.push(unmountFiber);
			}
			node = node.sibling;
		}
	}
}

function commitDeletion(finishedWork: FiberNode, root: FiberRootNode) {
	const { deletions } = finishedWork;
	if (deletions === null) return;
	if (__DEV__) {
		console.warn('---ChildrenDeletion begin---', finishedWork);
	}
	deletions.forEach((childToDeletion: FiberNode) => {
		const rootHostChildren: FiberNode[] = [];
		commitNestedComponent(childToDeletion, (unmountFiber) => {
			// todo
			switch (unmountFiber.tag) {
				case HostComponent:
					recordHostChildDeletion(rootHostChildren, unmountFiber);
					// todo 解绑ref
					break;

				case HostText:
					recordHostChildDeletion(rootHostChildren, unmountFiber);
					break;
				case FunctionComponent:
					// useEffect unmount
					commitPassiveEffect(unmountFiber, root, 'unmount');
					// 解绑ref
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
		if (rootHostChildren.length) {
			const hostParent = getHostParent(childToDeletion);
			if (hostParent !== null) {
				rootHostChildren.forEach((node) => {
					removeChild(hostParent, node.stateNode);
				});
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
	const hostSibling = getHostSibling(finishedWork);
	if (__DEV__) {
		console.log('sibling & placement child', hostSibling, finishedWork);
	}
	if (hostParent) {
		insertOrAppendPlacementNodeIntoContainer(
			finishedWork,
			hostParent,
			hostSibling
		);
	}
}

function getHostSibling(finishedWork: FiberNode): Instance | null {
	let node = finishedWork;
	findSibling: while (true) {
		while (node.sibling === null) {
			const parent = node.return;
			if (
				parent === null ||
				parent.tag === HostComponent ||
				parent.tag === HostRoot
			) {
				return null;
			}
			node = parent;
		}

		node.sibling.return = node.return;
		node = node.sibling;

		while (node.tag !== HostText && node.tag !== HostComponent) {
			if (node.flags & Placement) {
				continue findSibling;
			}
			if (node.child === null) {
				continue findSibling;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}

		if ((node.flags & Placement) === NoFlags) {
			return node.stateNode;
		}
	}
}

function insertOrAppendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
	before: Instance | null
) {
	const tag = finishedWork.tag;
	if (tag === HostComponent || tag === HostText) {
		if (before) {
			insertChildToContainer(hostParent, finishedWork.stateNode, before);
		} else {
			appendChildToParent(hostParent, finishedWork.stateNode);
		}
		return;
	} else {
		const child = finishedWork.child;
		if (child) {
			// TODO add before?
			insertOrAppendPlacementNodeIntoContainer(child, hostParent, before);
			let sibling = child.sibling;
			while (sibling) {
				// TODO add before?
				insertOrAppendPlacementNodeIntoContainer(sibling, hostParent, before);
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

function commitHookEffectList(
	flags: Flags,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	let effect = lastEffect.next as Effect;
	do {
		if ((effect.tag & flags) === flags) {
			callback(effect);
		}
		effect = effect.next as Effect;
	} while (effect !== lastEffect.next);
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect: Effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
		effect.tag ^= HookHasEffect;
	});
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect: Effect) => {
		const create = effect.create;
		if (create instanceof Function) {
			effect.destroy = create();
		}
	});
}

export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect: Effect) => {
		const { destroy } = effect;
		if (destroy instanceof Function) {
			destroy();
		}
	});
}
