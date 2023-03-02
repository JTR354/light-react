import { HostText } from './workTags';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createWorkInProcess,
	createFiberFromElement
} from './fiber';
import { ChildDeletion, Placement } from './fiberFlags';

function ChildFibers(shouldTrackEffects: boolean) {
	function deletionChild(returnFiber: FiberNode, childToDel: FiberNode) {
		if (!shouldTrackEffects) return;
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDel];
			returnFiber.flags |= ChildDeletion;
		} else {
			deletions.push(childToDel);
		}
		returnFiber.deletions = deletions;
	}
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		if (currentFiber !== null) {
			if (
				element.key === currentFiber.key &&
				element.type === currentFiber.type
			) {
				// 复用
				const existing = useFiber(currentFiber, element.props);
				existing.return = returnFiber;
				return existing;
			} else {
				// 删除
				deletionChild(returnFiber, currentFiber);
			}
		}

		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: number | string
	) {
		if (currentFiber !== null) {
			if (currentFiber.tag === HostText) {
				// 复用
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				return existing;
			} else {
				// 删除
				deletionChild(returnFiber, currentFiber);
			}
		}
		const fiber = new FiberNode(HostText, { content }, null);
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

		if (currentFiber !== null) {
			deletionChild(returnFiber, currentFiber);
		}

		if (__DEV__) {
			console.warn('reconcileChildren 类型未定义', newChild);
		}
		return null;
	};
}

function useFiber(currentFiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWorkInProcess(currentFiber, pendingProps);
	clone.index = 0;
	clone.sibling = null;
	return clone;
}

export const mountChildFibers = ChildFibers(false);
export const reconcileChildFibers = ChildFibers(true);
