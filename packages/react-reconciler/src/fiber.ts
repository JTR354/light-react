import { Container } from 'hostConfig';
import { Key, Props, ReactElementType, Ref } from 'shared/ReactTypes';
import { Flags, NoFlags } from './fiberFlags';
import { FunctionComponent, WorkTag, HostComponent } from './workTags';

export class FiberNode {
	tag: WorkTag;
	key: Key;
	stateNode: any;
	type: any;
	ref: Ref;
	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;
	pendingProps: Props | null;
	memorizedProps: Props | null;
	memorizedState: any;
	alternate: FiberNode | null;
	flags: Flags;
	updateQueue: unknown;
	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		// 属性
		this.tag = tag;
		this.key = key;
		// HostComponent <div></div>
		this.stateNode = null;
		// FunctionComponent () => {}
		this.type = null;
		this.ref = null;
		// 树结构
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;

		// 工作单元
		this.pendingProps = pendingProps;
		this.memorizedProps = null;
		this.memorizedState = null;

		this.updateQueue = null;
		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
	}
}

export const createWorkInProcess = (
	current: FiberNode,
	pendingProps: Props
) => {
	let wip = current.alternate;
	if (wip == null) {
		// mount
		wip = new FiberNode(current.tag, pendingProps, current.key);
		wip.stateNode = current.stateNode;
		wip.alternate = current;
		current.alternate = wip;
	} else {
		// update
		wip.pendingProps = pendingProps;
		wip.flags = NoFlags;
	}
	wip.type = current.type;
	wip.child = current.child;
	wip.memorizedProps = current.memorizedProps;
	wip.memorizedState = current.memorizedState;
	wip.updateQueue = current.updateQueue;

	return wip;
};

export function createFiberFromElement(element: ReactElementType): FiberNode {
	let workTag: WorkTag = FunctionComponent;
	const { type, props, key } = element;
	if (type === 'string') {
		workTag = HostComponent;
	} else if (typeof type !== 'function') {
		if (__DEV__) {
			console.warn(`createFiberFromElement 为实现的类型`, element);
		}
	}
	const fiber = new FiberNode(workTag, props, key);
	fiber.type = type;
	return fiber;
}
