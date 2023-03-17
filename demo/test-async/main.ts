import {
	unstable_ImmediatePriority as ImmediatePriority,
	unstable_IdlePriority as IdlePriority,
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_LowPriority as LowPriority,
	unstable_NormalPriority as NormalPriority,
	unstable_getFirstCallbackNode,
	unstable_scheduleCallback,
	CallbackNode,
	unstable_cancelCallback,
	unstable_shouldYield,
} from 'scheduler';
import './styles.css';
interface Work {
	count: number;
	priority: Priority;
}

type Priority =
	| typeof NormalPriority
	| typeof ImmediatePriority
	| typeof IdlePriority
	| typeof UserBlockingPriority
	| typeof LowPriority;

const root = document.querySelector('#root');

const workList: Work[] = [];

[ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority].forEach(
	(priority) => {
		const btn = document.createElement('button');
		btn.innerText = [
			'',
			'ImmediatePriority',
			'UserBlockingPriority',
			'NormalPriority',
			'LowPriority',
		][priority];
		btn.addEventListener('click', () => {
			workList.unshift({ count: 100, priority: priority as Priority });
			schedule();
		});
		root?.appendChild(btn);
	}
);
let curCallback: CallbackNode | null = null;
let prevPriority: Priority = IdlePriority;
function schedule() {
	const cbNode = unstable_getFirstCallbackNode();
	const curWork = workList.sort((w1, w2) => w1.priority - w2.priority)[0];

	// 策略逻辑
	if (!curWork) {
		curCallback = null;
		cbNode && unstable_cancelCallback(cbNode);
		return;
	}
	const { priority: curPriority } = curWork;

	if (prevPriority === curPriority) return;

	cbNode && unstable_cancelCallback(cbNode);

	curCallback = unstable_scheduleCallback(
		curPriority,
		perform.bind(null, curWork)
	);
}

function perform(work: Work, didTimeout?: boolean) {
	// 1. priority
	// 2. 饥饿问题
	// 3. 时间分片

	const needSync = work.priority === ImmediatePriority || didTimeout;
	while ((needSync || !unstable_shouldYield()) && work.count > 0) {
		work.count--;
		insertSpan(work.priority + '');
	}
	// 中断 | 执行
	prevPriority = work.priority;

	if (work.count <= 0) {
		workList.splice(workList.indexOf(work), 1);
		prevPriority = IdlePriority;
	}

	const prevCallback = curCallback;
	schedule();
	const newCallback = curCallback;

	if (newCallback && prevCallback === newCallback) {
		return perform.bind(null, work);
	}
}

function insertSpan(count: string) {
	const span = document.createElement('span');
	span.textContent = count;
	span.className = `pri-${count}`;
	sleep(1e7);
	root?.appendChild(span);
}

function sleep(n: number) {
	while (n) {
		n--;
	}
}
