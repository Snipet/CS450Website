import { describe, expect, it } from 'vitest';
import {
	concaveGrid,
	emptyGrid,
	gridProblem,
	gridSearchLimits,
	optimalCost,
	setWalls,
	type Grid
} from '$lib/theory/grid';
import { frontierAfter, search, type StrategyId } from '$lib/theory/search';
import {
	cellLayers,
	cellsBetween,
	cellsPath,
	gridLinesPath,
	isOptimalCost,
	pathPoints,
	runStats,
	runTimeline,
	wallsPath
} from './view';

const run = (grid: Grid, strategy: StrategyId, diagonal = true) =>
	search(gridProblem(grid, { diagonal, heuristic: 'euclidean' }), {
		strategy,
		mode: 'graph',
		record: 'nodes',
		weight: 5,
		...gridSearchLimits(grid)
	});

const cellsOnFrontier = (grid: Grid, r: ReturnType<typeof run>, step: number) =>
	[...new Set(frontierAfter(r, step).map((id) => Number(r.nodes[id].key)))].sort((a, b) => a - b);

describe('runTimeline and cellLayers', () => {
	const grid = concaveGrid();

	it('matches the engine frontier and explored set at every step', () => {
		for (const strategy of ['bfs', 'dfs', 'ucs', 'greedy', 'astar', 'wastar'] as const) {
			for (const diagonal of [false, true]) {
				const r = run(grid, strategy, diagonal);
				const t = runTimeline(r, grid.walls.length);
				expect(t.steps).toBe(r.steps.length);
				for (let s = 0; s < r.steps.length; s += 7) {
					const layers = cellLayers(t, s);
					expect(layers.frontier, `${strategy} ${diagonal} step ${s}`).toEqual(
						cellsOnFrontier(grid, r, s)
					);
					expect(t.frontier[s]).toBe(frontierAfter(r, s).length);
					const explored = r.nodes
						.filter((n) => n.closed !== null && n.closed < s)
						.map((n) => Number(n.key))
						.sort((a, b) => a - b);
					expect(layers.explored[0]).toEqual(explored);
				}
			}
		}
	});

	it('marks the start on the frontier at step 0 and the expanded cell as current', () => {
		const r = run(grid, 'astar');
		const t = runTimeline(r, grid.walls.length);
		expect(cellLayers(t, 0)).toEqual({
			explored: [[]],
			frontier: [grid.start],
			current: null,
			path: null
		});
		const first = cellLayers(t, 1);
		expect(first.current).toBe(grid.start);
		expect(first.frontier).not.toContain(grid.start);
		expect(t.stepCell[0]).toBe(-1);
		expect(t.stepCell[1]).toBe(grid.start);
	});

	it('shows the solution path from the goal step on', () => {
		const r = run(grid, 'astar');
		const t = runTimeline(r, grid.walls.length);
		expect(t.goalStep).toBe(r.steps.length - 1);
		expect(t.path?.[0]).toBe(grid.start);
		expect(t.path?.at(-1)).toBe(grid.goal);
		expect(t.path).toHaveLength(r.solution!.depth + 1);
		expect(cellLayers(t, t.goalStep! - 1).path).toBeNull();
		const last = cellLayers(t, t.goalStep!);
		expect(last.path).toEqual(t.path);
		expect(last.current).toBe(grid.goal);
	});

	it('tracks the largest frontier', () => {
		const r = run(grid, 'ucs');
		const t = runTimeline(r, grid.walls.length);
		expect(t.maxFrontier[t.steps - 1]).toBe(r.stats.maxFrontier);
		for (let s = 1; s < t.steps; s++)
			expect(t.maxFrontier[s]).toBeGreaterThanOrEqual(t.maxFrontier[s - 1]);
	});

	it('groups explored cells by expansion order, most recent last', () => {
		const r = run(grid, 'ucs');
		const t = runTimeline(r, grid.walls.length);
		const s = 200;
		const layers = cellLayers(t, s, 4);
		expect(layers.explored).toHaveLength(4);
		expect(layers.explored.flat().sort((a, b) => a - b)).toEqual(cellLayers(t, s).explored[0]);
		const orderOf = (cell: number) => t.closed[cell];
		expect(Math.max(...layers.explored[0].map(orderOf))).toBeLessThan(
			Math.min(...layers.explored[3].map(orderOf))
		);
	});

	it('clamps the step', () => {
		const r = run(grid, 'bfs');
		const t = runTimeline(r, grid.walls.length);
		expect(cellLayers(t, 99999)).toEqual(cellLayers(t, t.steps - 1));
		expect(cellLayers(t, -3)).toEqual(cellLayers(t, 0));
	});

	it('has no path when the goal cannot be reached', () => {
		const g = setWalls(emptyGrid(3, 3), [1, 4, 5], true); // goal (2, 0) walled off
		const r = run(g, 'bfs');
		const t = runTimeline(r, 9);
		expect(t.goalStep).toBeNull();
		expect(t.path).toBeNull();
		expect(cellLayers(t, t.steps - 1).path).toBeNull();
	});
});

