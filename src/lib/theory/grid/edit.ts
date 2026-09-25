/**
 * Pure grid edits: every function returns a new grid and leaves its input
 * unchanged. Edits that would put a wall on the start or goal, or put the
 * start and goal on the same cell, return the grid unchanged.
 */
import { cellAt, cellPosition } from './problem';
import type { Grid } from './types';

/**
 * A grid with no walls, start in the lower left and goal in the upper right
 * (a fifth of the way in from each side, as on Informed Search slide 23).
 */
export function emptyGrid(width: number, height: number): Grid {
	const w = Math.max(1, Math.floor(width));
	const h = Math.max(1, Math.floor(height));
	const insetC = Math.floor(w / 5);
	const insetR = Math.floor(h / 5);
	const start = cellAt({ width: w, height: h }, insetC, h - 1 - insetR);
	let goal = cellAt({ width: w, height: h }, w - 1 - insetC, insetR);
	if (goal === start) goal = start === w * h - 1 ? 0 : w * h - 1;
	return { width: w, height: h, walls: new Array<boolean>(w * h).fill(false), start, goal };
}

const inGrid = (grid: Grid, cell: number) =>
	Number.isInteger(cell) && cell >= 0 && cell < grid.width * grid.height;

/** Sets or clears a wall. The start and goal cells cannot become walls. */
export function setWall(grid: Grid, cell: number, wall: boolean): Grid {
	if (!inGrid(grid, cell) || grid.walls[cell] === wall) return grid;
	if (wall && (cell === grid.start || cell === grid.goal)) return grid;
	const walls = grid.walls.slice();
	walls[cell] = wall;
	return { ...grid, walls };
}

/** Sets several cells at once (skipping the start and goal). */
export function setWalls(grid: Grid, cells: Iterable<number>, wall: boolean): Grid {
	let walls: boolean[] | null = null;
	for (const cell of cells) {
		if (!inGrid(grid, cell) || grid.walls[cell] === wall) continue;
		if (wall && (cell === grid.start || cell === grid.goal)) continue;
		walls ??= grid.walls.slice();
		walls[cell] = wall;
	}
	return walls ? { ...grid, walls } : grid;
}

/** Turns a wall into an open cell or an open cell into a wall. */
export function toggleWall(grid: Grid, cell: number): Grid {
	return inGrid(grid, cell) ? setWall(grid, cell, !grid.walls[cell]) : grid;
}

/** Moves the start to `cell`, clearing a wall there. Not onto the goal. */
export function placeStart(grid: Grid, cell: number): Grid {
	if (!inGrid(grid, cell) || cell === grid.goal || cell === grid.start) return grid;
	const cleared = setWall(grid, cell, false);
	return { ...cleared, start: cell };
}

/** Moves the goal to `cell`, clearing a wall there. Not onto the start. */
export function placeGoal(grid: Grid, cell: number): Grid {
	if (!inGrid(grid, cell) || cell === grid.start || cell === grid.goal) return grid;
	const cleared = setWall(grid, cell, false);
	return { ...cleared, goal: cell };
}

/** Removes every wall. */
export function clearWalls(grid: Grid): Grid {
	if (!grid.walls.some(Boolean)) return grid;
	return { ...grid, walls: new Array<boolean>(grid.walls.length).fill(false) };
}

/** Number of walls. */
export function wallCount(grid: Grid): number {
	let n = 0;
	for (const w of grid.walls) if (w) n++;
	return n;
}

/**
 * The same layout at another size: each new cell copies the old cell under
 * its center (nearest neighbor), and the start and goal move to the cells
 * under their old centers. Walls under the start or goal are cleared; if both
 * land on one cell, the goal moves to the nearest other cell.
 */
export function resizeGrid(grid: Grid, width: number, height: number): Grid {
	const w = Math.max(1, Math.floor(width));
	const h = Math.max(1, Math.floor(height));
	if (w === grid.width && h === grid.height) return grid;
	const walls = new Array<boolean>(w * h);
	for (let r = 0; r < h; r++) {
		const oldR = Math.min(grid.height - 1, Math.floor(((r + 0.5) * grid.height) / h));
		for (let c = 0; c < w; c++) {
			const oldC = Math.min(grid.width - 1, Math.floor(((c + 0.5) * grid.width) / w));
			walls[r * w + c] = grid.walls[oldR * grid.width + oldC] ?? false;
		}
	}
	const map = (cell: number) => {
		const p = cellPosition(grid, cell);
		const c = Math.min(w - 1, Math.floor(((p.col + 0.5) * w) / grid.width));
		const r = Math.min(h - 1, Math.floor(((p.row + 0.5) * h) / grid.height));
		return r * w + c;
	};
	const start = map(grid.start);
	let goal = map(grid.goal);
	if (goal === start) goal = nearestOther({ width: w, height: h }, start);
	walls[start] = false;
	if (goal >= 0) walls[goal] = false;
	return { width: w, height: h, walls, start, goal };
}

/** The closest cell to `cell` other than itself (by Chebyshev ring, clockwise from Up). */
function nearestOther(size: { width: number; height: number }, cell: number): number {
	const { col, row } = cellPosition(size, cell);
	const maxRing = Math.max(size.width, size.height);
	for (let ring = 1; ring <= maxRing; ring++) {
		for (const [dc, dr] of [
			[0, -ring],
			[ring, 0],
			[0, ring],
			[-ring, 0],
			[ring, -ring],
			[ring, ring],
			[-ring, ring],
			[-ring, -ring]
		]) {
			const i = cellAt(size, col + dc, row + dr);
			if (i >= 0) return i;
		}
	}
	return cell;
}
