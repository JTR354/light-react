import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
	const [num, setNum] = useState(-1);
	const arr =
		num % 2
			? [
					<li key="1">1</li>,
					<li key="2">2</li>,
					<li key="3">3</li>,
					<Child key="child" num={num} />
			  ]
			: [
					<li key="3">3</li>,
					<li key="2">2</li>,
					<li key="1">1</li>,
					<Child key="child" num={num} />
			  ];
	return <div onClick={() => setNum(num + 1)}>{arr}</div>;
	// return (
	// 	<div onClick={() => setNum(num + 1)}>{num === 3 ? <Child /> : num}</div>
	// );
};
export function Child({ num }: { num: number }) {
	return <li id="1">{num}</li>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
