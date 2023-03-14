import { FiberNode } from 'react-reconciler/src/fiber';
import { HostText } from 'react-reconciler/src/workTags';
import { Props } from 'shared/ReactTypes';

export interface Container {
	rootID: number;
	children: (Instance | Instance)[];
}
export interface Instance {
	id: number;
	parent: number;
	type: string;
	props: Props;
	children: (Instance | Instance)[];
}
export interface InstanceText {
	id: number;
	parent: number;
	text: string;
}

let instanceCounter = 1;
export function createInstance(type: string, props: Props) {
	const instance = {
		id: instanceCounter++,
		type: type,
		children: [],
		parent: -1,
		props,
	};
	return instance;
}
export function createTextInstance(content: string) {
	const textInstance = {
		text: content,
		id: instanceCounter++,
		parent: -1,
	};
	return textInstance;
}
export function appendInitialChild(
	parent: Container | Instance,
	child: Instance
) {
	const prevParentId = child.parent;
	const parentId = 'rootID' in parent ? parent.rootID : parent.id;
	if (prevParentId !== -1 && prevParentId !== parentId) {
		throw new Error('不能重复挂载child');
	}
	child.parent = parentId;
	parent.children.push(child);
}
export function insertChildToContainer(
	parent: Container,
	child: Instance,
	before: Instance
) {
	const index = parent.children.indexOf(child);
	if (index !== -1) {
		parent.children.splice(index, 1);
	}

	const beforeIndex = parent.children.indexOf(before);
	if (beforeIndex === -1) {
		throw new Error(`before不存在`);
	}
	parent.children.splice(beforeIndex, 0, child);
}
export const appendChildToParent = appendInitialChild;

export function commitUpdate(fiber: FiberNode) {
	if (__DEV__) {
		console.warn('---Update begin---', fiber);
	}
	switch (fiber.tag) {
		case HostText:
			commitTextUpdate(fiber.stateNode, fiber.memorizedProps.content);
			break;

		default:
			if (__DEV__) {
				console.warn(commitUpdate.name + '还未实现的类型', fiber);
			}
			break;
	}
}

function commitTextUpdate(textNode: InstanceText, content: string) {
	textNode.text = content;
}

export function removeChild(
	parent: Container,
	child: Instance | InstanceText | null
) {
	if (child !== null) {
		const index = parent.children.indexOf(child as any);
		if (index === -1) {
			throw new Error('child不存在');
		}
		parent.children.splice(index, 1);
		child = null;
	}
}

export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => any) => Promise.resolve(null).then(callback)
		: window.setTimeout;
