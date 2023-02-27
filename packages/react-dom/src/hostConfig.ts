import { Props } from 'shared/ReactTypes';

export type Container = Element;
export type Instance = Element;

export const createInstance = (type: string, props: Props) => {
	console.log(props);
	return document.createElement(type);
};
export const createTextInstance = (content: string) => {
	return document.createTextNode(content);
};
export const appendInitialChild = (parent: Container, instance: Instance) => {
	parent.appendChild(instance);
};
export const appendChildToParent = appendInitialChild;
