import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { Key, Props, ReactElementType, Ref, Type } from 'shared/ReactTypes';

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
		__mark__: 'leo'
	};
	return element;
};

export const jsx = (type: Type, config: any, ...maybeChildren: any[]) => {
	let key, ref;
	const props: { [key: string]: any } = {};

	for (const prop in config) {
		const val = config[prop];
		if (prop === 'key') {
			if (val !== undefined) {
				props[prop] = String(val);
			}
			continue;
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				props[prop] = val;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = val;
		}
	}
	if (Array.isArray(maybeChildren)) {
		const childrenLength = maybeChildren?.length;
		if (childrenLength === 1) {
			props.children = maybeChildren[0];
		} else {
			props.children = maybeChildren;
		}
	}
	return ReactElement(type, key, ref, props);
};

export const jsxDev = jsx;
