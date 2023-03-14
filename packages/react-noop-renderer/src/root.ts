import { Container, Instance } from './hostConfig';
import {
	createContainer,
	updateContainer,
} from 'react-reconciler/src/fiberReconciler';
import { ReactElementType } from 'shared/ReactTypes';
import Scheduler from 'scheduler';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';

let idCounter = 0;
export function createRoot() {
	const container: Container = {
		rootID: idCounter++,
		children: [],
	};
	// @ts-ignore
	const root = createContainer(container);
	function render(element: ReactElementType) {
		updateContainer(element, root);
		return element;
	}
	function getChildren() {
		return container.children;
	}
	function getChildrenAsJSX() {
		const children = childToJSX(getChildren());
		if (Array.isArray(children)) {
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: REACT_FRAGMENT_TYPE,
				key: null,
				ref: null,
				props: { children },
			};
		}
		return children;
	}
	function childToJSX(child: any): any {
		if (typeof child === 'number' || typeof child === 'string') {
			return child;
		}
		if (Array.isArray(child)) {
			if (child.length === 0) return null;
			if (child.length === 1) return childToJSX(child[0]);
			const children = child.map(childToJSX);
			if (
				children.every((it) => typeof it === 'number' || typeof it === 'string')
			) {
				return children.join('');
			}
			return children;
		}
		if (Array.isArray(child.children)) {
			const instance: Instance = child;
			const children = childToJSX(instance.children);
			const props = instance.props;
			if (children !== null) {
				props.children = children;
			}

			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: instance.type,
				key: null,
				ref: null,
				props,
				__mark: 'Leo',
			};
		}
		return child.text;
	}
	return {
		_Scheduler: Scheduler,
		render,
		getChildren,
		getChildrenAsJSX,
	};
}
