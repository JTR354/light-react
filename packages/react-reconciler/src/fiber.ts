import { Key, Props, Ref } from 'shared/ReactTypes';
import { Flags, NoFlags } from './fiberFlags';
import { WorkTag } from './workTags';

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
	alternate: FiberNode | null;
	flags: Flags;
	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		// 属性
		this.tag = tag;
		this.key = key;
		this.stateNode = null;
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

		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
	}
}
