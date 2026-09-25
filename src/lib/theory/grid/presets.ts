/**
 * Example grids. Every layout can be built at any size and is deterministic:
 * the random ones (maze, scattered obstacles) take a seed.
 *
 * The concave obstacle reproduces Informed Search slides 23–24 and 39–40 on
 * a 32 × 22 grid: start in the lower left, goal in the upper right, and a
 * ¬-shaped wall between them whose open side faces the start.
 */
import { clearWalls, emptyGrid, resizeGrid } from './edit';
import { cellAt, cellPosition, gridSuccessors } from './problem';
import type { Grid } from './types';

export type GridPresetId = 'concave' | 'open' | 'wall-gap' | 'maze' | 'scattered';

export type GridSizeId = 'small' | 'medium' | 'large';

/** Grid sizes offered by the editor (columns × rows). */
export const GRID_SIZES: Record<GridSizeId, { width: number; height: number }> = {
	small: { width: 16, height: 11 },
	medium: { width: 32, height: 22 },
	large: { width: 60, height: 40 }
};

/** The size id of a width × height, or null for other sizes. */
export function gridSizeId(width: number, height: number): GridSizeId | null {
	for (const [id, s] of Object.entries(GRID_SIZES) as [
		GridSizeId,
		{ width: number; height: number }
	][])
		if (s.width === width && s.height === height) return id;
	return null;
}

export const GRID_PRESETS: readonly {
	id: GridPresetId;
	label: string;
	description: string;
	/** Whether the layout depends on a seed. */
	random: boolean;
}[] = [
	{
		id: 'concave',
		label: 'Concave obstacle',
		description: 'A ¬-shaped wall between a start in the lower left and a goal in the upper right.',
		random: false
	},
	{
		id: 'open',
		label: 'Open field',
		description: 'No walls; start in the lower left, goal in the upper right.',
		random: false
	},
	{
		id: 'wall-gap',
		label: 'Wall with a gap',
		description: 'A wall across the middle with one opening near the top.',
		random: false
	},
	{
		id: 'maze',
		label: 'Maze',
		description: 'Corridors one cell wide with a few loops.',
		random: true
	},
	{
		id: 'scattered',
		label: 'Scattered obstacles',
		description: 'Walls on about 30% of the cells at random.',
		random: true
	}
];

/** Default seeds for the random layouts. */
export const DEFAULT_SEEDS: Record<'maze' | 'scattered', number> = { maze: 450, scattered: 7 };

/**
 * Seeded pseudo-random numbers in [0, 1) (mulberry32). The same seed always
 * gives the same sequence.
 */
