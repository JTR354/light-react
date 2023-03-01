import {
	currentDispatcher,
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import { jsxDEV } from './src/jsx';

export const useState: Dispatcher['useState'] = (initState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initState);
};

export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher
};

const React = {
	version: '0.0.0',
	createElement: jsxDEV
};
export default React;
