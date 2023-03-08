import { Container } from 'hostConfig';
import { Props } from 'shared/ReactTypes';

const keyElementProps = '__props';

export interface DOMElement extends Element {
	[keyElementProps]: Props;
}

export function updateFiberProps(node: DOMElement, props: Props) {
	node[keyElementProps] = props;
}

const validateEventList = ['click'];

export function initEvent(container: Container, eventType: string) {
	if (!validateEventList.includes(eventType)) {
		console.warn('不支持该事件类型', eventType);
		return;
	}
	if (__DEV__) {
		console.warn('初始化事件', eventType);
	}
	container.addEventListener(eventType, (e) => {
		dispatchEvent(container, eventType, e);
	});
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
	const targetElement = e.target as DOMElement;
	if (targetElement == null) {
		console.warn('该事件不存在', targetElement);
		return;
	}
	// 1. 收集事件
	const { capture, bubble } = collectPaths(targetElement, container, eventType);
	// 2. 创建合成事件
	const se = createSyntheticEvent(e);
	// 3. capture
	triggerEventFlow(se, capture);
	// 4. bubble
	if (se.__stopPropagation) return;
	triggerEventFlow(se, bubble);
}

function triggerEventFlow(
	se: SyntheticEvent,
	events: Paths['capture'] | Paths['bubble']
) {
	for (let i = 0; i < events.length; i++) {
		const callback = events[i];
		callback.call(null, se);
		if (se.__stopPropagation) {
			break;
		}
	}
}

function createSyntheticEvent(e: Event): SyntheticEvent {
	const syntheticEvent = e as SyntheticEvent;
	const originStopPropagation = e.stopPropagation;
	syntheticEvent.__stopPropagation = false;

	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true;

		if (originStopPropagation) {
			originStopPropagation();
		}
	};

	return syntheticEvent;
}

interface SyntheticEvent extends Event {
	__stopPropagation: boolean;
}

type EventCallback = (e: Event) => void;
interface Paths {
	capture: EventCallback[];
	bubble: EventCallback[];
}

function collectPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string
): Paths {
	const paths: Paths = {
		capture: [],
		bubble: [],
	};
	while (targetElement && targetElement !== container) {
		const elementProps = targetElement[keyElementProps];
		if (elementProps) {
			const eventNameList = getEventCallbackFromEventType(eventType);
			if (eventNameList) {
				eventNameList.forEach((eventName, i) => {
					const eventCallback = elementProps[eventName];
					if (eventCallback instanceof Function) {
						if (i === 0) {
							paths.capture.unshift(eventCallback);
						} else {
							paths.bubble.push(eventCallback);
						}
					}
				});
			}
		}
		targetElement = targetElement.parentNode as DOMElement;
	}

	return paths;
}

function getEventCallbackFromEventType(eventType: string) {
	return {
		click: ['onClickCapture', 'onClick'],
	}[eventType];
}
