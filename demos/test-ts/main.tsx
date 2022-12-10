import React from 'react';
import ReactDOM from 'react-dom/client';

// const jsx: any = <div>react</div>;
function App() {
	return (
		// <div>
		<B />
		// </div>
	);
}

function B() {
	return <div>hello function component</div>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	(<App />) as Element
);
