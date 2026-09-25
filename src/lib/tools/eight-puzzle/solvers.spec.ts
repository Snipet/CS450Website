import { describe, expect, it } from 'vitest';
import { SLIDE_GOAL, SLIDE_START, playMoves } from '$lib/theory/puzzle';
import {
	IDS_NODE_BUDGET,
	SOLVERS,
	SOLVER_IDS,
	WEIGHT,
	handleRequest,
	isSolverId,
	runSolver,
	solverOptions,
	solverSpec,
	type SolverId
} from './solvers';

/** A clock that advances 5 ms per reading. */
function fakeClock() {
	let t = 0;
	return () => (t += 5);
}

describe('SOLVERS', () => {
	it('lists the six solvers in table order', () => {
		expect(SOLVER_IDS).toEqual(['bfs', 'ids', 'greedy', 'astar-h1', 'astar-h2', 'wastar']);
		expect(SOLVERS.map((s) => s.label)).toEqual([
			'BFS',
			'IDS',
			'Greedy (h2)',
			'A* (h1)',
			'A* (h2)',
			'Weighted A* (h2, α = 2)'
		]);
	});

	it('uses graph search except for IDS, which uses the path check', () => {
		for (const s of SOLVERS) expect(s.mode).toBe(s.id === 'ids' ? 'path' : 'graph');
	});

	it('marks the optimal and the light solvers', () => {
		expect(SOLVERS.filter((s) => s.optimal).map((s) => s.id)).toEqual([
			'bfs',
			'ids',
			'astar-h1',
			'astar-h2'
		]);
		expect(SOLVERS.filter((s) => s.light).map((s) => s.id)).toEqual([
			'greedy',
			'astar-h2',
			'wastar'
		]);
	});

	it('looks solvers up by id', () => {
		expect(solverSpec('astar-h2').heuristic).toBe('h2');
		expect(solverSpec('wastar').weight).toBe(WEIGHT);
		expect(() => solverSpec('nope' as SolverId)).toThrow();
		expect(isSolverId('bfs')).toBe(true);
		expect(isSolverId('dfs')).toBe(false);
		expect(isSolverId(3)).toBe(false);
	});
});

describe('solverOptions', () => {
	it('records summaries and never stops a graph search early', () => {
		const o = solverOptions(solverSpec('astar-h1'));
		expect(o.record).toBe('summary');
		expect(o.mode).toBe('graph');
		expect(o.maxExpansions).toBeGreaterThan(181_440);
	});

	it('caps IDS at the node budget', () => {
		const o = solverOptions(solverSpec('ids'));
		expect(o.maxNodes).toBe(IDS_NODE_BUDGET);
		expect(o.mode).toBe('path');
		expect(solverOptions(solverSpec('ids'), 500).maxNodes).toBe(500);
		expect(solverOptions(solverSpec('wastar')).weight).toBe(2);
	});
});

describe('runSolver', () => {
	it('solves the slide start optimally with BFS and both A* runs', () => {
		for (const id of ['bfs', 'astar-h1', 'astar-h2'] as const) {
			const run = runSolver(id, SLIDE_START, SLIDE_GOAL, { now: fakeClock() });
			expect(run.outcome).toBe('solved');
			expect(run.length).toBe(26);
			expect(run.actions).toHaveLength(26);
			expect(playMoves(SLIDE_START, run.actions).at(-1)).toBe(SLIDE_GOAL);
			expect(run.ms).toBe(5);
			expect(run.budget).toBeNull();
			expect(run.start).toBe(SLIDE_START);
			expect(run.goal).toBe(SLIDE_GOAL);
		}
	});

	it('reports expanded, generated and frontier counts', () => {
		const h1 = runSolver('astar-h1', SLIDE_START, SLIDE_GOAL);
		const h2 = runSolver('astar-h2', SLIDE_START, SLIDE_GOAL);
		expect(h2.expanded).toBeLessThan(h1.expanded);
		expect(h2.generated).toBeGreaterThan(h2.expanded);
		expect(h2.maxFrontier).toBeGreaterThan(0);
		expect(h2.explored).toBe(h2.expanded);
	});

	it('finds longer solutions with greedy best-first and weighted A*', () => {
		const greedy = runSolver('greedy', SLIDE_START, SLIDE_GOAL);
		const weighted = runSolver('wastar', SLIDE_START, SLIDE_GOAL);
		expect(greedy.length!).toBeGreaterThan(26);
		expect(weighted.length!).toBeGreaterThanOrEqual(26);
		expect(weighted.length!).toBeLessThanOrEqual(52);
	});

	it('solves shallow boards with IDS', () => {
		const run = runSolver('ids', '320415678', SLIDE_GOAL);
		expect(run.outcome).toBe('solved');
		expect(run.length).toBe(4);
		expect(run.depthLimit).toBe(4);
		expect(run.budget).toBe(IDS_NODE_BUDGET);
	});

	it('stops IDS at the node budget', () => {
		const run = runSolver('ids', SLIDE_START, SLIDE_GOAL, { idsBudget: 2000 });
		expect(run.outcome).toBe('limit');
		expect(run.length).toBeNull();
		expect(run.actions).toEqual([]);
		expect(run.generated).toBeGreaterThanOrEqual(2000);
		expect(run.budget).toBe(2000);
		expect(run.depthLimit).toBeGreaterThan(3);
	});

	it('exhausts the reachable states when the goal is unreachable', () => {
		const run = runSolver('astar-h2', SLIDE_GOAL, '012345687');
		expect(run.outcome).toBe('exhausted');
		expect(run.explored).toBe(181_440);
		expect(run.length).toBeNull();
	});
});

describe('handleRequest', () => {
	it('answers with the run or an error', () => {
		const ok = handleRequest({ id: 7, solver: 'astar-h2', start: '102345678', goal: SLIDE_GOAL });
		expect(ok.id).toBe(7);
		expect('run' in ok && ok.run.length).toBe(1);
		const bad = handleRequest({
			id: 8,
			solver: 'nope' as SolverId,
			start: SLIDE_START,
			goal: SLIDE_GOAL
		});
		expect(bad).toEqual({ id: 8, error: 'Unknown solver nope' });
	});
});
