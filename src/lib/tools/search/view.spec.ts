import { describe, expect, it } from 'vitest';
import {
	BINARY_TREE_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	graphProblem
} from '$lib/theory/graphs';
import { search } from '$lib/theory/search';
import { NODE_LIMIT, defaultSearchState, settingsOf } from './state';
import {
	iterationRows,
	missingHeuristic,
	optimality,
	orderProgress,
	popCounts,
	problemFacts,
	resolveAnnotation,
	runSearch,
	searchOptions,
	stoppedBy
} from './view';

const settings = settingsOf(defaultSearchState());

describe('searchOptions and runSearch', () => {
	it('passes the settings the strategy uses, records steps without snapshots', () => {
		expect(searchOptions({ ...settings, strategy: 'bfs' })).toEqual({
			strategy: 'bfs',
			mode: 'tree',
			goalTest: 'expand',
			maxExpansions: 500,
			maxNodes: NODE_LIMIT,
			record: 'nodes'
		});
		expect(searchOptions({ ...settings, strategy: 'ids', depthLimit: 7 })).toMatchObject({
			depthLimit: 7
		});
		expect(searchOptions({ ...settings, strategy: 'dls', depthLimit: 2 })).toMatchObject({
			depthLimit: 2
		});
		expect(searchOptions({ ...settings, strategy: 'wastar', weight: 3 })).toMatchObject({
			weight: 3
		});
		expect(searchOptions({ ...settings, strategy: 'astar', weight: 3 })).not.toHaveProperty(
			'weight'
		);
	});

	it('runs the search on the graph with the chosen successor order', () => {
		const r = runSearch(TINY_PROBLEM, { ...settings, strategy: 'bfs' });
		expect(r.order.join(',')).toBe('S,d,e,p,b,c,e,h,r,q,a,a,h,r,p,q,f,p,q,f,q,c,G');
		expect(r.steps.every((s) => s.frontier === undefined)).toBe(true);
		// With the edges reversed, S's successors are listed as p, e, d.
		const listed = runSearch(
			{
				...TINY_PROBLEM,
				graph: { ...TINY_PROBLEM.graph, edges: [...TINY_PROBLEM.graph.edges].reverse() }
			},
			{ ...settings, strategy: 'bfs', order: 'listed' }
		);
		expect(listed.order.slice(0, 4)).toEqual(['S', 'p', 'e', 'd']);
	});
});

describe('resolveAnnotation', () => {
	it('uses what the slides draw for the strategy on auto', () => {
		expect(resolveAnnotation('auto', 'astar')).toBe('fgh');
		expect(resolveAnnotation('auto', 'ucs')).toBe('g');
		expect(resolveAnnotation('auto', 'greedy')).toBe('h');
		expect(resolveAnnotation('auto', 'bfs')).toBe('none');
		expect(resolveAnnotation('g', 'astar')).toBe('g');
	});
});

describe('expansion order progress', () => {
	const r = search(graphProblem(TINY_PROBLEM), { strategy: 'ucs' });
	const pops = popCounts(r);

	it('counts the nodes taken off the frontier after each step', () => {
		expect(pops).toHaveLength(r.steps.length);
		expect(pops[0]).toBe(0);
		expect(pops.at(-1)).toBe(r.order.length);
		for (let i = 1; i < pops.length; i++) expect(pops[i] - pops[i - 1]).toBeLessThanOrEqual(1);
	});

	it('marks the node taken off at the step', () => {
		expect(orderProgress(pops, 0)).toEqual({ taken: 0, current: null });
		expect(orderProgress(pops, 1)).toEqual({ taken: 1, current: 0 });
		expect(orderProgress(pops, 3)).toEqual({ taken: 3, current: 2 });
		const last = r.steps.length - 1;
		expect(orderProgress(pops, last)).toEqual({ taken: 10, current: 9 });
		expect(orderProgress(pops, 999)).toEqual({ taken: 10, current: 9 });
		expect(orderProgress([], 3)).toEqual({ taken: 0, current: null });
	});

	it('does not count a goal found when generated', () => {
		const g = search(graphProblem(TINY_PROBLEM), { strategy: 'bfs', goalTest: 'generate' });
		const p = popCounts(g);
		expect(p.at(-1)).toBe(g.order.length);
		expect(orderProgress(p, g.steps.length - 1).current).toBeNull();
	});
});

