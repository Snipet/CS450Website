/**
 * Grid path finding (docs/ARCHITECTURE.md §3.7 and §4.4).
 *
 * A grid is `width × height` cells, numbered row by row from the top-left:
 * cell = row · width + column. Cells are written `(column, row)`. Walls block;
 * every other cell is a state. A move goes to a neighboring cell: 4-connected
 * (Up, Right, Down, Left, step cost 1) or 8-connected (plus the diagonals,
 * step cost √2, never cutting a wall corner).
 */

export interface Grid {
	width: number;
	height: number;
	/** `walls[cell]` is true when the cell is blocked; length `width · height`. */
	walls: boolean[];
	/** Start cell index. */
	start: number;
	/** Goal cell index. */
	goal: number;
}

/**
 * h(n) for a cell `dx` columns and `dy` rows from the goal:
 * - `manhattan` |dx| + |dy|
 * - `euclidean` √(dx² + dy²)
 * - `octile` max(|dx|, |dy|) + (√2 − 1)·min(|dx|, |dy|)
 * - `chebyshev` max(|dx|, |dy|)
 * - `zero` 0
 */
export type GridHeuristic = 'manhattan' | 'euclidean' | 'octile' | 'chebyshev' | 'zero';

/** Move names in successor order (clockwise from Up). */
export type GridMove =
	'Up' | 'Up-Right' | 'Right' | 'Down-Right' | 'Down' | 'Down-Left' | 'Left' | 'Up-Left';

export interface GridProblemOptions {
	/** 8-connected moves (diagonal step cost √2). Default false (4-connected). */
	diagonal?: boolean;
	/** Default: `octile` with diagonal moves, `manhattan` without (the open-grid distance). */
	heuristic?: GridHeuristic;
}

/** A cell as `(column, row)` from the top-left. */
export interface CellPosition {
	col: number;
	row: number;
}

/** Largest width or height `decodeGrid` accepts. */
export const MAX_GRID_SIDE = 100;
