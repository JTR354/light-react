import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
	const [num, setNum] = useState(100);
	//@ts-ignore
	window.setNum = setNum;
	return <div>{num === 3 ? <Child /> : num}</div>;
};
function Child() {
	return <span id="1">{'light-react'}</span>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
