import { FiberNode } from './fiber';
import { createTextInstance, appendInitialChild } from './hostConfig';
import { createInstance, Container } from 'hostConfig';
import { HostComponent, HostText, HostRoot } from './workTags';
import { NoFlags } from './fiberFlags';
// 递归中的归
export function completeWork(wip: any): any {
	const newProps = wip.pendingProps;
	const current = wip.alternate;

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// update TODO
			} else {
				const instance = createInstance(wip.type, newProps);
				appendAllChildren(instance, wip);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		case HostText:
			if (current !== null && wip.stateNode) {
				// update
			} else {
				const instance = createTextInstance(newProps.content);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		case HostRoot:
			bubbleProperties(wip);
			return null;
		default:
			if (__DEV__) {
				console.warn('completeWork 未实现的类型', wip);
			}
			break;
	}
	return null;
}

function bubbleProperties(wip: FiberNode) {
	// Implement
	let subTreeFlags = NoFlags;
	let child = wip.child;
	while (child !== null) {
		subTreeFlags |= child.subTreeFlags;
		subTreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}
	wip.subTreeFlags |= subTreeFlags;
}

function appendAllChildren(instance: Container, wip: FiberNode) {
	// Implement
	let node = wip.child;

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(instance, node.stateNode);
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		if (node === wip) return;

		while (node.sibling === null) {
			if (node.return === wip || node.return === null) {
				return;
			}
			node = node?.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}
