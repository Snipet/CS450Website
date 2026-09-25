import { describe, expect, it } from 'vitest';
import { SLIDE_GOAL, SLIDE_START } from '$lib/theory/puzzle';
import { SolverQueue, type RunEntries, type SolverWorker } from './queue';
import type { SolverRequest, SolverResponse, SolverRun } from './solvers';

class FakeWorker implements SolverWorker {
	posted: SolverRequest[] = [];
	terminated = false;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	postMessage(message: SolverRequest) {
		this.posted.push(message);
	}
	terminate() {
		this.terminated = true;
	}
	/** Answers the oldest unanswered request. */
	answer(extra: Partial<SolverRun> = {}) {
		const request = this.posted.shift()!;
		const run = fakeRun(request, extra);
		this.onmessage?.({ data: { id: request.id, run } satisfies SolverResponse } as MessageEvent);
	}
}

function fakeRun(request: SolverRequest, extra: Partial<SolverRun> = {}): SolverRun {
	return {
		solver: request.solver,
		start: request.start,
		goal: request.goal,
		outcome: 'solved',
		expanded: 1,
		generated: 3,
		maxFrontier: 2,
		explored: 1,
		length: 1,
		actions: ['Right'],
		ms: 1,
		budget: null,
		depthLimit: null,
		...extra
	};
}

function setup() {
	const workers: FakeWorker[] = [];
	const changes: RunEntries[] = [];
	const queue = new SolverQueue({
		createWorker: () => {
			const w = new FakeWorker();
			workers.push(w);
			return w;
		},
		onchange: (e) => changes.push(e)
	});
	return { queue, workers, changes };
}

const statuses = (entries: RunEntries) =>
	Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, v?.status]));

describe('SolverQueue with a worker', () => {
	it('posts requests in order and marks the first one running', () => {
		const { queue, workers } = setup();
		queue.start();
		expect(queue.usesWorker).toBe(true);
		queue.run(['bfs', 'astar-h2'], SLIDE_START, SLIDE_GOAL);
		expect(workers).toHaveLength(1);
		expect(workers[0].posted.map((r) => r.solver)).toEqual(['bfs', 'astar-h2']);
		expect(statuses(queue.entries)).toEqual({ bfs: 'running', 'astar-h2': 'queued' });
		expect(queue.busy).toBe(true);
	});

	it('records results as they arrive', () => {
		const { queue, workers, changes } = setup();
		queue.run(['bfs', 'astar-h2'], SLIDE_START, SLIDE_GOAL);
		workers[0].answer({ length: 26 });
		expect(statuses(queue.entries)).toEqual({ bfs: 'done', 'astar-h2': 'running' });
		expect(queue.entries.bfs?.run?.length).toBe(26);
		workers[0].answer();
		expect(queue.busy).toBe(false);
		expect(changes.at(-1)).toBe(queue.entries);
	});

	it('does not queue a solver twice', () => {
		const { queue, workers } = setup();
		queue.run(['bfs'], SLIDE_START, SLIDE_GOAL);
		queue.run(['bfs', 'ids'], SLIDE_START, SLIDE_GOAL);
		expect(workers[0].posted.map((r) => r.solver)).toEqual(['bfs', 'ids']);
	});

	it('cancels by terminating the worker and starts a new one for the next run', () => {
		const { queue, workers } = setup();
		queue.run(['bfs', 'ids'], SLIDE_START, SLIDE_GOAL);
		queue.cancel();
		expect(workers[0].terminated).toBe(true);
		expect(statuses(queue.entries)).toEqual({ bfs: 'cancelled', ids: 'cancelled' });
		expect(queue.busy).toBe(false);
		queue.run(['greedy'], SLIDE_START, SLIDE_GOAL);
		expect(workers).toHaveLength(2);
		expect(workers[1].posted.map((r) => r.solver)).toEqual(['greedy']);
		// Cancelling when idle does nothing.
		workers[1].answer();
		queue.cancel();
		expect(workers[1].terminated).toBe(false);
	});

	it('ignores answers to requests it no longer waits for', () => {
		const { queue, workers } = setup();
		queue.run(['bfs'], SLIDE_START, SLIDE_GOAL);
		const stale = workers[0].posted[0];
		queue.clear();
		workers[0].onmessage?.({ data: { id: stale.id, run: fakeRun(stale) } } as MessageEvent);
		expect(queue.entries).toEqual({});
	});

	it('clears results', () => {
		const { queue, workers } = setup();
		queue.run(['bfs'], SLIDE_START, SLIDE_GOAL);
		workers[0].answer();
		queue.clear();
		expect(queue.entries).toEqual({});
		expect(workers[0].terminated).toBe(false);
	});

	it('reports worker errors on every waiting solver', () => {
		const { queue, workers } = setup();
		queue.run(['bfs', 'ids'], SLIDE_START, SLIDE_GOAL);
		workers[0].onerror?.({ message: 'boom', preventDefault() {} } as ErrorEvent);
		expect(queue.entries.bfs).toEqual({ status: 'error', error: 'boom' });
		expect(queue.entries.ids).toEqual({ status: 'error', error: 'boom' });
		expect(workers[0].terminated).toBe(true);
		expect(queue.busy).toBe(false);
	});

	it('records errors the worker answers with', () => {
		const { queue, workers } = setup();
		queue.run(['bfs'], SLIDE_START, SLIDE_GOAL);
		const r = workers[0].posted[0];
		workers[0].onmessage?.({ data: { id: r.id, error: 'bad' } } as MessageEvent);
		expect(queue.entries.bfs).toEqual({ status: 'error', error: 'bad' });
	});

	it('terminates the worker on dispose', () => {
		const { queue, workers } = setup();
		queue.start();
		queue.dispose();
		expect(workers[0].terminated).toBe(true);
	});
});