describe('runStats', () => {
	const grid = concaveGrid();

	it('reports counts at a step and the path at the end', () => {
		const r = run(grid, 'astar');
		const t = runTimeline(r, grid.walls.length);
		const mid = runStats(r, t, 10);
		expect(mid.expanded).toBe(r.steps[10].expanded);
		expect(mid.generated).toBe(r.steps[10].generated);
		expect(mid.frontier).toBe(frontierAfter(r, 10).length);
		expect(mid.done).toBe(false);
		expect(mid.path).toBeNull();
		const end = runStats(r, t, t.steps - 1);
		expect(end).toMatchObject({
			expanded: r.stats.expanded,
			generated: r.stats.generated,
			maxFrontier: r.stats.maxFrontier,
			done: true,
			failed: false
		});
		expect(end.path?.moves).toBe(24);
		expect(isOptimalCost(end.path!.cost, optimalCost(grid, { diagonal: true }))).toBe(true);
	});

	it('reports failure', () => {
		const g = setWalls(emptyGrid(3, 3), [1, 4, 5], true);
		const r = run(g, 'bfs');
		const t = runTimeline(r, 9);
		expect(runStats(r, t, t.steps - 1)).toMatchObject({ done: true, failed: true, path: null });
	});
});

describe('isOptimalCost', () => {
	it('allows rounding error', () => {
		expect(isOptimalCost(16 + 8 * Math.SQRT2, 27.313708498984763)).toBe(true);
		expect(isOptimalCost(28.97, 27.31)).toBe(false);
		expect(isOptimalCost(3, null)).toBe(false);
	});
});

describe('SVG geometry', () => {
	it('merges runs of cells in a row into rectangles', () => {
		// 4 columns: cells 1, 2, 3 in row 0, cell 4 starts row 1, cell 6 alone.
		expect(cellsPath([1, 2, 3, 4, 6], 4)).toBe('M1 0h3v1h-3zM0 1h1v1h-1zM2 1h1v1h-1z');
		expect(cellsPath([], 4)).toBe('');
	});

	it('draws walls and grid lines', () => {
		expect(wallsPath([false, true, true, false], 2)).toBe('M1 0h1v1h-1zM0 1h1v1h-1z');
		expect(gridLinesPath(2, 3)).toBe('M1 0V3M0 1H2M0 2H2');
	});

	it('lists cell centers for the path line', () => {
		expect(pathPoints([0, 1, 5], 4)).toBe('0.5,0.5 1.5,0.5 1.5,1.5');
	});

	it('cellsBetween fills straight and diagonal strokes', () => {
		expect(cellsBetween(0, 3, 10)).toEqual([0, 1, 2, 3]);
		expect(cellsBetween(0, 22, 10)).toEqual([0, 11, 22]);
		expect(cellsBetween(5, 5, 10)).toEqual([5]);
		expect(cellsBetween(21, 0, 10)).toEqual([21, 10, 0]);
	});
});
