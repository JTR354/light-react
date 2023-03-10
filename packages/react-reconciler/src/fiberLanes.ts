export type Lane = number;
export type Lanes = number;

export const NoLanes = 0;
export const NoLane = 0;
export const SyncLane = 1;

export function mergeLanes(lane1: Lane, lane2: Lane) {
	return lane1 | lane2;
}

export function requestUpdateLane() {
	return SyncLane;
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
