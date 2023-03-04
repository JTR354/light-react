import { FiberNode } from 'react-reconciler/src/fiber';
import { HostText } from 'react-reconciler/src/workTags';
import { Props } from 'shared/ReactTypes';
import { DOMElement, updateFiberProps } from './SyntheticEvent';

export type Container = Element;
export type Instance = Element;
export type InstanceText = Text;

export { updateFiberProps };
export const createInstance = (type: string, props: Props) => {
	const element = document.createElement(type) as unknown;
	updateFiberProps(element as DOMElement, props);
	return element as DOMElement;
};
export const createTextInstance = (content: string) => {
	return document.createTextNode(content);
};
export const appendInitialChild = (parent: Container, instance: Instance) => {
	parent.appendChild(instance);
};
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
