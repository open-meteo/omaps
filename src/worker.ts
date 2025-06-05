export interface WorkerGlobalScopeInterface {
	importScripts(...urls: Array<string>): void;
	registerWorkerSource: (
		sourceName: string,
		sourceConstructor: WorkerSourceConstructor
	) => void;
	registerRTLTextPlugin: (_: any) => void;
	addProtocol: (customProtocol: string, loadFn: AddProtocolAction) => void;
	removeProtocol: (customProtocol: string) => void;
	worker: MaplibreWorker;
}

export function isWorker(self: any): self is WorkerGlobalScopeInterface {
	// @ts-ignore
	return (
		typeof WorkerGlobalScope !== 'undefined' &&
		typeof self !== 'undefined' &&
		self instanceof WorkerGlobalScope
	);
}

/**
 * The Worker class responsible for background thread related execution
 */
export default class Worker {}

if (isWorker(self)) {
	self.worker = new Worker(self);
}
