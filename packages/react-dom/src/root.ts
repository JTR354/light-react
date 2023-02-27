import { Container } from 'hostConfig';
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';
import { ReactElementType } from 'shared/ReactTypes';

export function createRoot(container: Container) {
	const root = createContainer(container);
	function render(element: ReactElementType) {
		updateContainer(element, root);
		return container;
	}
	return {
		render
	};
}
