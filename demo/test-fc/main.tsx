import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
	return (
		<div>
			<Child />
		</div>
	);
};
function Child() {
	return <span id="1">hello wold</span>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
