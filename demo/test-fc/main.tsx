import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
	return (
		<div>
			<Child />
		</div>
	);
};
function Child() {
	const [num, setNum] = useState(100);
	//@ts-ignore
	window.setNum = setNum;
	return <span id="1">{num}</span>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
