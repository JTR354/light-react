import { NoFlags } from './fiberFlags';
import {
	Instance,
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import { HostRoot, HostComponent, HostText } from './workTags';
export const completeWork = (wip: FiberNode) => {
	// todo
	const current = wip.alternate;
	const newProps = wip.pendingProps;
	switch (wip.tag) {
		case HostRoot:
			bubbleProperties(wip);
			return null;
		case HostComponent:
			if (current !== null && wip.alternate) {
				// update
			} else {
				const instance = createInstance(wip.type, newProps);
				appendAllChildren(instance, wip);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return;
		case HostText:
			if (current !== null && wip.alternate) {
				// update
			} else {
				const instance = createTextInstance(newProps.content);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return;
		default:
			break;
	}

	if (__DEV__) {
		console.warn('completeWork 未实现的类型', wip);
	}
};

const appendAllChildren = (parent: Instance, wip: FiberNode) => {
	let node: FiberNode | null = wip.child;

	while (node) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node.stateNode);
		} else if (node.child) {
			node.child.return = node;
			node = node.child;
		}
		if (node === wip) {
			return;
		}
		while (node.sibling === null) {
			if (node.return === wip || node.return === null) {
				return;
			}
			node = node?.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
};

const bubbleProperties = (wip: FiberNode) => {
	let subtreeFlags = NoFlags;
	let child = wip.child;
	while (child) {
		subtreeFlags |= child.subtreeFlags;
		subtreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}
	wip.subtreeFlags = subtreeFlags;
};
