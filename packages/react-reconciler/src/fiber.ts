import { Container } from 'hostConfig';
import { Key, Props, ReactElementType } from 'shared/ReactTypes';
import { Flags, NoFlags } from './fiberFlags';
import { WorkTag, HostComponent, functionComponent } from './workTags';

export class FiberNode {
	tag: WorkTag;
	key: Key;
	stateNode: any;
	type: any;
	return: FiberNode | null;
	child: FiberNode | null;
	sibling: FiberNode | null;
	index: number;
	ref: any;
	pendingProps: Props;
	memorizedProps: any;
	memorizedState: any;
	updateQueue: unknown;
	alternate: FiberNode | null;
	flags: Flags;
	subtreeFlags: Flags;

	constructor(tag: WorkTag, pendProps: Props, key: Key) {
		// 实例
		this.tag = tag;
		this.key = key;
		// dom
		this.stateNode = null;
		this.type = null;

		// 树结构
		this.return = null;
		this.child = null;
		this.sibling = null;
		this.index = 0;

		this.ref = null;
		// 工作单元
		this.pendingProps = pendProps;
		this.memorizedProps = null;
		this.memorizedState = null;
		this.updateQueue = null;

		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
		this.subtreeFlags = NoFlags;
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	constructor(container: Container, rootFiberNode: FiberNode) {
		this.container = container;
		this.current = rootFiberNode;
		rootFiberNode.stateNode = this;
		this.finishedWork = null;
	}
}

export const createWorkInProcess = (
	current: FiberNode,
	pendingProps: Props
): FiberNode => {
	// todo
	let wip = current.alternate;
	if (wip === null) {
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
	wip.memorizedState = current.memorizedState;
	wip.memorizedProps = current.memorizedProps;
	wip.updateQueue = current.updateQueue;

	return wip;
};

export const createFiberFromElement = (
	element: ReactElementType
): FiberNode => {
	const { key, props, type } = element;
	let fiberTag: WorkTag = functionComponent;
	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else {
		if (__DEV__) {
			console.warn('未实现的fiber类型');
		}
	}
	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	return fiber;
};