describe('iterationRows', () => {
	const r = search(graphProblem(BINARY_TREE_PROBLEM), { strategy: 'ids' });
	const pops = popCounts(r);

	it('lists each depth limit with its order and outcome', () => {
		const rows = iterationRows(r, pops, r.steps.length - 1);
		expect(rows.map((x) => [x.limit, x.order.join(''), x.outcome])).toEqual([
			[0, 'A', 'cutoff'],
			[1, 'ABC', 'cutoff'],
			[2, 'ABDECFG', 'cutoff'],
			[3, 'ABDHIEJKCFLM', 'found']
		]);
		expect(rows.map((x) => x.status)).toEqual(['done', 'done', 'done', 'current']);
		expect(rows[3]).toMatchObject({ taken: 12, current: 11 });
	});

	it('tracks progress inside the current iteration', () => {
		const it2 = r.iterations[2];
		const atInit = iterationRows(r, pops, it2.firstStep);
		expect(atInit.map((x) => x.status)).toEqual(['done', 'done', 'current', 'later']);
		expect(atInit[2]).toMatchObject({ taken: 0, current: null });
		expect(atInit[3]).toMatchObject({ taken: 0, current: null });
		const next = iterationRows(r, pops, it2.firstStep + 2);
		expect(next[2]).toMatchObject({ taken: 2, current: 1 });
	});

	it('marks an iteration stopped by the expansion limit', () => {
		const limited = search(graphProblem(BINARY_TREE_PROBLEM), {
			strategy: 'ids',
			maxExpansions: 8
		});
		const rows = iterationRows(limited, popCounts(limited), limited.steps.length - 1);
		expect(rows.at(-1)?.outcome).toBe('limit');
		expect(stoppedBy(limited)).toBe('expansions');
	});

	it('is empty for strategies without depth limits', () => {
		expect(iterationRows(search(graphProblem(TINY_PROBLEM), { strategy: 'bfs' }), [], 0)).toEqual(
			[]
		);
	});
});

describe('problemFacts', () => {
	it('summarizes the problem and names the heuristic', () => {
		expect(problemFacts(ROMANIA_PROBLEM)).toEqual({
			start: 'Arad',
			goals: ['Bucharest'],
			states: 20,
			edges: 23,
			directed: false,
			hCount: 20,
			hText: 'Straight-line distance to Bucharest'
		});
		expect(problemFacts(TINY_PROBLEM)).toMatchObject({
			directed: true,
			hCount: 0,
			hText: 'None (h = 0 for every state)'
		});
		expect(problemFacts({ ...TINY_PROBLEM, h: { S: 4, d: 2 } }).hText).toBe(
			'Given for 2 of 12 states'
		);
	});

	it('flags informed strategies on graphs without h values', () => {
		expect(missingHeuristic('astar', TINY_PROBLEM)).toBe(true);
		expect(missingHeuristic('bfs', TINY_PROBLEM)).toBe(false);
		expect(missingHeuristic('greedy', ROMANIA_PROBLEM)).toBe(false);
		expect(missingHeuristic('wastar', { ...TINY_PROBLEM, h: {} })).toBe(true);
	});
});

describe('optimality and limits', () => {
	it('compares the solution with the cheapest path', () => {
		const astar = search(graphProblem(ROMANIA_PROBLEM), { strategy: 'astar' });
		expect(optimality(astar, ROMANIA_PROBLEM)).toMatchObject({
			cost: 418,
			cheapest: true,
			text: 'This is a cheapest path (cost 418).'
		});
		const greedy = search(graphProblem(GREEDY_TRAP_PROBLEM), { strategy: 'greedy' });
		expect(optimality(greedy, GREEDY_TRAP_PROBLEM)).toMatchObject({
			cost: 6,
			cheapest: false,
			text: 'This is not a cheapest path: S → T1 → T2 → G (cost 3) costs less.'
		});
	});

	it('describes runs without a solution', () => {
		const loop = search(graphProblem(ROMANIA_PROBLEM), { strategy: 'dfs', maxExpansions: 20 });
		expect(optimality(loop, ROMANIA_PROBLEM)).toMatchObject({
			cost: null,
			cheapest: null,
			text: 'The cheapest path is Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418).'
		});
		expect(stoppedBy(loop)).toBe('expansions');
		const island = { ...TINY_PROBLEM, goals: ['S'], start: 'G' };
		const none = search(graphProblem(island), { strategy: 'bfs' });
		expect(none.failure).toBe('exhausted');
		expect(stoppedBy(none)).toBeNull();
		expect(optimality(none, island).text).toBe('No goal state can be reached from G.');
		const nodes = search(graphProblem(ROMANIA_PROBLEM), { strategy: 'bfs', maxNodes: 10 });
		expect(stoppedBy(nodes)).toBe('nodes');
	});
});
