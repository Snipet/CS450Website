/**
 * Runs solvers one after another in a Web Worker and tracks their status for
 * the results table. Cancel terminates the worker (a search cannot be
 * interrupted otherwise); the next run starts a fresh one. Without Web
 * Workers only the light solvers run, on the main thread, one per task so
 * the page repaints in between.
 */
import type { Board } from '$lib/theory/puzzle';
import {
	handleRequest,
	solverSpec,
	type SolverId,
	type SolverRequest,
	type SolverResponse,
	type SolverRun
} from './solvers';

/** The part of `Worker` the queue uses. */
export interface SolverWorker {
	postMessage(message: SolverRequest): void;
	terminate(): void;
	onmessage: ((event: MessageEvent) => void) | null;
	onerror: ((event: ErrorEvent) => void) | null;
}

export type RunStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';

export interface RunEntry {
	status: RunStatus;
	run?: SolverRun;
	error?: string;
}

export type RunEntries = Partial<Record<SolverId, RunEntry>>;

export interface QueueOptions {
	/** Returns a new worker, or null when workers are unavailable. */
	createWorker: () => SolverWorker | null;
	/** Called with a new entries object after every change. */
	onchange?: (entries: RunEntries) => void;
	/** Main-thread fallback (default: `handleRequest`). */
	runLocal?: (request: SolverRequest) => SolverResponse;
	/** Schedules main-thread work after the page repaints (default: setTimeout). */
	defer?: (task: () => void) => void;
}

export class SolverQueue {
	#options: QueueOptions;
	#entries: RunEntries = {};
	#pending: SolverRequest[] = [];
	#worker: SolverWorker | null = null;
	#available: boolean | null = null;
	#nextId = 1;
	#localScheduled = false;

	constructor(options: QueueOptions) {
		this.#options = options;
	}

	/** Status of every solver that has run or is waiting. */
	get entries(): RunEntries {
		return this.#entries;
	}

	/** Whether a solver is running or queued. */
	get busy(): boolean {
		return this.#pending.length > 0;
	}

	/**
	 * Whether solvers run in a worker. Null until `start` (or the first run)
	 * has tried to create one.
	 */
	get usesWorker(): boolean | null {
		return this.#available;
	}

	/** Creates the worker ahead of the first run. */
	start(): void {
		this.#ensureWorker();
	}

	/** Whether a solver can run here: every solver in a worker, only light ones without. */
	canRun(id: SolverId): boolean {
		return this.#available !== false || solverSpec(id).light;
	}

	/** Queues solvers for a board; ones already waiting are not queued twice. */
	run(ids: readonly SolverId[], start: Board, goal: Board): void {
		const worker = this.#ensureWorker();
		let added = false;
		for (const solver of ids) {
			if (!this.canRun(solver) || this.#pending.some((p) => p.solver === solver)) continue;
			const request: SolverRequest = { id: this.#nextId++, solver, start, goal };
			this.#pending.push(request);
			this.#set(solver, { status: 'queued' });
			worker?.postMessage(request);
			added = true;
		}
		if (!added) return;
		this.#markRunning();
		this.#emit();
		if (!worker) this.#scheduleLocal();
	}

	/** Stops the running solver and drops the queued ones. */
	cancel(): void {
		if (!this.#pending.length) return;
		if (this.#worker) {
			this.#worker.terminate();
			this.#worker = null;
		}
		for (const request of this.#pending) this.#set(request.solver, { status: 'cancelled' });
		this.#pending = [];
		this.#emit();
	}

	/** Cancels everything and forgets all results (the board changed). */
	clear(): void {
		this.cancel();
		if (Object.keys(this.#entries).length === 0) return;
		this.#entries = {};
		this.#emit();
	}

	/** Stops the worker for good (the page is going away). */
	dispose(): void {
		this.#worker?.terminate();
		this.#worker = null;
		this.#pending = [];
	}

	#ensureWorker(): SolverWorker | null {
		if (this.#worker) return this.#worker;
		if (this.#available === false) return null;
		const worker = this.#options.createWorker();
		this.#available = worker !== null;
		if (!worker) {
			this.#emit();
			return null;
		}
		worker.onmessage = (event) => this.#receive(event.data as SolverResponse);
		worker.onerror = (event) => {
			event.preventDefault?.();
			this.#fail(event.message || 'The solver stopped with an error.');
		};
		this.#worker = worker;
		return worker;
	}

	#receive(response: SolverResponse): void {
		const at = this.#pending.findIndex((p) => p.id === response.id);
		if (at < 0) return;
		const [request] = this.#pending.splice(at, 1);
		this.#set(
			request.solver,
			'run' in response
				? { status: 'done', run: response.run }
				: { status: 'error', error: response.error }
		);
		this.#markRunning();
		this.#emit();
	}

	#fail(message: string): void {
		this.#worker?.terminate();
		this.#worker = null;
		for (const request of this.#pending) {
			this.#set(request.solver, { status: 'error', error: message });
		}
		this.#pending = [];
		this.#emit();
	}

	#scheduleLocal(): void {
		if (this.#localScheduled || !this.#pending.length) return;
		this.#localScheduled = true;
		const defer = this.#options.defer ?? ((task: () => void) => setTimeout(task, 16));
		defer(() => {
			this.#localScheduled = false;
			const request = this.#pending[0];
			if (!request) return;
			const runLocal = this.#options.runLocal ?? handleRequest;
			this.#receive(runLocal(request));
			this.#scheduleLocal();
		});
	}

	#markRunning(): void {
		const first = this.#pending[0];
		if (first) this.#set(first.solver, { status: 'running' });
	}

	#set(solver: SolverId, entry: RunEntry): void {
		this.#entries = { ...this.#entries, [solver]: entry };
	}

	#emit(): void {
		this.#options.onchange?.(this.#entries);
	}
}
