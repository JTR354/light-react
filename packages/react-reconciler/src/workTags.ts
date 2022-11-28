export type WorkTag =
	| typeof functionComponent
	| typeof HostRoot
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText;

export const functionComponent = 0;
export const HostRoot = 3;
export const HostComponent = 5;
export const HostText = 6;
