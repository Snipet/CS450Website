import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import {
	GRID_SIZES,
	gridPreset,
	gridProblem,
	gridSearchLimits,
	isAdmissible,
	optimalCost
} from '$lib/theory/grid';
import { search } from '$lib/theory/search';
import { GRID_TOOL_PRESETS } from './presets';
import { GRID_ALGORITHMS, MAX_WEIGHT, MIN_WEIGHT } from './state';

const byId = (id: string) => GRID_TOOL_PRESETS.find((p) => p.id === id)!.value;

function costOf(id: string, which: 'algorithm' | 'compare') {
	const s = byId(id);
	const grid = gridPreset(s.layout, 32, 22);
	const r = search(gridProblem(grid, { diagonal: s.diagonal, heuristic: s.heuristic }), {
		strategy: s[which]!,
		mode: 'graph',
		record: 'summary',
		weight: s.weight,
		...gridSearchLimits(grid)
	});
	return { cost: r.solution!.cost, expanded: r.stats.expanded, best: optimalCost(grid, s) };
}

describe('grid tool presets', () => {
	it('have unique ids, valid settings, and slide citations', () => {
		const ids = GRID_TOOL_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of GRID_TOOL_PRESETS) {
			expect(GRID_ALGORITHMS).toContain(p.value.algorithm);
			if (p.value.compare) expect(GRID_ALGORITHMS).toContain(p.value.compare);
			expect(p.value.weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
			expect(p.value.weight).toBeLessThanOrEqual(MAX_WEIGHT);
			expect(isAdmissible(p.value.heuristic, p.value.diagonal), p.id).toBe(true);
			expect(p.cite, p.id).toBeDefined();
			const slides = decks[p.cite!.deck].slides;
			const [a, b] =
				typeof p.cite!.slide === 'number' ? [p.cite!.slide, p.cite!.slide] : p.cite!.slide!;
			expect(a).toBeGreaterThanOrEqual(1);
			expect(b).toBeLessThanOrEqual(slides);
			for (const { width, height } of Object.values(GRID_SIZES))
				expect(optimalCost(gridPreset(p.value.layout, width, height), p.value)).not.toBeNull();
		}
	});

	it('slide 24: A* expands far fewer cells than UCS for the same cost', () => {
		const ucs = costOf('ucs-vs-astar', 'algorithm');
		const astar = costOf('ucs-vs-astar', 'compare');
		expect(astar.cost).toBeCloseTo(ucs.cost, 9);
		expect(astar.expanded).toBeLessThan(ucs.expanded / 2);
	});

	it('slides 39–40: weighted A* (α = 5) expands fewer cells for a costlier path', () => {
		expect(byId('wastar-vs-astar')).toMatchObject({ weight: 5, heuristic: 'euclidean' });
		const weighted = costOf('wastar-vs-astar', 'algorithm');
		const exact = costOf('wastar-vs-astar', 'compare');
		expect(weighted.expanded).toBeLessThan(exact.expanded);
		expect(weighted.cost).toBeGreaterThan(exact.cost);
		expect(weighted.cost).toBeLessThanOrEqual(5 * exact.best!);
	});

	it('greedy returns a costlier path than A* on the concave obstacle and the wall with a gap', () => {
		for (const id of ['greedy-vs-astar', 'greedy-wall-gap']) {
			const greedy = costOf(id, 'algorithm');
			expect(greedy.cost, id).toBeGreaterThan(greedy.best! + 1e-9);
			expect(costOf(id, 'compare').cost).toBeCloseTo(greedy.best!, 9);
		}
	});

	it('uninformed slide 39: BFS finds fewer steps but a costlier path than UCS with diagonals', () => {
		const bfs = costOf('bfs-vs-ucs-diagonal', 'algorithm');
		const ucs = costOf('bfs-vs-ucs-diagonal', 'compare');
		expect(bfs.cost).toBeGreaterThan(ucs.cost);
		expect(ucs.cost).toBeCloseTo(ucs.best!, 9);
	});

	it('maze: BFS is optimal with 4-connected moves; DFS is not', () => {
		const bfs = costOf('bfs-vs-dfs-maze', 'algorithm');
		const dfs = costOf('bfs-vs-dfs-maze', 'compare');
		expect(bfs.cost).toBe(bfs.best);
		expect(dfs.cost).toBeGreaterThan(bfs.cost);
	});
});
