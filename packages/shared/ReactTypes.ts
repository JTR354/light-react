export type Type = any;
export type Key = any;
export type Ref = any;
export type Props = any;

export interface ReactElementType {
	$$typeof: number | symbol;
	type: Type;
	key: Key;
	ref: Ref;
	props: Props;
	__mark__: string;
}
