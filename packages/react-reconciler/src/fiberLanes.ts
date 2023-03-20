import ReactCurrentBatchConfig from 'react/src/currentBatchConfig';
import {
	unstable_getCurrentPriorityLevel,
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
} from 'scheduler';

export type Lane = number;
export type Lanes = number;

export const NoLanes = 0;
export const NoLane = 0;
export const SyncLane = 1;
export const InputContinuesLane = 1 << 1;
export const DefaultLane = 1 << 2;
export const TransitionLane = 1 << 3;
export const IdleLane = 1 << 8;

export function mergeLanes(lane1: Lane, lane2: Lane) {
	return lane1 | lane2;
}

export function requestUpdateLane() {
	const isTransition = ReactCurrentBatchConfig.transition;
	if (isTransition !== null) {
		return TransitionLane;
	}
	const currentPriority = unstable_getCurrentPriorityLevel();
	const lane = schedulePriorityToLane(currentPriority);
	return lane;
}

export function schedulePriorityToLane(priority: number): Lane {
	if (priority === unstable_ImmediatePriority) {
		return SyncLane;
	}
	if (priority === unstable_UserBlockingPriority) {
		return InputContinuesLane;
	}
	if (priority === unstable_NormalPriority) {
		return DefaultLane;
	}
	return NoLane;
}

export function lanesToSchedulePriority(lane: Lane): number {
	if (lane === SyncLane) {
		return unstable_ImmediatePriority;
	}
	if (lane === InputContinuesLane) {
		return unstable_UserBlockingPriority;
	}
	if (lane === DefaultLane) {
		return unstable_NormalPriority;
	}
	return unstable_IdlePriority;
}

/**
 * -6(0b0110) === ~6 + 1(0b1001 + 1 => 0b1010)
 * 0b0110
 * &
 * 0b1010
 * =
 * 0b0010
 * @export 取出最低位
 * @param {Lanes} lanes
 * @return {*}
 */
export function getHighestPriorityLanes(lanes: Lanes) {
	return lanes & -lanes;
}

export function isSubsetOfLanes(set: Lanes, subSet: Lane) {
	return (set & subSet) === subSet;
}