export function seededRandom(seed: number): () => number {
	let a = Math.trunc(seed) >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function fillRect(grid: Grid, c0: number, r0: number, c1: number, r1: number): void {
	for (let r = r0; r <= r1; r++)
		for (let c = c0; c <= c1; c++) {
			const i = cellAt(grid, c, r);
			if (i >= 0) grid.walls[i] = true;
		}
}

/** The slide layout at 32 × 22: start (7, 18), goal (23, 2), walls in rows 6–7 (columns 10–19) and columns 18–19 (rows 8–12). */
function concave32(): Grid {
	const grid = emptyGrid(32, 22);
	grid.start = cellAt(grid, 7, 18);
	grid.goal = cellAt(grid, 23, 2);
	fillRect(grid, 10, 6, 19, 7);
	fillRect(grid, 18, 8, 19, 12);
	return grid;
}

/** The concave obstacle of Informed Search slides 23–24 and 39–40, scaled to the size. */
export function concaveGrid(width = 32, height = 22): Grid {
	return resizeGrid(concave32(), width, height);
}

/** An empty grid (start lower left, goal upper right). */
export function openGrid(width = 32, height = 22): Grid {
	return emptyGrid(width, height);
}

/** A wall down the middle column with a gap near the top; start and goal on either side. */
export function wallGapGrid(width = 32, height = 22): Grid {
	const grid = emptyGrid(width, height);
	const w = grid.width;
	const h = grid.height;
	const mid = Math.floor(h / 2);
	grid.start = cellAt(grid, Math.round(w * 0.2), mid);
	grid.goal = cellAt(grid, w - 1 - Math.round(w * 0.2), mid);
	const col = Math.floor(w / 2);
	const gapHeight = Math.max(1, Math.round(h / 10));
	const gapTop = Math.min(h - gapHeight, Math.round(h * 0.12));
	for (let r = 0; r < h; r++) {
		if (r >= gapTop && r < gapTop + gapHeight) continue;
		const i = cellAt(grid, col, r);
		if (i !== grid.start && i !== grid.goal) grid.walls[i] = true;
	}
	return grid;
}

/**
 * A maze: a depth-first (recursive backtracker) spanning tree on the cells at
 * even columns and rows, plus loops where about a tenth of the remaining
 * walls between two corridor cells are removed. Start at the bottom-left
 * corridor cell, goal at the top-right one.
 */
export function mazeGrid(width = 32, height = 22, seed: number = DEFAULT_SEEDS.maze): Grid {
	const grid = emptyGrid(width, height);
	const w = grid.width;
	const h = grid.height;
	const rand = seededRandom(seed);
	grid.walls.fill(true);
	const cols = Math.ceil(w / 2);
	const rows = Math.ceil(h / 2);
	const at = (i: number, j: number) => cellAt(grid, 2 * i, 2 * j);
	const visited = new Array<boolean>(cols * rows).fill(false);
	const stack: [number, number][] = [[0, rows - 1]];
	visited[(rows - 1) * cols] = true;
	grid.walls[at(0, rows - 1)] = false;
	const dirs = [
		[0, -1],
		[1, 0],
		[0, 1],
		[-1, 0]
	];
	while (stack.length) {
		const [i, j] = stack[stack.length - 1];
		const options = dirs.filter(([di, dj]) => {
			const ni = i + di;
			const nj = j + dj;
			return ni >= 0 && nj >= 0 && ni < cols && nj < rows && !visited[nj * cols + ni];
		});
		if (!options.length) {
			stack.pop();
			continue;
		}
		const [di, dj] = options[Math.floor(rand() * options.length)];
		const ni = i + di;
		const nj = j + dj;
		visited[nj * cols + ni] = true;
		grid.walls[cellAt(grid, 2 * i + di, 2 * j + dj)] = false;
		grid.walls[at(ni, nj)] = false;
		stack.push([ni, nj]);
	}
	// Loops: walls with corridor cells on both sides (left–right or above–below).
	const between: number[] = [];
	for (let r = 0; r < h; r++)
		for (let c = 0; c < w; c++) {
			const i = cellAt(grid, c, r);
			if (!grid.walls[i] || (r % 2 === 1 && c % 2 === 1) || (r % 2 === 0 && c % 2 === 0)) continue;
			const horizontal = r % 2 === 0;
			const a = horizontal ? cellAt(grid, c - 1, r) : cellAt(grid, c, r - 1);
			const b = horizontal ? cellAt(grid, c + 1, r) : cellAt(grid, c, r + 1);
			if (a >= 0 && b >= 0 && !grid.walls[a] && !grid.walls[b]) between.push(i);
		}
	const loops = Math.round(between.length * 0.1);
	for (let k = 0; k < loops && between.length; k++) {
		const pick = Math.floor(rand() * between.length);
		grid.walls[between[pick]] = false;
		between.splice(pick, 1);
	}
	grid.start = at(0, rows - 1);
	grid.goal = at(cols - 1, 0);
	if (grid.goal === grid.start) grid.goal = emptyGrid(w, h).goal;
	grid.walls[grid.start] = false;
	grid.walls[grid.goal] = false;
	return grid;
}

/** Whether the goal can be reached from the start with 4-connected moves. */
export function isConnected(grid: Grid): boolean {
	const seen = new Uint8Array(grid.walls.length);
	const queue = [grid.start];
	seen[grid.start] = 1;
	for (let k = 0; k < queue.length; k++) {
		const cell = queue[k];
		if (cell === grid.goal) return true;
		for (const s of gridSuccessors(grid, cell, false)) {
			if (seen[s.state]) continue;
			seen[s.state] = 1;
			queue.push(s.state);
		}
	}
	return false;
}

/**
 * Walls on about `density` of the cells at random, none next to the start or
 * goal. If the goal is cut off, the next seed is tried (up to 100 times).
 */
export function scatteredGrid(
	width = 32,
	height = 22,
	seed: number = DEFAULT_SEEDS.scattered,
	density = 0.3
): Grid {
	const base = emptyGrid(width, height);
	let grid = base;
	for (let attempt = 0; attempt < 100; attempt++) {
		const rand = seededRandom(seed + attempt);
		grid = { ...base, walls: base.walls.map(() => rand() < density) };
		for (const end of [grid.start, grid.goal]) {
			const { col, row } = cellPosition(grid, end);
			for (let dr = -1; dr <= 1; dr++)
				for (let dc = -1; dc <= 1; dc++) {
					const i = cellAt(grid, col + dc, row + dr);
					if (i >= 0) grid.walls[i] = false;
				}
		}
		if (isConnected(grid)) return grid;
	}
	return clearWalls(grid);
}

/** A preset layout at a size (the random ones with `seed`, or their default seed). */
export function gridPreset(id: GridPresetId, width: number, height: number, seed?: number): Grid {
	switch (id) {
		case 'concave':
			return concaveGrid(width, height);
		case 'open':
			return openGrid(width, height);
		case 'wall-gap':
			return wallGapGrid(width, height);
		case 'maze':
			return mazeGrid(width, height, seed ?? DEFAULT_SEEDS.maze);
		case 'scattered':
			return scatteredGrid(width, height, seed ?? DEFAULT_SEEDS.scattered);
	}
}
