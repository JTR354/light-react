import ReactDOM from 'react-dom';

// import { useState } from 'react';
import { useState, useTransition } from 'react';
import TabButton from './TabButton';
import AboutTab from './AboutTab';
import PostsTab from './PostsTab';
import ContactTab from './ContactTab';
import './style.css';
import React from 'react';

function App() {
	const [isPending, startTransition] = useTransition();
	const [tab, setTab] = useState('about');
	console.log('hello');
	function selectTab(nextTab) {
		startTransition(() => {
			setTab(nextTab);
		});
	}

	return (
		<>
			<TabButton isActive={tab === 'about'} onClick={() => selectTab('about')}>
				首页
			</TabButton>
			<TabButton isActive={tab === 'posts'} onClick={() => selectTab('posts')}>
				博客 (render慢)
			</TabButton>
			<TabButton
				isActive={tab === 'contact'}
				onClick={() => selectTab('contact')}>
				联系我
			</TabButton>
			<hr />
			{tab === 'about' && <AboutTab />}
			{tab === 'posts' && <PostsTab />}
			{tab === 'contact' && <ContactTab />}
		</>
	);
}

// @ts-ignore
const root = ReactDOM.createRoot(document.querySelector('#root') as Element);

root.render(<App />);
