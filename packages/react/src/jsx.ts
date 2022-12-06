import { Type, Key, Ref, Props, ReactElementType } from 'shared/ReactTypes';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';

export const ReactElement = (
	type: Type,
	key: Key,
	ref: Ref,
	props: Props
): ReactElementType => {
	const element: ReactElementType = {
		$$typeof: REACT_ELEMENT_TYPE,
		type,
		key,
		ref,
		props,
		__mark: 'leo'
	};
	return element;
};

export const jsx = (
	type: Type,
	config: any,
	...maybeChildren: any
): ReactElementType => {
	let key: Key, ref: Ref;
	const props: Props = {};
	for (const prop in config) {
		const value = config[prop];
		if (prop === 'key') {
			if (value !== undefined) {
				key = '' + value;
			}
			continue;
		}
		if (prop === 'ref') {
			if (value !== undefined) {
				ref = value;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = value;
		}
	}
	const childrenLength = maybeChildren.length;
	if (childrenLength === 1) {
		props.children = maybeChildren[0];
	} else if (childrenLength) {
		props.children = maybeChildren;
	}
	return ReactElement(type, key, ref, props);
};

export const jsxDEV = (
	type: Type,
	config: any
	// ...maybeChildren: any
): ReactElementType => {
	let key: Key, ref: Ref;
	const props: Props = {};
	for (const prop in config) {
		const value = config[prop];
		if (prop === 'key') {
			if (value !== undefined) {
				key = '' + value;
			}
			continue;
		}
		if (prop === 'ref') {
			if (value !== undefined) {
				ref = value;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = value;
		}
	}
	// const childrenLength = maybeChildren.length;
	// if (childrenLength === 1) {
	// 	props.children = maybeChildren[0];
	// } else if (childrenLength) {
	// 	props.children = maybeChildren;
	// }
	return ReactElement(type, key, ref, props);
};
