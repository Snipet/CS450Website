import { describe, expect, it } from 'vitest';
import { search } from '../search/search';
import type { SearchProblem, StrategyId } from '../search/types';
import { emptyGrid, setWalls } from './edit';
import { GRID_PRESETS, GRID_SIZES, concaveGrid, gridPreset, seededRandom } from './presets';
import {
	DIAGONAL_COST,
	GRID_HEURISTICS,
	cellAt,
	cellLabel,
	cellPosition,
	defaultHeuristic,
	gridHeuristic,
	gridMoves,
	gridProblem,
	gridSearchLimits,
	gridSuccessors,
	heuristicDistance,
	isAdmissible,
	isOpen,
	optimalCost
} from './problem';
import type { Grid, GridHeuristic } from './types';

const SQ2 = Math.SQRT2;

/** True cost from every cell to the goal (moves are symmetric, so search out from the goal). */
function costsToGoal(grid: Grid, diagonal: boolean): Map<number, number> {
	const base = gridProblem({ ...grid, start: grid.goal }, { diagonal, heuristic: 'zero' });
	const everywhere: SearchProblem<number> = { ...base, isGoal: () => false };
	const r = search(everywhere, {
		strategy: 'ucs',
		mode: 'graph',
		record: 'summary',
		...gridSearchLimits(grid)
	});
	const out = new Map<number, number>();
	for (const n of r.nodes) if (n.closed !== null) out.set(Number(n.key), n.g);
	return out;
}

const run = (
	grid: Grid,
	strategy: StrategyId,
	diagonal: boolean,
	heuristic: GridHeuristic,
	weight = 2
) =>
	search(gridProblem(grid, { diagonal, heuristic }), {
		strategy,
		mode: 'graph',
		record: 'nodes',
		weight,
		...gridSearchLimits(grid)
	});

const everyPreset = Object.entries(GRID_SIZES).flatMap(([size, { width, height }]) =>
	GRID_PRESETS.map((p) => ({ name: `${p.id} ${size}`, grid: gridPreset(p.id, width, height) }))
);

describe('cells', () => {
	const g = emptyGrid(5, 4);

	it('numbers cells row by row from the top-left', () => {
		expect(cellAt(g, 0, 0)).toBe(0);
		expect(cellAt(g, 4, 0)).toBe(4);
		expect(cellAt(g, 2, 3)).toBe(17);
		expect(cellPosition(g, 17)).toEqual({ col: 2, row: 3 });
		expect(cellLabel(g, 17)).toBe('(2, 3)');
	});

	it('returns -1 outside the grid', () => {
		expect(cellAt(g, -1, 0)).toBe(-1);
		expect(cellAt(g, 5, 0)).toBe(-1);
		expect(cellAt(g, 0, 4)).toBe(-1);
		expect(cellAt(g, 1.5, 0)).toBe(-1);
	});

	it('isOpen is false for walls and cells off the grid', () => {
		const w = setWalls(g, [6], true);
		expect(isOpen(w, 6)).toBe(false);
		expect(isOpen(w, 7)).toBe(true);
		expect(isOpen(w, -1)).toBe(false);
		expect(isOpen(w, 20)).toBe(false);
	});
});