describe('SolverQueue without workers', () => {
	it('runs only the light solvers, on the main thread, one task at a time', () => {
		const tasks: (() => void)[] = [];
		const ran: string[] = [];
		const queue = new SolverQueue({
			createWorker: () => null,
			defer: (task) => tasks.push(task),
			runLocal: (request) => {
				ran.push(request.solver);
				return { id: request.id, run: fakeRun(request) };
			}
		});
		queue.start();
		expect(queue.usesWorker).toBe(false);
		expect(queue.canRun('bfs')).toBe(false);
		expect(queue.canRun('astar-h2')).toBe(true);
		queue.run(['bfs', 'greedy', 'astar-h2'], SLIDE_START, SLIDE_GOAL);
		expect(statuses(queue.entries)).toEqual({ greedy: 'running', 'astar-h2': 'queued' });
		expect(tasks).toHaveLength(1);
		tasks.shift()!();
		expect(ran).toEqual(['greedy']);
		expect(statuses(queue.entries)).toEqual({ greedy: 'done', 'astar-h2': 'running' });
		tasks.shift()!();
		expect(ran).toEqual(['greedy', 'astar-h2']);
		expect(queue.busy).toBe(false);
		expect(tasks).toHaveLength(0);
	});

	it('drops a cancelled main-thread run before it starts', () => {
		const tasks: (() => void)[] = [];
		const queue = new SolverQueue({
			createWorker: () => null,
			defer: (task) => tasks.push(task),
			runLocal: (request) => ({ id: request.id, run: fakeRun(request) })
		});
		queue.run(['astar-h2'], SLIDE_START, SLIDE_GOAL);
		queue.cancel();
		tasks.shift()!();
		expect(queue.entries['astar-h2']?.status).toBe('cancelled');
	});

	it('uses the real solvers by default', async () => {
		const queue = new SolverQueue({ createWorker: () => null });
		await new Promise<void>((resolve) => {
			const q = new SolverQueue({
				createWorker: () => null,
				onchange: (entries) => {
					if (entries['astar-h2']?.status === 'done') resolve();
				}
			});
			q.run(['astar-h2'], '102345678', SLIDE_GOAL);
		});
		expect(queue.busy).toBe(false);
	});
});
