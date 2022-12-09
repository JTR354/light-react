export const functionComponent = 0;
export const HostRoot = 3;
export const HostComponent = 5;
export const HostText = 7;

export type WorkTag =
	| typeof functionComponent
	| typeof HostRoot
	| typeof HostText
	| typeof HostComponent;
