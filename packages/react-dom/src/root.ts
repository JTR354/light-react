import { Container } from 'hostConfig';
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';
import { ReactElementType } from 'shared/ReactTypes';
import { initEvent } from './SyntheticEvent';

export function createRoot(container: Container) {
	const root = createContainer(container);
	function render(element: ReactElementType) {
		initEvent(container, 'click');
		updateContainer(element, root);
		return element;
	}
	return {
		render
	};
}