describe('moves', () => {
	it('lists moves clockwise from Up', () => {
		expect(gridMoves(false)).toEqual(['Up', 'Right', 'Down', 'Left']);
		expect(gridMoves(true)).toEqual([
			'Up',
			'Up-Right',
			'Right',
			'Down-Right',
			'Down',
			'Down-Left',
			'Left',
			'Up-Left'
		]);
	});

	// 3 × 3 grid; the center is cell 4. Walls go anywhere (the start and goal are not involved).
	const g = emptyGrid(3, 3);
	const withWalls = (grid: Grid, cells: number[]): Grid => ({
		...grid,
		walls: grid.walls.map((w, i) => w || cells.includes(i))
	});
	const succ = (grid: Grid, cell: number, diagonal: boolean) =>
		gridSuccessors(grid, cell, diagonal).map((s) => [s.action, s.state, s.cost]);

	it('4-connected: Up, Right, Down, Left at cost 1', () => {
		expect(succ(g, 4, false)).toEqual([
			['Up', 1, 1],
			['Right', 5, 1],
			['Down', 7, 1],
			['Left', 3, 1]
		]);
	});

	it('8-connected: clockwise from Up, diagonals at cost √2', () => {
		expect(succ(g, 4, true)).toEqual([
			['Up', 1, 1],
			['Up-Right', 2, SQ2],
			['Right', 5, 1],
			['Down-Right', 8, SQ2],
			['Down', 7, 1],
			['Down-Left', 6, SQ2],
			['Left', 3, 1],
			['Up-Left', 0, SQ2]
		]);
		expect(DIAGONAL_COST).toBe(SQ2);
	});

	it('stays on the grid', () => {
		expect(succ(g, 0, true).map((s) => s[0])).toEqual(['Right', 'Down-Right', 'Down']);
		expect(succ(g, 8, false).map((s) => s[0])).toEqual(['Up', 'Left']);
	});

	it('does not enter walls', () => {
		expect(succ(withWalls(g, [2]), 4, true).map((s) => s[0])).toEqual([
			'Up',
			'Right',
			'Down-Right',
			'Down',
			'Down-Left',
			'Left',
			'Up-Left'
		]);
	});

	it('does not cut corners: a diagonal needs both orthogonal cells open', () => {
		// A wall above the center blocks Up, Up-Right and Up-Left.
		expect(succ(withWalls(g, [1]), 4, true).map((s) => s[0])).toEqual([
			'Right',
			'Down-Right',
			'Down',
			'Down-Left',
			'Left'
		]);
		// A wall to the right blocks Right, Up-Right and Down-Right.
		expect(succ(withWalls(g, [5]), 4, true).map((s) => s[0])).toEqual([
			'Up',
			'Down',
			'Down-Left',
			'Left',
			'Up-Left'
		]);
		// Squeezing between two diagonal walls is not allowed either.
		const squeeze = { ...withWalls(emptyGrid(2, 2), [1, 2]), start: 0, goal: 3 };
		expect(succ(squeeze, 0, true)).toEqual([]);
	});
});

describe('heuristics', () => {
	it('computes each distance for dx = 3, dy = 4', () => {
		expect(heuristicDistance('manhattan', 3, 4)).toBe(7);
		expect(heuristicDistance('euclidean', 3, 4)).toBe(5);
		expect(heuristicDistance('octile', 3, 4)).toBeCloseTo(4 + 3 * (SQ2 - 1), 12);
		expect(heuristicDistance('chebyshev', 3, 4)).toBe(4);
		expect(heuristicDistance('zero', 3, 4)).toBe(0);
	});

	it('ignores signs', () => {
		for (const h of GRID_HEURISTICS)
			expect(heuristicDistance(h, -3, 4)).toBe(heuristicDistance(h, 3, -4));
	});

	it('measures from a cell to the goal', () => {
		const g = concaveGrid();
		// Start (7, 18), goal (23, 2): 16 columns and 16 rows apart.
		expect(gridHeuristic(g, 'euclidean')(g.start)).toBeCloseTo(16 * SQ2, 12);
		expect(gridHeuristic(g, 'manhattan')(g.start)).toBe(32);
		expect(gridHeuristic(g, 'octile')(g.start)).toBeCloseTo(16 * SQ2, 12);
		expect(gridHeuristic(g, 'chebyshev')(g.start)).toBe(16);
		expect(gridHeuristic(g, 'euclidean')(g.goal)).toBe(0);
	});

	it('lists five heuristics; the default is the open-grid distance', () => {
		expect(GRID_HEURISTICS).toEqual(['manhattan', 'euclidean', 'octile', 'chebyshev', 'zero']);
		expect(defaultHeuristic(false)).toBe('manhattan');
		expect(defaultHeuristic(true)).toBe('octile');
	});

	it('isAdmissible matches h(n) ≤ h*(n) on every preset', () => {
		for (const diagonal of [false, true]) {
			for (const heuristic of GRID_HEURISTICS) {
				let overestimates = false;
				for (const { grid } of everyPreset) {
					const h = gridHeuristic(grid, heuristic);
					for (const [cell, cost] of costsToGoal(grid, diagonal))
						if (h(cell) > cost + 1e-9) overestimates = true;
				}
				expect(isAdmissible(heuristic, diagonal), `${heuristic} ${diagonal}`).toBe(!overestimates);
			}
		}
	});
});

