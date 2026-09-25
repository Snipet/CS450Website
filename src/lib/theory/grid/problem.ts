/**
 * Grids as search problems for the shared engine (`theory/search`). States
 * are cell indices; the key is the index as a string and the label is
 * "(column, row)". Successors are listed clockwise from Up (§3.7).
 */
import { search } from '../search/search';
import type { SearchProblem, Successor } from '../search/types';
import type { CellPosition, Grid, GridHeuristic, GridMove, GridProblemOptions } from './types';

/** Heuristics in menu order. */
export const GRID_HEURISTICS: readonly GridHeuristic[] = [
	'manhattan',
	'euclidean',
	'octile',
	'chebyshev',
	'zero'
];

/** Step cost of a diagonal move. */
export const DIAGONAL_COST = Math.SQRT2;

// Column and row offsets, clockwise from Up. Orthogonal moves are the even entries.
const MOVES: readonly { move: GridMove; dc: number; dr: number }[] = [
	{ move: 'Up', dc: 0, dr: -1 },
	{ move: 'Up-Right', dc: 1, dr: -1 },
	{ move: 'Right', dc: 1, dr: 0 },
	{ move: 'Down-Right', dc: 1, dr: 1 },
	{ move: 'Down', dc: 0, dr: 1 },
	{ move: 'Down-Left', dc: -1, dr: 1 },
	{ move: 'Left', dc: -1, dr: 0 },
	{ move: 'Up-Left', dc: -1, dr: -1 }
];

/** Moves in successor order: `Up, Right, Down, Left`, or all eight clockwise from `Up`. */
export function gridMoves(diagonal: boolean): GridMove[] {
	return MOVES.filter((_, i) => diagonal || i % 2 === 0).map((m) => m.move);
}

/** Cell index of `(col, row)`, or -1 outside the grid. */
export function cellAt(grid: Pick<Grid, 'width' | 'height'>, col: number, row: number): number {
	if (!Number.isInteger(col) || !Number.isInteger(row)) return -1;
	if (col < 0 || row < 0 || col >= grid.width || row >= grid.height) return -1;
	return row * grid.width + col;
}

/** `(column, row)` of a cell index. */
export function cellPosition(grid: Pick<Grid, 'width'>, cell: number): CellPosition {
	return { col: cell % grid.width, row: Math.floor(cell / grid.width) };
}

/** "(3, 5)": the cell's column and row. */
export function cellLabel(grid: Pick<Grid, 'width'>, cell: number): string {
	const { col, row } = cellPosition(grid, cell);
	return `(${col}, ${row})`;
}

/** Whether a cell index lies on the grid and is not a wall. */
export function isOpen(grid: Grid, cell: number): boolean {
	return Number.isInteger(cell) && cell >= 0 && cell < grid.walls.length && !grid.walls[cell];
}

/** h for a cell `dx` columns and `dy` rows from the goal (signs are ignored). */
export function heuristicDistance(heuristic: GridHeuristic, dx: number, dy: number): number {
	const x = Math.abs(dx);
	const y = Math.abs(dy);
	switch (heuristic) {
		case 'manhattan':
			return x + y;
		case 'euclidean':
			return Math.sqrt(x * x + y * y);
		case 'octile':
			return Math.max(x, y) + (Math.SQRT2 - 1) * Math.min(x, y);
		case 'chebyshev':
			return Math.max(x, y);
		default:
			return 0;
	}
}

/** h(cell): the heuristic distance from a cell to the grid's goal. */
export function gridHeuristic(grid: Grid, heuristic: GridHeuristic): (cell: number) => number {
	const goal = cellPosition(grid, grid.goal);
	return (cell) => {
		const p = cellPosition(grid, cell);
		return heuristicDistance(heuristic, p.col - goal.col, p.row - goal.row);
	};
}

/**
 * Whether the heuristic never overestimates the true cost on any grid with
 * these moves (Informed Search, slide 25). Every heuristic here is at most the
 * open-grid distance except Manhattan with diagonal moves, which counts a
 * diagonal step (cost √2) as 2.
 */
export function isAdmissible(heuristic: GridHeuristic, diagonal: boolean): boolean {
	return !(diagonal && heuristic === 'manhattan');
}

/** The default heuristic: the exact distance on an open grid. */
export function defaultHeuristic(diagonal: boolean): GridHeuristic {
	return diagonal ? 'octile' : 'manhattan';
}

/**
 * The successor function: every open neighbor of `cell`, clockwise from Up.
 * A diagonal move needs both orthogonal cells it passes open (no corner cutting).
 */
export function gridSuccessors(grid: Grid, cell: number, diagonal = false): Successor<number>[] {
	const { col, row } = cellPosition(grid, cell);
	const open = (c: number, r: number) => {
		const i = cellAt(grid, c, r);
		return i >= 0 && !grid.walls[i];
	};
	const out: Successor<number>[] = [];
	MOVES.forEach(({ move, dc, dr }, i) => {
		const orthogonal = i % 2 === 0;
		if (!orthogonal && !diagonal) return;
		if (!open(col + dc, row + dr)) return;
		if (!orthogonal && !(open(col + dc, row) && open(col, row + dr))) return;
		out.push({
			action: move,
			state: cellAt(grid, col + dc, row + dr),
			cost: orthogonal ? 1 : DIAGONAL_COST
		});
	});
	return out;
}

/**
 * The grid as a search problem: states are cell indices, `key` is the index
 * as a string, `label` is "(column, row)", the goal test is the goal cell,
 * and `h` is the chosen heuristic.
 */
export function gridProblem(grid: Grid, options: GridProblemOptions = {}): SearchProblem<number> {
	const diagonal = options.diagonal ?? false;
	const heuristic = options.heuristic ?? defaultHeuristic(diagonal);
	const cache = new Map<number, readonly Successor<number>[]>();
	const h = gridHeuristic(grid, heuristic);
	return {
		initial: grid.start,
		key: (cell) => String(cell),
		label: (cell) => cellLabel(grid, cell),
		successors(cell) {
			let list = cache.get(cell);
			if (!list) {
				list = gridSuccessors(grid, cell, diagonal);
				cache.set(cell, list);
			}
			return list;
		},
		isGoal: (cell) => cell === grid.goal,
		h
	};
}

/**
 * Cost of the cheapest path from start to goal (uniform-cost graph search),
 * or null when the goal cannot be reached.
 */
export function optimalCost(grid: Grid, options: { diagonal?: boolean } = {}): number | null {
	const result = search(gridProblem(grid, { diagonal: options.diagonal, heuristic: 'zero' }), {
		strategy: 'ucs',
		mode: 'graph',
		record: 'summary',
		...gridSearchLimits(grid)
	});
	return result.solution ? result.solution.cost : null;
}

/** Search limits that never stop a graph search on this grid early. */
export function gridSearchLimits(grid: Pick<Grid, 'width' | 'height'>): {
	maxExpansions: number;
	maxNodes: number;
} {
	const cells = grid.width * grid.height;
	return { maxExpansions: cells + 1, maxNodes: cells * 9 + 1 };
}
