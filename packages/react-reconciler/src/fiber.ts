import { Container } from 'hostConfig';
import { CallbackNode } from 'scheduler';
import { Key, Props, ReactElementType, Ref } from 'shared/ReactTypes';
import { Flags, NoFlags } from './fiberFlags';
import { Effect } from './fiberHooks';
import { Lane, Lanes, NoLane, NoLanes } from './fiberLanes';
import {
	FunctionComponent,
	WorkTag,
	HostComponent,
	Fragment,
} from './workTags';

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
	subTreeFlags: Flags;
	updateQueue: unknown;
	deletions: FiberNode[] | null;
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
		this.deletions = null;
		// 副作用
		this.flags = NoFlags;
		this.subTreeFlags = NoFlags;
	}
}

export interface PendingPassiveEffects {
	unmount: Effect[];
	update: Effect[];
}
export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	finishedLane: Lane;
	pendingLanes: Lanes;
	pendingPassiveEffects: PendingPassiveEffects;
	callbackNode: CallbackNode | null;
	callbackPriority: Lane;
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
		this.finishedLane = NoLane;
		this.pendingLanes = NoLanes;
		this.callbackNode = null;
		this.callbackPriority = NoLane;
		this.pendingPassiveEffects = {
			unmount: [],
			update: [],
		};
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
		wip.subTreeFlags = NoFlags;
		wip.deletions = null;
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
	if (typeof type === 'string') {
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

export function createFiberFromFragment(element: any[]) {
	const fiber = new FiberNode(Fragment, element, null);
	return fiber;
}
