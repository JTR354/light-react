export const NoFlags = 0;
export const Placement = 1;
export const Update = 1 << 1;
export const ChildDeletion = 1 << 2;

export type Flags =
	| typeof NoFlags
	| typeof Placement
	| typeof Update
	| typeof ChildDeletion;

export const MutationMask = Placement | Update | ChildDeletion;
