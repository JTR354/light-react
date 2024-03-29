export const NoFlags = 0;
export const Placement = 1 << 0;
export const Update = 1 << 1;
export const ChildDeletion = 1 << 2;
export const PassiveEffect = 1 << 3;

export type Flags = number;

export const MutationMask = Placement | Update | ChildDeletion;

export const PassiveMask = PassiveEffect | ChildDeletion;
