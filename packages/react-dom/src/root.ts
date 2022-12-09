import { Container } from 'hostConfig';
import { ReactElementType } from 'shared/ReactTypes';
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';

export const createRoot = (container: Container) => {
	const root = createContainer(container);
	return {
		render(element: ReactElementType) {
			updateContainer(root, element);
		}
	};
};
