import { describe, expect, it } from 'vitest';
import {
	BINARY_TREE_PROBLEM,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	graphProblem,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import { search, type SearchOptions, type StrategyId } from '$lib/theory/search';
import {
	clampStep,
	countStatuses,
	currentNode,
	exploredAfter,
	frontierOrder,
	graphHighlightAt,
	iterationAt,
	iterationNodes,
	labelsByKey,
	solutionPathAt,
	statusesAt
} from './tree-view';

const run = (spec: GraphProblemSpec, options: SearchOptions) => search(graphProblem(spec), options);
const byLabel = (r: ReturnType<typeof run>, statuses: Map<number, string>, status: string) =>
	[...statuses].filter(([, s]) => s === status).map(([id]) => r.nodes[id].label);

describe('steps and iterations', () => {
	it('clampStep and iterationAt', () => {
		const r = run(BINARY_TREE_PROBLEM, { strategy: 'ids' });
		expect(clampStep(r, -3)).toBe(0);
		expect(clampStep(r, 1e9)).toBe(r.steps.length - 1);
		expect(clampStep(r, NaN)).toBe(0);
		expect(clampStep(r, 2.7)).toBe(2);
		expect(iterationAt(r, 0)).toBe(0);
		expect(iterationAt(r, 3)).toBe(1);
		expect(iterationAt(r, r.steps.length - 1)).toBe(3);
		const empty = run(TINY_PROBLEM, { strategy: 'bfs', record: 'summary' });
		expect(clampStep(empty, 5)).toBe(0);
		expect(iterationAt(empty, 5)).toBe(0);
	});

	it('iterationNodes keeps one iteration and caps by id', () => {
		const r = run(BINARY_TREE_PROBLEM, { strategy: 'ids' });
		const last = iterationNodes(r, 3);
		// The search stops at M, so G's children N and O are never generated.
		expect(last.total).toBe(13);
		expect(last.nodes.map((n) => n.label).join('')).toBe('ABCDEHIJKFGLM');
		const capped = iterationNodes(r, 3, 4);
		expect(capped.nodes.map((n) => n.label)).toEqual(['A', 'B', 'C', 'D']);
		expect(capped.total).toBe(13);
		expect(iterationNodes(r, 1).nodes.map((n) => n.label)).toEqual(['A', 'B', 'C']);
	});

	it('currentNode and solutionPathAt', () => {
		const r = run(ROMANIA_PROBLEM, { strategy: 'astar' });
		expect(currentNode(r, 0)).toBeNull();
		expect(r.nodes[currentNode(r, 2)!].label).toBe('Sibiu');
		expect(solutionPathAt(r, 2).size).toBe(0);
		const path = [...solutionPathAt(r, r.steps.length - 1)].map((id) => r.nodes[id].label);
		expect(path).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']);
		const fail = run(TINY_PROBLEM, { strategy: 'bfs', maxExpansions: 2 });
		expect(currentNode(fail, fail.steps.length - 1)).toBeNull();
		expect(currentNode(fail, 99)).toBeNull();
	});

	it('labelsByKey', () => {
		const r = run(ROMANIA_PROBLEM, { strategy: 'astar' });
		expect(labelsByKey(r).get('Rimnicu Vilcea')).toBe('Rimnicu Vilcea');
	});
});

describe('frontier and explored set', () => {
	it('rebuilds the exact pop order for traces recorded without snapshots', () => {
		const strategies: StrategyId[] = ['bfs', 'dfs', 'ids', 'ucs', 'greedy', 'astar', 'wastar'];
		for (const strategy of strategies) {
			for (const mode of ['tree', 'graph', 'path'] as const) {
				for (const spec of [ROMANIA_PROBLEM, TINY_PROBLEM]) {
					const o: SearchOptions = { strategy, mode, maxExpansions: 60 };
					const full = run(spec, o);
					const bare = run(spec, { ...o, record: 'nodes' });
					full.steps.forEach((step, i) => {
						expect(frontierOrder(bare, i), `${strategy}/${mode} step ${i}`).toEqual(step.frontier);
						expect(frontierOrder(full, i)).toBe(step.frontier);
						if (mode === 'graph') {
							expect(exploredAfter(bare, i), `${strategy}/${mode} step ${i}`).toEqual(
								step.explored
							);
						}
					});
				}
			}
		}
	});

	it('explored set only in graph search; empty outside the trace', () => {
		const tree = run(ROMANIA_PROBLEM, { strategy: 'ucs' });
		expect(exploredAfter(tree, 3)).toEqual([]);
		const graph = run(ROMANIA_PROBLEM, { strategy: 'ucs', mode: 'graph' });
		expect(exploredAfter(graph, 3)).toEqual(['Arad', 'Zerind', 'Timisoara']);
		expect(exploredAfter(graph, 99)).toEqual([]);
		expect(frontierOrder(graph, 99)).toEqual([]);
	});
});

describe('statusesAt', () => {
	it('A* on Romania: current, frontier, expanded, and the goal with its path', () => {
		const r = run(ROMANIA_PROBLEM, { strategy: 'astar' });
		const at2 = statusesAt(r, 2);
		expect(byLabel(r, at2, 'current')).toEqual(['Sibiu']);
		expect(byLabel(r, at2, 'expanded')).toEqual(['Arad']);
		expect(byLabel(r, at2, 'frontier').sort()).toEqual([
			'Arad',
			'Fagaras',
			'Oradea',
			'Rimnicu Vilcea',
			'Timisoara',
			'Zerind'
		]);
		// Nodes created later are hidden.
		expect(at2.size).toBe(8);
		const last = statusesAt(r, r.steps.length - 1);
		expect(byLabel(r, last, 'goal')).toEqual(['Bucharest']);
		expect(countStatuses(last)).toEqual({ expanded: 5, frontier: 10, goal: 1 });
	});

	it('UCS graph search: dropped and replaced nodes', () => {
		const r = run(ROMANIA_PROBLEM, { strategy: 'ucs', mode: 'graph' });
		const at10 = statusesAt(r, 10);
		const dropped = [...at10].filter(([, s]) => s === 'dropped').map(([id]) => r.nodes[id]);
		expect(dropped.map((n) => `${n.label}:${n.outcome}`)).toContain('Oradea:frontier');
		expect(dropped.map((n) => `${n.label}:${n.outcome}`)).toContain('Arad:explored');
		const replaced = [...at10].filter(([, s]) => s === 'replaced').map(([id]) => r.nodes[id]);
		expect(replaced.map((n) => `${n.label} ${n.g}`)).toEqual(['Bucharest 450']);
		// One step earlier the costlier Bucharest is still on the frontier.
		const before = statusesAt(r, 9);
		expect(before.get(replaced[0].id)).toBe('frontier');
	});

	it('IDS: nodes at the limit are cut off; each iteration starts over', () => {
		const r = run(BINARY_TREE_PROBLEM, { strategy: 'ids' });
		// Step 6: limit 1, C is cut off (taken off the frontier, not expanded); B was cut off before.
		const at6 = statusesAt(r, 6);
		expect(r.steps[6].kind).toBe('cutoff');
		expect(currentNode(r, 6)).not.toBeNull();
		expect(byLabel(r, at6, 'current')).toEqual([]);
		expect(byLabel(r, at6, 'cutoff')).toEqual(['B', 'C']);
		expect(byLabel(r, at6, 'expanded')).toEqual(['A']);
		// Step 8 starts limit 2 with a fresh root on the frontier.
		const at8 = statusesAt(r, 8);
		expect([...at8.values()]).toEqual(['frontier']);
		// A fail step has no current node.
		expect(byLabel(r, statusesAt(r, 7), 'current')).toEqual([]);
	});

	it('goal found at generation', () => {
		const r = run(TINY_PROBLEM, { strategy: 'bfs', goalTest: 'generate' });
		const last = statusesAt(r, r.steps.length - 1);
		expect(byLabel(r, last, 'goal')).toEqual(['G']);
		expect(statusesAt(r, 99).size).toBe(0);
	});

	it('a start state that is a goal, tested when generated, is never on the frontier', () => {
		for (const record of ['full', 'nodes'] as const) {
			const r = run(
				{ ...TINY_PROBLEM, start: 'G' },
				{ strategy: 'bfs', goalTest: 'generate', record }
			);
			expect(r.steps.map((s) => s.kind)).toEqual(['init', 'goal']);
			expect(frontierOrder(r, 1)).toEqual([]);
			expect(byLabel(r, statusesAt(r, 1), 'goal')).toEqual(['G']);
			expect(graphHighlightAt(r, 1)).toMatchObject({ frontier: [], path: ['G'] });
		}
	});

	it('nodes left over after a limit stop', () => {
		const r = run(TINY_PROBLEM, { strategy: 'bfs', maxExpansions: 2 });
		const counts = countStatuses(statusesAt(r, r.steps.length - 1));
		expect(counts).toEqual({ expanded: 2, frontier: 5 });
	});
});

describe('graphHighlightAt', () => {
	it('mirrors a step on the state graph', () => {
		const r = run(ROMANIA_PROBLEM, { strategy: 'ucs', mode: 'graph' });
		const h = graphHighlightAt(r, 4);
		expect(h.current).toBe('Sibiu');
		expect(h.explored).toEqual(['Arad', 'Zerind', 'Timisoara', 'Sibiu']);
		expect(h.dropped).toEqual(['Arad', 'Oradea']);
		expect(h.frontier).toEqual(['Oradea', 'Rimnicu Vilcea', 'Lugoj', 'Fagaras']);
		expect(h.path).toEqual([]);
		const end = graphHighlightAt(r, r.steps.length - 1);
		expect(end.path).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']);
		// The goal node is taken off the frontier but not expanded.
		expect(end.current).toBeUndefined();
		expect(graphHighlightAt(r, 0)).toEqual({
			current: undefined,
			frontier: ['Arad'],
			explored: [],
			path: [],
			dropped: [],
			cutoff: []
		});
		expect(graphHighlightAt(r, 99)).toEqual({
			frontier: [],
			explored: [],
			path: [],
			dropped: [],
			cutoff: []
		});
	});

	it('a state cut off at the depth limit is neither being expanded nor dropped', () => {
		const r = run(BINARY_TREE_PROBLEM, { strategy: 'ids' });
		// Step 5: limit 1, B is taken off the frontier and cut off.
		expect(r.steps[5].kind).toBe('cutoff');
		const h = graphHighlightAt(r, 5);
		expect(h.current).toBeUndefined();
		expect(h.cutoff).toEqual(['B']);
		expect(h.dropped).toEqual([]);
		expect(h.frontier).toEqual(['C']);
		// The next expand step has no cut-off state.
		expect(graphHighlightAt(r, 9)).toMatchObject({ current: 'A', cutoff: [] });
	});

	it('tree search lists expanded states as explored, once each', () => {
		const r = run(TINY_PROBLEM, { strategy: 'bfs' });
		const h = graphHighlightAt(r, 8);
		expect(h.explored).toEqual(['S', 'd', 'e', 'p', 'b', 'c', 'h']);
		expect(h.frontier).toEqual(
			['r', 'q', 'a', 'h', 'r', 'p', 'q'].filter((v, i, a) => a.indexOf(v) === i)
		);
	});
});
