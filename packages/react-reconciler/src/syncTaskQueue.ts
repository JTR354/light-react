type Callback = (...args: any) => void;

let syncQueue: Callback[] | null = null;
let isFlushingSyncQueue = false;
export function scheduleSyncCallback(cb: Callback) {
	if (syncQueue === null) {
		syncQueue = [cb];
	} else {
		syncQueue.push(cb);
	}
}

export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true;
		try {
			syncQueue.forEach((cb) => cb());
		} catch (error) {
			console.error(flushSyncCallbacks.name, error);
		} finally {
			isFlushingSyncQueue = false;
			syncQueue = null;
		}
	}
}
