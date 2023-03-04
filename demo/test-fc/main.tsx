import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
	const [num, setNum] = useState(-1);
	//@ts-ignore
	window.setNum = setNum;
	return (
		<div onClick={() => setNum(num + 1)}>{num === 3 ? <Child /> : num}</div>
	);
};
function Child() {
	return <span id="1">{'light-react'}</span>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
