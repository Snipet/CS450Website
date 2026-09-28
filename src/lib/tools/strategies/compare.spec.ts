import { describe, expect, it } from 'vitest';
import {
	ASTAR_WRONG_PROBLEM,
	BINARY_TREE_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import { search } from '$lib/theory/search';
import {
	COMPARED_STRATEGIES,
	NODE_LIMIT,
	comparisonSummary,
	compareStrategies,
	costGap,
	formatCost,
	isBestCost,
	isFewestExpanded,
	isInformed,
	orderText,
	orderTokens,
	outcomeDetail,
	outcomeOf,
	outcomeText,
	pathText,
	previewOrder,
	rowOf,
	runStrategy,
	type CompareSettings,
	type ComparedStrategy,
	type Comparison
} from './compare';

const TREE: CompareSettings = { mode: 'tree', alpha: 2, limit: 1000 };
const row = (c: Comparison, s: ComparedStrategy) => c.rows.find((r) => r.strategy === s)!;

describe('compareStrategies', () => {
	it('runs the seven strategies in lecture order', () => {
		const c = compareStrategies(TINY_PROBLEM, TREE);
		expect(c.rows.map((r) => r.strategy)).toEqual([
			'bfs',
			'dfs',
			'ids',
			'ucs',
			'greedy',
			'astar',
			'wastar'
		]);
		expect(COMPARED_STRATEGIES).toHaveLength(7);
	});

	it('tiny search problem: UCS and A* with h = 0 cost 10, BFS costs 14 (Uninformed Search, slides 39, 41)', () => {
		const c = compareStrategies(TINY_PROBLEM, TREE);
		expect(c.hasHeuristic).toBe(false);
		expect(c.optimalCost).toBe(10);
		expect(c.optimalPath).toEqual(['S', 'd', 'e', 'r', 'f', 'G']);
		expect(row(c, 'bfs')).toMatchObject({
			cost: 14,
			cheapest: false,
			path: ['S', 'e', 'r', 'f', 'G']
		});
		expect(row(c, 'ucs')).toMatchObject({ cost: 10, cheapest: true });
		expect(row(c, 'astar')).toMatchObject({ cost: 10, cheapest: true });
		// The slide traces.
		expect(row(c, 'bfs').order.join(',')).toBe('S,d,e,p,b,c,e,h,r,q,a,a,h,r,p,q,f,p,q,f,q,c,G');
		expect(row(c, 'ucs').order.join(',')).toBe('S,p,d,b,e,a,r,f,e,G');
		// With h = 0, greedy ties go first-in first-out: BFS order.
		expect(row(c, 'greedy').order).toEqual(row(c, 'bfs').order);
		expect(c.bestCost).toBe(10);
	});

	it('greedy trap: greedy costs 6, A* 3 (Informed Search, slide 15)', () => {
		const c = compareStrategies(GREEDY_TRAP_PROBLEM, TREE);
		expect(row(c, 'greedy')).toMatchObject({ cost: 6, cheapest: false });
		expect(row(c, 'astar')).toMatchObject({ cost: 3, cheapest: true });
		expect(row(c, 'greedy').path).toEqual(['S', 'B1', 'B2', 'B3', 'B4', 'B5', 'G']);
	});

	it('A* gone wrong: graph search returns 6, tree search 5 (Informed Search, slides 27–29)', () => {
		expect(
			row(compareStrategies(ASTAR_WRONG_PROBLEM, { ...TREE, mode: 'graph' }), 'astar').cost
		).toBe(6);
		expect(row(compareStrategies(ASTAR_WRONG_PROBLEM, TREE), 'astar').cost).toBe(5);
	});

	it('Romania tree search: DFS loops until the limit, UCS and A* find 418', () => {
		const c = compareStrategies(ROMANIA_PROBLEM, TREE);
		const dfs = row(c, 'dfs');
		expect(dfs.outcome).toBe('limit');
		expect(dfs.popped).toBe(1000);
		expect(dfs.order.slice(0, 4)).toEqual(['Arad', 'Sibiu', 'Arad', 'Sibiu']);
		expect(dfs.path).toBeNull();
		expect(dfs.cost).toBeNull();
		expect(dfs.cheapest).toBeNull();
		for (const s of ['ucs', 'astar'] as const)
			expect(row(c, s)).toMatchObject({ cost: 418, cheapest: true });
		for (const s of ['bfs', 'ids', 'greedy', 'wastar'] as const) expect(row(c, s).cost).toBe(450);
		expect(row(c, 'greedy').order).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
		expect(row(c, 'astar').order).toEqual([
			'Arad',
			'Sibiu',
			'Rimnicu Vilcea',
			'Fagaras',
			'Pitesti',
			'Bucharest'
		]);
		expect(c.bestCost).toBe(418);
		expect(c.fewestExpanded).toBe(3);
		expect(isFewestExpanded(c, row(c, 'greedy'))).toBe(true);
		expect(isFewestExpanded(c, row(c, 'wastar'))).toBe(true);
		expect(isFewestExpanded(c, row(c, 'dfs'))).toBe(false);
		expect(isBestCost(c, row(c, 'ucs'))).toBe(true);
		expect(isBestCost(c, row(c, 'bfs'))).toBe(false);
		expect(isBestCost(c, dfs)).toBe(false);
	});

	it('Romania with a path check: DFS returns Arad → Sibiu → Fagaras → Bucharest (Uninformed Search, slide 32)', () => {
		const dfs = row(compareStrategies(ROMANIA_PROBLEM, { ...TREE, mode: 'path' }), 'dfs');
		expect(dfs.outcome).toBe('found');
		expect(dfs.path).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
	});

	it('Iasi to Fagaras: greedy tree search loops; a path check fixes it (Informed Search, slide 12)', () => {
		const tree = compareStrategies(ROMANIA_IASI_FAGARAS, TREE);
		expect(row(tree, 'greedy').outcome).toBe('limit');
		expect(row(tree, 'greedy').order.slice(0, 4)).toEqual(['Iasi', 'Neamt', 'Iasi', 'Neamt']);
		expect(row(tree, 'dfs').outcome).toBe('limit');
		for (const mode of ['path', 'graph'] as const) {
			const c = compareStrategies(ROMANIA_IASI_FAGARAS, { ...TREE, mode });
			expect(row(c, 'greedy').outcome).toBe('found');
			expect(row(c, 'dfs').outcome).toBe('found');
		}
	});

	it('IDS binary tree: iterations A | ABC | ABDECFG | ABDHIEJKCFLM; UCS follows BFS order', () => {
		const c = compareStrategies(BINARY_TREE_PROBLEM, TREE);
		const ids = row(c, 'ids');
		expect(ids.iterations?.map((it) => it.join(''))).toEqual([
			'A',
			'ABC',
			'ABDECFG',
			'ABDHIEJKCFLM'
		]);
		expect(ids.depthLimit).toBe(3);
		expect(row(c, 'ucs').order).toEqual(row(c, 'bfs').order);
		expect(row(c, 'bfs').order.join('')).toBe('ABCDEFGHIJKLM');
		expect(row(c, 'bfs').iterations).toBeNull();
	});

	it('weighted A* uses α', () => {
		const a1 = row(compareStrategies(ROMANIA_PROBLEM, { ...TREE, alpha: 1 }), 'wastar');
		const a2 = row(compareStrategies(ROMANIA_PROBLEM, TREE), 'wastar');
		expect(a1.cost).toBe(418);
		expect(a2.cost).toBe(450);
	});

	it('reports no solution when no goal is reachable', () => {
		const spec: GraphProblemSpec = {
			graph: {
				directed: true,
				nodes: [{ id: 'S' }, { id: 'A' }, { id: 'G' }],
				edges: [{ from: 'S', to: 'A', cost: 1 }]
			},
			start: 'S',
			goals: ['G']
		};
		const c = compareStrategies(spec, TREE);
		expect(c.optimalCost).toBeNull();
		expect(c.optimalPath).toBeNull();
		expect(c.bestCost).toBeNull();
		expect(c.fewestExpanded).toBeNull();
		expect(row(c, 'bfs').outcome).toBe('none');
		expect(row(c, 'ids').outcome).toBe('none');
		expect(c.rows.every((r) => r.cheapest === null)).toBe(true);
	});

	it('IDS is cut off when the goal is deeper than its largest limit', () => {
		const r = rowOf('ids', runStrategy(BINARY_TREE_PROBLEM, 'ids', { ...TREE, idsMaxDepth: 2 }), 3);
		expect(r.outcome).toBe('cutoff');
		expect(r.depthLimit).toBe(2);
	});

	it('stops at the node limit', () => {
		const result = runStrategy(ROMANIA_PROBLEM, 'dfs', { ...TREE, maxNodes: 50 });
		expect(outcomeOf(result)).toBe('limit');
		expect(result.stats.generated).toBeLessThanOrEqual(50 + 4);
	});
});

describe('outcomeOf', () => {
	it('maps the engine result', () => {
		const found = search(
			{ initial: 1, key: String, successors: () => [], isGoal: () => true },
			{
				strategy: 'bfs'
			}
		);
		expect(outcomeOf(found)).toBe('found');
		const none = search(
			{ initial: 1, key: String, successors: () => [], isGoal: () => false },
			{
				strategy: 'bfs'
			}
		);
		expect(outcomeOf(none)).toBe('none');
	});
});

describe('text', () => {
	it('names outcomes', () => {
		expect(outcomeText('found')).toBe('Found');
		expect(outcomeText('none')).toBe('No solution');
		expect(outcomeText('limit')).toBe('Stopped at the limit');
		expect(outcomeText('cutoff')).toBe('Cut off');
	});

	it('explains outcomes', () => {
		const c = compareStrategies(ROMANIA_PROBLEM, TREE);
		expect(outcomeDetail(row(c, 'dfs'), TREE)).toBe(
			'Stopped after taking 1,000 nodes off the frontier.'
		);
		expect(outcomeDetail(row(c, 'bfs'), TREE)).toBe('Returned a solution.');
		const nodes = rowOf('dfs', runStrategy(ROMANIA_PROBLEM, 'dfs', { ...TREE, maxNodes: 50 }), 418);
		expect(outcomeDetail(nodes, { ...TREE, maxNodes: 50 })).toBe(
			'Stopped after generating 50 nodes.'
		);
		const cut = rowOf(
			'ids',
			runStrategy(BINARY_TREE_PROBLEM, 'ids', { ...TREE, idsMaxDepth: 2 }),
			3
		);
		expect(outcomeDetail(cut, TREE)).toBe(
			'Every depth limit up to 2 cut nodes off without reaching a goal.'
		);
		expect(outcomeDetail({ ...cut, outcome: 'none' }, TREE)).toMatch(/no solution/);
		expect(NODE_LIMIT).toBe(50_000);
	});

	it('writes the expansion order with IDS iterations separated by |', () => {
		expect(orderText(orderTokens({ order: ['S', 'd', 'e'], iterations: null }))).toBe('S, d, e');
		const ids = orderTokens({
			order: ['A', 'A', 'B', 'C'],
			iterations: [['A'], ['A', 'B', 'C']]
		});
		expect(ids).toEqual([
			{ kind: 'state', label: 'A' },
			{ kind: 'limit' },
			{ kind: 'state', label: 'A' },
			{ kind: 'state', label: 'B' },
			{ kind: 'state', label: 'C' }
		]);
		expect(orderText(ids)).toBe('A | A, B, C');
		expect(orderText([])).toBe('');
	});

	it('previews the first states of an order', () => {
		const tokens = orderTokens({ order: [], iterations: [['A'], ['A', 'B', 'C'], ['A', 'B']] });
		const p = previewOrder(tokens, 3);
		expect(orderText(p.shown)).toBe('A | A, B');
		expect(p.hidden).toBe(3);
		expect(previewOrder(tokens, 6)).toEqual({ shown: tokens, hidden: 0 });
		expect(previewOrder(tokens, 0).shown).toEqual([]);
	});

	it('sums up a comparison', () => {
		const name = (s: ComparedStrategy) => s.toUpperCase();
		expect(comparisonSummary(compareStrategies(ROMANIA_PROBLEM, TREE), name)).toBe(
			'Lowest cost found: 418 (UCS, ASTAR). Fewest nodes expanded: 3 (GREEDY, WASTAR). No solution returned: DFS.'
		);
		const spec: GraphProblemSpec = {
			graph: { directed: true, nodes: [{ id: 'S' }, { id: 'G' }], edges: [] },
			start: 'S',
			goals: ['G']
		};
		expect(comparisonSummary(compareStrategies(spec, TREE), name)).toBe(
			'No strategy found a solution.'
		);
	});

	it('formats costs and paths', () => {
		expect(formatCost(418)).toBe('418');
		expect(formatCost(2.345)).toBe('2.35');
		expect(costGap(450, 418)).toBe('+32');
		expect(costGap(1.5, 1)).toBe('+0.5');
		expect(pathText(['Arad', 'Sibiu'])).toBe('Arad → Sibiu');
	});

	it('knows which strategies read h(n)', () => {
		expect(COMPARED_STRATEGIES.filter(isInformed)).toEqual(['greedy', 'astar', 'wastar']);
	});
});
