import { HostText } from './workTags';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { ReactElementType } from 'shared/ReactTypes';
import { createFiberFromElement, FiberNode } from './fiber';
import { Placement } from './fiberFlags';

function ChildFibers(shouldTrackEffects: boolean) {
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType
	) {
		// Implement
		const fiber = createFiberFromElement(newChild);
		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: number | string
	) {
		// Implement
		const fiber = new FiberNode(HostText, { content: newChild }, null);
		fiber.return = returnFiber;
		return fiber;
	}
	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}
	return function reconcileChildren(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType
	) {
		if (newChild == null) {
			return null;
		}
		if (newChild && typeof newChild === 'object') {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('reconcileChildren object 类型未定义', newChild);
					}
					return null;
			}
		}
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, null, newChild)
			);
		}

		if (__DEV__) {
			console.warn('reconcileChildren 类型未定义', newChild);
		}
		return null;
	};
}

export const mountChildFibers = ChildFibers(false);
export const reconcileChildFibers = ChildFibers(true);
