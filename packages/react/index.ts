import currentBatchConfig from './src/currentBatchConfig';
import {
	currentDispatcher,
	Dispatcher,
	resolveDispatcher,
} from './src/currentDispatcher';
import { jsxDEV, isValidElement as isValidElementFn, jsx } from './src/jsx';

export { Fragment } from './src/jsx';
export const useState: Dispatcher['useState'] = (initState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initState);
};
export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useEffect(create, deps);
};
export const useTransition: Dispatcher['useTransition'] = () => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useTransition();
};

export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher,
	currentBatchConfig,
};

const React = {
	version: '0.0.0',
	createElementDEV: jsxDEV,
	createElement: jsx,
	isValidElement: isValidElementFn,
};

export const version = React.version;
// export const createElement = React.createElementDEV;
export const createElement = React.createElement;
export const isValidElement = React.isValidElement;

export default React;
