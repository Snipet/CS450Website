import { describe, expect, it } from 'vitest';
import { emptyGrid, setWalls, wallCount } from './edit';
import { cellAt, cellPosition } from './problem';
import {
	DEFAULT_SEEDS,
	GRID_PRESETS,
	GRID_SIZES,
	concaveGrid,
	gridPreset,
	gridSizeId,
	isConnected,
	mazeGrid,
	openGrid,
	scatteredGrid,
	seededRandom,
	wallGapGrid
} from './presets';
import type { Grid } from './types';

const wallCells = (g: Grid) => g.walls.flatMap((w, i) => (w ? [i] : []));

describe('sizes', () => {
	it('small, medium and large', () => {
		expect(GRID_SIZES).toEqual({
			small: { width: 16, height: 11 },
			medium: { width: 32, height: 22 },
			large: { width: 60, height: 40 }
		});
		expect(gridSizeId(32, 22)).toBe('medium');
		expect(gridSizeId(60, 40)).toBe('large');
		expect(gridSizeId(20, 20)).toBeNull();
	});
});

describe('seededRandom', () => {
	it('is reproducible and in [0, 1)', () => {
		const a = seededRandom(42);
		const b = seededRandom(42);
		const xs = Array.from({ length: 100 }, () => a());
		expect(Array.from({ length: 100 }, () => b())).toEqual(xs);
		expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
		expect(seededRandom(43)()).not.toBe(xs[0]);
	});
});

describe('concave obstacle (Informed Search slides 23–24, 39–40)', () => {
	it('reproduces the slide arrangement on 32 × 22 (golden)', () => {
		const g = concaveGrid();
		expect(cellPosition(g, g.start)).toEqual({ col: 7, row: 18 });
		expect(cellPosition(g, g.goal)).toEqual({ col: 23, row: 2 });
		const expected: number[] = [];
		for (let r = 6; r <= 7; r++) for (let c = 10; c <= 19; c++) expected.push(cellAt(g, c, r));
		for (let r = 8; r <= 12; r++) for (let c = 18; c <= 19; c++) expected.push(cellAt(g, c, r));
		expect(wallCells(g)).toEqual(expected.sort((x, y) => x - y));
	});

	it('the wall opens toward the start: the start is below and left of both bars', () => {
		const g = concaveGrid();
		const s = cellPosition(g, g.start);
		const goal = cellPosition(g, g.goal);
		const walls = wallCells(g).map((i) => cellPosition(g, i));
		expect(Math.max(...walls.map((p) => p.row))).toBeLessThan(s.row);
		expect(Math.min(...walls.map((p) => p.col))).toBeGreaterThan(s.col);
		expect(Math.min(...walls.map((p) => p.row))).toBeGreaterThan(goal.row);
		expect(Math.max(...walls.map((p) => p.col))).toBeLessThan(goal.col);
	});

	it('scales to other sizes', () => {
		const large = concaveGrid(60, 40);
		expect(large.width).toBe(60);
		expect(wallCount(large)).toBeGreaterThan(wallCount(concaveGrid()));
		expect(isConnected(large)).toBe(true);
	});
});

describe('other layouts', () => {
	it('open field has no walls', () => {
		expect(openGrid()).toEqual(emptyGrid(32, 22));
	});

	it('wall with a gap: one column blocked except for a gap near the top', () => {
		const g = wallGapGrid();
		const col = 16;
		const open = Array.from({ length: g.height }, (_, r) => r).filter(
			(r) => !g.walls[cellAt(g, col, r)]
		);
		expect(open).toEqual([3, 4]);
		expect(wallCount(g)).toBe(20);
		expect(cellPosition(g, g.start)).toEqual({ col: 6, row: 11 });
		expect(cellPosition(g, g.goal)).toEqual({ col: 25, row: 11 });
	});

	it('maze: corridor cells at even columns and rows, start bottom left, goal top right', () => {
		const g = mazeGrid();
		expect(cellPosition(g, g.start)).toEqual({ col: 0, row: 20 });
		expect(cellPosition(g, g.goal)).toEqual({ col: 30, row: 0 });
		for (let r = 0; r < g.height; r += 2)
			for (let c = 0; c < g.width; c += 2) expect(g.walls[cellAt(g, c, r)]).toBe(false);
		for (let r = 1; r < g.height; r += 2)
			for (let c = 1; c < g.width; c += 2) expect(g.walls[cellAt(g, c, r)]).toBe(true);
		expect(isConnected(g)).toBe(true);
	});

	it('maze: seeded and reproducible', () => {
		expect(mazeGrid(32, 22, 1)).toEqual(mazeGrid(32, 22, 1));
		expect(mazeGrid(32, 22, 1)).not.toEqual(mazeGrid(32, 22, 2));
		expect(mazeGrid()).toEqual(mazeGrid(32, 22, DEFAULT_SEEDS.maze));
	});

	it('scattered: about 30% walls, none next to start or goal, goal reachable', () => {
		const g = scatteredGrid();
		const share = wallCount(g) / g.walls.length;
		expect(share).toBeGreaterThan(0.2);
		expect(share).toBeLessThan(0.35);
		for (const end of [g.start, g.goal]) {
			const { col, row } = cellPosition(g, end);
			for (let dr = -1; dr <= 1; dr++)
				for (let dc = -1; dc <= 1; dc++) expect(g.walls[cellAt(g, col + dc, row + dr)]).toBe(false);
		}
		expect(isConnected(g)).toBe(true);
		expect(scatteredGrid(32, 22, 9)).toEqual(scatteredGrid(32, 22, 9));
		expect(scatteredGrid(32, 22, 9)).not.toEqual(scatteredGrid(32, 22, 10));
	});

	it('scattered: dense fields fall back to a solvable grid', () => {
		const g = scatteredGrid(16, 11, 1, 0.95);
		expect(isConnected(g)).toBe(true);
	});
});

describe('isConnected', () => {
	it('is false when walls separate start and goal', () => {
		const g = emptyGrid(5, 3);
		expect(isConnected(g)).toBe(true);
		expect(isConnected(setWalls(g, [2, 7, 12], true))).toBe(false);
	});
});

describe('gridPreset', () => {
	it('builds every layout at every size with the goal reachable', () => {
		for (const { width, height } of Object.values(GRID_SIZES)) {
			for (const p of GRID_PRESETS) {
				const g = gridPreset(p.id, width, height);
				expect(g.width).toBe(width);
				expect(g.height).toBe(height);
				expect(g.start).not.toBe(g.goal);
				expect(g.walls[g.start] || g.walls[g.goal]).toBe(false);
				expect(isConnected(g), `${p.id} ${width}x${height}`).toBe(true);
			}
		}
	});

	it('passes the seed to the random layouts', () => {
		expect(gridPreset('maze', 32, 22, 5)).toEqual(mazeGrid(32, 22, 5));
		expect(gridPreset('scattered', 32, 22, 5)).toEqual(scatteredGrid(32, 22, 5));
		expect(gridPreset('concave', 32, 22)).toEqual(concaveGrid());
		expect(gridPreset('open', 16, 11)).toEqual(openGrid(16, 11));
		expect(gridPreset('wall-gap', 16, 11)).toEqual(wallGapGrid(16, 11));
		expect(GRID_PRESETS.filter((p) => p.random).map((p) => p.id)).toEqual(['maze', 'scattered']);
	});
});
