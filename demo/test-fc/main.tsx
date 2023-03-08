import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
	const [num, setNum] = useState(-1);
	const arr =
		num % 2
			? [
					<li key='1'>1</li>, // i=0
					<li key='2'>2</li>, // i=1
					<li key='3'>3</li>, // i=2
					<Child key='child' num={num} />, // i=3
			  ]
			: [
					<li key='3'>3</li>, // i=2 2<0 false p = 2
					<li key='2'>2</li>, // i=1 1<2 true p = 2 移动 的时候， child=l2, before=null
					<li key='1'>1</li>, // i=0 0<2 true p=2 移动 的时候， child=l1, before=null
					<Child key='child' num={num} />, // i=3 3<2 false p=3
			  ];
	return (
		<div key='divKey' ref='divRef' onClick={() => setNum(num + 1)}>
			{arr}
		</div>
	);
	// return (
	// 	<div onClick={() => setNum(num + 1)}>{num === 3 ? <Child /> : num}</div>
	// );
};
export function Child({ num }: { num: number }) {
	return <li id='1'>{`child+${num}`}</li>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