describe('gridProblem', () => {
	const g = concaveGrid();

	it('describes states by index, key and label', () => {
		const p = gridProblem(g, { diagonal: true, heuristic: 'euclidean' });
		expect(p.initial).toBe(g.start);
		expect(p.key(g.start)).toBe(String(g.start));
		expect(p.label?.(g.start)).toBe('(7, 18)');
		expect(p.isGoal(g.goal)).toBe(true);
		expect(p.isGoal(g.start)).toBe(false);
		expect(p.h?.(g.start)).toBeCloseTo(16 * SQ2, 12);
		expect(p.successors(g.start)).toBe(p.successors(g.start));
		expect(p.successors(g.start).map((s) => s.action)).toHaveLength(8);
	});

	it('defaults to 4-connected moves with Manhattan distance', () => {
		const p = gridProblem(g);
		expect(p.successors(g.start).map((s) => s.action)).toEqual(['Up', 'Right', 'Down', 'Left']);
		expect(p.h?.(g.start)).toBe(32);
		expect(gridProblem(g, { diagonal: true }).h?.(g.start)).toBeCloseTo(16 * SQ2, 12);
	});

	it('limits never stop a graph search early', () => {
		expect(gridSearchLimits({ width: 32, height: 22 })).toEqual({
			maxExpansions: 705,
			maxNodes: 6337
		});
	});
});

describe('optimalCost', () => {
	it('is the uniform-cost path cost on the slide grid', () => {
		expect(optimalCost(concaveGrid())).toBe(32);
		expect(optimalCost(concaveGrid(), { diagonal: true })).toBeCloseTo(16 + 8 * SQ2, 9);
	});

	it('is null when the goal is walled off', () => {
		const g = emptyGrid(5, 5);
		const { col, row } = cellPosition(g, g.goal);
		const around: number[] = [];
		for (let dr = -1; dr <= 1; dr++)
			for (let dc = -1; dc <= 1; dc++) around.push(cellAt(g, col + dc, row + dr));
		const walled = setWalls(g, around, true);
		expect(optimalCost(walled)).toBeNull();
		expect(optimalCost(walled, { diagonal: true })).toBeNull();
	});
});

