export type Container = Element;
export type Instance = Element;

export const appendInitialChild = (
	parent: Container | Instance,
	child: Instance
) => {
	parent.appendChild(child);
};

export const createInstance = (type: string, props?: any) => {
	const element = document.createElement(type);
	return element;
};

export const createTextInstance = (content: string) => {
	const textNode = document.createTextNode(content);
	return textNode;
};

export const appendChildToContainer = appendInitialChild;
