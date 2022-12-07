import { Props } from 'shared/ReactTypes';
export type Container = Element;
export type Instance = Element;

export const createInstance = (type: string, props: Props): Instance => {
	const element = document.createElement(type);
	// TODO props
	for (const prop in props) {
		if (prop === 'children' || prop === 'key' || prop === 'ref') {
			continue;
		}
		if (prop === 'style') {
			const style = props[prop];
			if (typeof style === 'string') {
				element.setAttribute(prop, style);
				continue;
			}
			if (typeof style === 'object' && style) {
				let result = '';
				for (const key in style) {
					result += `${key}:${style[key]};`;
				}
				element.setAttribute(prop, result);
				continue;
			}
		}
		element.setAttribute(prop, props[prop]);
	}
	return element;
};

export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	parent.appendChild(child);
};

export const createTextInstance = (content: string) => {
	return document.createTextNode(content);
};

export const appendChildToContainer = appendInitialChild;

// console.log(123);