describe('strategies on the presets (graph search)', () => {
	const admissible = (diagonal: boolean) =>
		GRID_HEURISTICS.filter((h) => isAdmissible(h, diagonal));

	it('A* finds the uniform-cost path cost with every admissible heuristic', () => {
		for (const { name, grid } of everyPreset) {
			for (const diagonal of [false, true]) {
				const best = optimalCost(grid, { diagonal });
				expect(best, name).not.toBeNull();
				expect(run(grid, 'ucs', diagonal, 'zero').solution?.cost).toBeCloseTo(best!, 9);
				for (const h of admissible(diagonal)) {
					const r = run(grid, 'astar', diagonal, h);
					expect(r.solution?.cost, `${name} ${diagonal} ${h}`).toBeCloseTo(best!, 9);
				}
			}
		}
	});

	it('BFS finds the optimal cost with 4-connected moves (all steps cost 1)', () => {
		for (const { name, grid } of everyPreset) {
			expect(run(grid, 'bfs', false, 'zero').solution?.cost, name).toBe(optimalCost(grid));
		}
	});

	it('weighted A* stays within α times the optimal cost', () => {
		for (const { name, grid } of everyPreset) {
			for (const diagonal of [false, true]) {
				const best = optimalCost(grid, { diagonal })!;
				for (const weight of [1.5, 2, 5]) {
					for (const h of admissible(diagonal)) {
						const cost = run(grid, 'wastar', diagonal, h, weight).solution!.cost;
						expect(cost, `${name} ${diagonal} ${h} α=${weight}`).toBeLessThanOrEqual(
							weight * best + 1e-9
						);
					}
				}
			}
		}
	});

	it('weighted A* (α = 5, Euclidean) expands fewer cells than A* on the slide grid (slides 39–40)', () => {
		const g = concaveGrid();
		const weighted = run(g, 'wastar', true, 'euclidean', 5);
		const exact = run(g, 'astar', true, 'euclidean');
		expect(weighted.stats.expanded).toBeLessThan(exact.stats.expanded / 2);
		expect(weighted.solution!.cost).toBeGreaterThan(exact.solution!.cost);
	});

	it('A* expands fewer cells than UCS on the slide grid (slide 24)', () => {
		const g = concaveGrid();
		for (const diagonal of [false, true]) {
			const ucs = run(g, 'ucs', diagonal, 'zero');
			const astar = run(g, 'astar', diagonal, 'euclidean');
			expect(astar.stats.expanded).toBeLessThan(ucs.stats.expanded * 0.6);
		}
	});

	it('greedy best-first is not optimal on the concave obstacle', () => {
		for (const [w, h] of [
			[16, 11],
			[32, 22],
			[60, 40]
		]) {
			const g = concaveGrid(w, h);
			for (const diagonal of [false, true]) {
				const greedy = run(g, 'greedy', diagonal, 'euclidean');
				expect(greedy.solution!.cost).toBeGreaterThan(optimalCost(g, { diagonal })! + 1e-9);
			}
		}
		// 32 × 22, 4-connected: greedy walks into the pocket and pays 40 instead of 32.
		expect(run(concaveGrid(), 'greedy', false, 'euclidean').solution!.cost).toBe(40);
	});

	it('expands each cell at most once', () => {
		const g = concaveGrid();
		for (const s of ['bfs', 'dfs', 'ucs', 'greedy', 'astar', 'wastar'] as const) {
			const r = run(g, s, true, 'euclidean');
			const closed = r.nodes.filter((n) => n.closed !== null).map((n) => n.key);
			expect(new Set(closed).size, s).toBe(closed.length);
		}
	});
	it('A* with an admissible heuristic matches uniform-cost search on random grids', () => {
		const random = seededRandom(99);
		const int = (n: number) => Math.floor(random() * n);
		for (let k = 0; k < 150; k++) {
			const width = 2 + int(14);
			const height = 1 + int(12);
			const density = random() * 0.6;
			const walls = Array.from({ length: width * height }, () => random() < density);
			const start = int(width * height);
			const goal = (start + 1 + int(width * height - 1)) % (width * height);
			walls[start] = walls[goal] = false;
			const g: Grid = { width, height, walls, start, goal };
			for (const diagonal of [false, true]) {
				const best = optimalCost(g, { diagonal });
				for (const heuristic of GRID_HEURISTICS) {
					const cost = run(g, 'astar', diagonal, heuristic).solution?.cost ?? null;
					if (best === null) expect(cost).toBeNull();
					else if (isAdmissible(heuristic, diagonal)) expect(cost).toBeCloseTo(best, 9);
					else expect(cost).toBeGreaterThanOrEqual(best - 1e-9);
				}
				if (!diagonal) expect(run(g, 'bfs', false, 'zero').solution?.cost ?? null).toBe(best);
			}
		}
	});
});
