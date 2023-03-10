import { FiberNode } from 'react-reconciler/src/fiber';
import { HostText } from 'react-reconciler/src/workTags';
import { Props } from 'shared/ReactTypes';
import { DOMElement, updateFiberProps } from './SyntheticEvent';

export type Container = Element;
export type Instance = Element;
export type InstanceText = Text;

export { updateFiberProps };
export function createInstance(type: string, props: Props) {
	const element = document.createElement(type) as unknown;
	updateFiberProps(element as DOMElement, props);
	return element as DOMElement;
}
export function createTextInstance(content: string) {
	return document.createTextNode(content);
}
export function appendInitialChild(parent: Container, instance: Instance) {
	parent.appendChild(instance);
}
export function insertChildToContainer(
	parent: Container,
	child: Instance,
	before: Instance
) {
	parent.insertBefore(child, before);
	// parent.insertBefore(before, child);
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
	textNode.textContent = content;
}

export function removeChild(
	parent: Container,
	child: Instance | InstanceText | null
) {
	if (child !== null) {
		parent.removeChild(child);
		child = null;
	}
}

export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => any) => Promise.resolve(null).then(callback)
		: window.setTimeout;
