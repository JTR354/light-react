import React, { useState, Fragment } from 'react';
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
	// return <>{arr}</>;
	return (
		<>
			<ul>
				<button
					onClickCapture={() => {
						// setNum((num) => num + 1);
						// setNum((num) => num + 1);
						setNum((num) => num + 10);
						setNum(num + 1);
						setNum(num + 1);
						setNum(num + 1);
					}}>
					add num
				</button>
				<>
					<li>a</li>
					<li>b</li>
				</>
				{arr}
			</ul>
		</>
	);
};
export function Child({ num }: { num: number }) {
	const [c, setC] = useState(100);
	return <li id='1' onClick={() => setC(c - 1)}>{`${c}child+${num}`}</li>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
