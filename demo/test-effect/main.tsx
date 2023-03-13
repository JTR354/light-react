import React from 'react';
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, updateNum] = useState(0);
	useEffect(() => {
		console.log('num change create', num);
		return () => {
			console.log('num change destroy', num);
		};
	}, [num]);
	useEffect(() => {
		console.log('App mount');
	}, []);

	return (
		<div onClick={() => updateNum(num + 1)}>
			{num % 2 === 0 ? <Child num={num} /> : num}
		</div>
	);
}

function Child({ num }: { num: number }) {
	console.log(num);
	useEffect(() => {
		console.log('Child mount');
		return () => console.log('Child unmount');
	}, []);

	return <span>i am child{num}</span>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
