import { describe, expect, it } from 'vitest';
import { checkHeuristic, graphProblem, parseGraphText } from '$lib/theory/graphs';
import { seededRandom } from '$lib/theory/games';
import { search } from '$lib/theory/search';
import {
	DRILL_STRATEGIES,
	checkOrder,
	consistentHeuristic,
	drillGraphText,
	hasPriorityTie,
	parseOrder,
	randomLayeredProblem,
	searchDrill
} from './search-drill';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

describe('randomLayeredProblem', () => {
	it('builds directed acyclic graphs from S to G where every state is reachable', () => {
		const rand = seededRandom(3);
		for (let k = 0; k < 200; k++) {
			const spec = randomLayeredProblem(rand);
			expect(spec.graph.directed).toBe(true);
			expect(spec.start).toBe('S');
			expect(spec.goals).toEqual(['G']);
			const ids = spec.graph.nodes.map((n) => n.id);
			expect(new Set(ids).size).toBe(ids.length);
			// Edges go left to right in the drawing, so there are no cycles.
			const x = new Map(spec.graph.nodes.map((n) => [n.id, n.x!]));
			for (const e of spec.graph.edges) {
				expect(x.get(e.to)!).toBeGreaterThan(x.get(e.from)!);
				expect(e.cost).toBeGreaterThanOrEqual(1);
				expect(e.cost).toBeLessThanOrEqual(9);
			}
			const r = search(graphProblem(spec), { strategy: 'bfs', mode: 'graph', record: 'summary' });
			expect(r.solution).not.toBeNull();
			const reached = new Set(r.nodes.map((n) => n.key));
			for (const id of ids) if (id !== 'G') expect(reached.has(id)).toBe(true);
		}
	});
});

describe('consistentHeuristic', () => {
	it('is consistent, admissible, and 0 at the goal', () => {
		const rand = seededRandom(11);
		for (let k = 0; k < 200; k++) {
			const spec = randomLayeredProblem(rand);
			const h = consistentHeuristic(spec, rand);
			const report = checkHeuristic(spec, h);
			expect(report.consistent).toBe(true);
			expect(report.admissible).toBe(true);
			expect(h.G).toBe(0);
		}
	});
});

describe('searchDrill', () => {
	it('is reproducible from its settings', () => {
		const a = searchDrill({ strategy: 'astar', mode: 'tree', seed: 5 });
		const b = searchDrill({ strategy: 'astar', mode: 'tree', seed: 5 });
		expect(drillGraphText(a)).toBe(drillGraphText(b));
		expect(a.order).toEqual(b.order);
		expect(drillGraphText(searchDrill({ strategy: 'astar', mode: 'tree', seed: 6 }))).not.toBe(
			drillGraphText(a)
		);
	});

	it('gives problems of a workable size with the engine’s expansion order', () => {
		for (const strategy of DRILL_STRATEGIES) {
			for (const mode of ['tree', 'graph'] as const) {
				for (const seed of SEEDS) {
					const d = searchDrill({ strategy, mode, seed });
					expect(d.order.length).toBeGreaterThan(1);
					expect(d.order.length).toBeLessThanOrEqual(30);
					expect(d.order[0]).toBe('S');
					if (strategy !== 'dls') {
						expect(d.result.solution).not.toBeNull();
						expect(d.order.at(-1)).toBe('G');
					}
					if (strategy === 'ucs' || strategy === 'greedy' || strategy === 'astar')
						expect(hasPriorityTie(d.result)).toBe(false);
					if (strategy === 'greedy' || strategy === 'astar') {
						expect(d.spec.h).toBeDefined();
						expect(checkHeuristic(d.spec).consistent).toBe(true);
					} else expect(d.spec.h).toBeUndefined();
					const again = search(graphProblem(d.spec), {
						strategy,
						mode,
						depthLimit: strategy === 'dls' ? d.depthLimit : undefined
					});
					expect(again.order).toEqual(d.order);
					expect(d.iterations.flatMap((it) => it.order)).toEqual(d.order);
				}
			}
		}
	});

	it('splits iterative deepening by depth limit', () => {
		const d = searchDrill({ strategy: 'ids', mode: 'tree', seed: 2 });
		expect(d.iterations.map((it) => it.limit)).toEqual(d.iterations.map((_, i) => i));
		expect(d.iterations[0].order).toEqual(['S']);
	});

	it('round-trips its graph text through the parser', () => {
		const d = searchDrill({ strategy: 'greedy', mode: 'graph', seed: 9 });
		const { spec, diagnostics } = parseGraphText(drillGraphText(d));
		expect(diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
		expect(spec).toEqual(d.spec);
	});
});

describe('parseOrder', () => {
	const names = ['S', 'A', 'B', 'G'];
	it('reads names separated by spaces, commas, arrows and bars, ignoring case', () => {
		expect(parseOrder('s a b g', names)).toEqual({ states: ['S', 'A', 'B', 'G'], unknown: [] });
		expect(parseOrder('S, A, B, G', names).states).toEqual(['S', 'A', 'B', 'G']);
		expect(parseOrder('S → A -> B - G', names).states).toEqual(['S', 'A', 'B', 'G']);
		expect(parseOrder('(S) | S A | S A B', names).states).toEqual(['S', 'S', 'A', 'S', 'A', 'B']);
		expect(parseOrder('  ', names)).toEqual({ states: [], unknown: [] });
	});

	it('reports tokens that are not state names', () => {
		expect(parseOrder('S X A 2', names)).toEqual({ states: ['S', 'A'], unknown: ['X', '2'] });
	});
});

describe('checkOrder', () => {
	const expected = ['S', 'A', 'B', 'G'];
	const typed = (states: string[], unknown: string[] = []) => ({ states, unknown });
	it('accepts the exact order', () => {
		expect(checkOrder(expected, typed(['S', 'A', 'B', 'G']))).toEqual({
			kind: 'correct',
			length: 4
		});
	});
	it('says how much of a wrong order is right without the rest', () => {
		expect(checkOrder(expected, typed(['S', 'B']))).toEqual({ kind: 'wrong', matched: 1 });
		expect(checkOrder(expected, typed(['S', 'A']))).toEqual({
			kind: 'short',
			matched: 2,
			length: 4
		});
		expect(checkOrder(expected, typed(['S', 'A', 'B', 'G', 'G']))).toEqual({
			kind: 'long',
			length: 4
		});
	});
	it('reports empty answers and unknown names first', () => {
		expect(checkOrder(expected, typed([]))).toEqual({ kind: 'empty' });
		expect(checkOrder(expected, typed(['S'], ['Q']))).toEqual({ kind: 'unknown', tokens: ['Q'] });
	});
});
