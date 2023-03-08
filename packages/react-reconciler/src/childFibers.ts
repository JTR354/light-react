import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createWorkInProcess,
	createFiberFromElement,
} from './fiber';
import { ChildDeletion, Placement } from './fiberFlags';
import { HostText } from './workTags';

type ExistingChildren = Map<string | number, FiberNode>;

function ChildFibers(shouldTrackEffects: boolean) {
	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: any[]
	) {
		// 1. map currentFiber
		const existingChildren: ExistingChildren = new Map();
		let current = currentFiber;
		while (current !== null) {
			const keyToUse = current.key == null ? current.index : current.key;
			existingChildren.set(keyToUse, current);
			current = current.sibling;
		}

		let firstNewFiber: FiberNode | null = null;
		let lastNewFiber: FiberNode | null = null;
		let lastPlaceIndex = 0;
		for (let i = 0; i < newChild.length; i++) {
			const element = newChild[i];
			// 2. 比对newChild 和 currentFiber
			const newFiber = updateFromMap(returnFiber, existingChildren, i, element);

			if (newFiber === null) continue;

			// 3. 标记或移动

			newFiber.index = i;
			newFiber.return = returnFiber;

			if (lastNewFiber === null) {
				lastNewFiber = newFiber;
				// 标记链表的第一个元素
				firstNewFiber = newFiber;
			} else {
				// 和sibling建立链接
				lastNewFiber.sibling = newFiber;
				lastNewFiber = lastNewFiber.sibling;
			}

			if (!shouldTrackEffects) {
				continue;
			}

			const current = newFiber.alternate;
			if (current !== null) {
				// update
				const oldIndex = current.index;
				if (oldIndex < lastPlaceIndex) {
					// move
					newFiber.flags |= Placement;
					continue;
				} else {
					// stay
					lastPlaceIndex = oldIndex;
				}
			} else {
				// mount
				newFiber.flags |= Placement;
			}
		}
		// 4.移除剩余的map元素
		existingChildren.forEach((fiber) => {
			deletionChild(returnFiber, fiber);
		});

		return firstNewFiber;
	}
	function deletionChild(returnFiber: FiberNode, childToDel: FiberNode) {
		if (!shouldTrackEffects) return;
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDel];
			returnFiber.flags |= ChildDeletion;
		} else {
			deletions.push(childToDel);
		}
	}
	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null
	) {
		if (!shouldTrackEffects) return;
		while (currentFiber !== null) {
			deletionChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
		}
	}
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		while (currentFiber !== null) {
			if (
				element.key === currentFiber.key &&
				element.type === currentFiber.type
			) {
				// 复用
				const existing = useFiber(currentFiber, element.props);
				existing.return = returnFiber;
				// key相同 type相同
				deleteRemainingChildren(returnFiber, currentFiber.sibling);
				return existing;
			} else if (element.key === currentFiber.key) {
				// key相同 type不同
				deleteRemainingChildren(returnFiber, currentFiber);
				break;
			}
			// 删除
			deletionChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
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
		while (currentFiber !== null) {
			if (currentFiber.tag === HostText) {
				// 复用
				// type相同
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				deleteRemainingChildren(returnFiber, currentFiber.sibling);
				return existing;
			}
			// 删除
			deletionChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
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
		if (Array.isArray(newChild)) {
			return reconcileChildrenArray(returnFiber, currentFiber, newChild);
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
					break;
			}
		}
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
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

function updateFromMap(
	returnFiber: FiberNode,
	existingChildren: ExistingChildren,
	index: number,
	element: any
): FiberNode | null {
	const keyToUse = element?.key ? element.key : index;
	const before = existingChildren.get(keyToUse);
	if (typeof element === 'number' || typeof element === 'string') {
		if (before) {
			if (before.tag === HostText) {
				existingChildren.delete(keyToUse);
				return useFiber(before, { content: element });
			}
			return new FiberNode(HostText, { content: element }, null);
		}
	}
	if (element !== null && typeof element === 'object') {
		switch (element.$$typeof) {
			case REACT_ELEMENT_TYPE:
				if (before) {
					if (before.type === element.type) {
						existingChildren.delete(keyToUse);
						return useFiber(before, element.props);
					}
				}
				return createFiberFromElement(element);
			default:
				if (__DEV__) {
					console.warn(updateFromMap.name + '为实现的类型', element);
				}
				break;
		}
	}
	if (Array.isArray(element)) {
		// TODO
		if (__DEV__) {
			console.warn(updateFromMap.name + '为实现的类型', element);
		}
	}

	return null;
}

function useFiber(currentFiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWorkInProcess(currentFiber, pendingProps);
	clone.index = 0;
	clone.sibling = null;
	return clone;
}

export const mountChildFibers = ChildFibers(false);
export const reconcileChildFibers = ChildFibers(true);
