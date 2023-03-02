import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { Key, Props, ReactElementType, Ref, Type } from 'shared/ReactTypes';

export const ReactElement = (
	type: Type,
	key: Key = null,
	ref: Ref = null,
	props: Props = {}
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
	const {
		props,
		key,
		ref
	}: { props: { [key: string]: any }; key: any; ref: any } =
		resolveConfig(config);

	if (Array.isArray(maybeChildren)) {
		const childrenLength = maybeChildren?.length;
		if (childrenLength === 1) {
			props.children = maybeChildren[0];
		} else if (childrenLength > 1) {
			props.children = maybeChildren;
		}
	}
	return ReactElement(type, key, ref, props);
};

export const jsxDEV = (type: Type, config: any) => {
	const {
		props,
		key,
		ref
	}: { props: { [key: string]: any }; key: any; ref: any } =
		resolveConfig(config);

	return ReactElement(type, key, ref, props);
};

function resolveConfig(config: any) {
	let key, ref;
	const props: { [key: string]: any } = {};

	for (const prop in config) {
		const val = config[prop];
		if (prop === 'key') {
			if (val !== undefined) {
				key = String(val);
			}
			continue;
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = val;
		}
	}
	return { props, key, ref };
}

export function isValidElement(object: any) {
	return (
		object !== null &&
		typeof object === 'object' &&
		(object as ReactElementType).$$typeof === REACT_ELEMENT_TYPE
	);
}
