import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactElementType } from 'shared/ReactTypes';

const jsx = (
	<div>
		<span>hello world</span>
	</div>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	jsx as ReactElementType
);
console.log(jsx, React);
