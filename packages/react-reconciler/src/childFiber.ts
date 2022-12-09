import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode, createFiberFromElement } from './fiber';
import { Placement } from './fiberFlags';
import { HostText } from './workTags';
export const mountChildFiber = ChildrenReconciler(false);
export const reconcileChildFiber = ChildrenReconciler(true);

function ChildrenReconciler(shouldTrackEffect: boolean) {
	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: number | string
	) {
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}

	function placeSingleElement(fiber: FiberNode) {
		if (shouldTrackEffect && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	return function reconcileChildrenFiber(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		if (newChild && typeof newChild === 'object') {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleElement(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					break;
			}
		}
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleElement(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}
		if (__DEV__) {
			console.warn('未实现的reconcile类型', newChild);
		}
		return null;
	};
}
