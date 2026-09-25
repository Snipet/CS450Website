import { describe, expect, it } from 'vitest';
import {
	clearWalls,
	emptyGrid,
	placeGoal,
	placeStart,
	resizeGrid,
	setWall,
	setWalls,
	toggleWall,
	wallCount
} from './edit';
import { cellAt, cellPosition } from './problem';
import { concaveGrid } from './presets';

describe('emptyGrid', () => {
	it('puts the start lower left and the goal upper right', () => {
		const g = emptyGrid(32, 22);
		expect(g.width).toBe(32);
		expect(g.height).toBe(22);
		expect(g.walls).toHaveLength(704);
		expect(wallCount(g)).toBe(0);
		expect(cellPosition(g, g.start)).toEqual({ col: 6, row: 17 });
		expect(cellPosition(g, g.goal)).toEqual({ col: 25, row: 4 });
	});

	it('keeps start and goal apart on tiny grids', () => {
		expect(emptyGrid(2, 1)).toMatchObject({ start: 0, goal: 1 });
		expect(emptyGrid(1, 2)).toMatchObject({ start: 1, goal: 0 });
	});
});

describe('edits', () => {
	const g = emptyGrid(4, 3); // start 8 (0, 2), goal 3 (3, 0)

	it('setWall adds and removes walls without touching the input', () => {
		const w = setWall(g, 5, true);
		expect(w.walls[5]).toBe(true);
		expect(g.walls[5]).toBe(false);
		expect(setWall(w, 5, false).walls[5]).toBe(false);
		expect(setWall(g, 5, false)).toBe(g);
	});

	it('never walls the start or goal, or cells off the grid', () => {
		expect(setWall(g, g.start, true)).toBe(g);
		expect(setWall(g, g.goal, true)).toBe(g);
		expect(setWall(g, 12, true)).toBe(g);
		expect(setWall(g, -1, true)).toBe(g);
	});

	it('setWalls sets many cells, skipping start and goal', () => {
		const w = setWalls(g, [0, 1, g.start, g.goal, 99], true);
		expect(w.walls.flatMap((x, i) => (x ? [i] : []))).toEqual([0, 1]);
		expect(setWalls(g, [0, 1], false)).toBe(g);
	});

	it('toggleWall flips a cell', () => {
		const w = toggleWall(g, 6);
		expect(w.walls[6]).toBe(true);
		expect(toggleWall(w, 6).walls[6]).toBe(false);
		expect(toggleWall(g, 40)).toBe(g);
	});

	it('placeStart and placeGoal move the markers and clear a wall under them', () => {
		const w = setWall(g, 5, true);
		const s = placeStart(w, 5);
		expect(s.start).toBe(5);
		expect(s.walls[5]).toBe(false);
		expect(placeGoal(w, 5)).toMatchObject({ goal: 5 });
		expect(placeGoal(w, 5).walls[5]).toBe(false);
	});

	it('the start and goal never share a cell', () => {
		expect(placeStart(g, g.goal)).toBe(g);
		expect(placeGoal(g, g.start)).toBe(g);
		expect(placeStart(g, 100)).toBe(g);
	});

	it('clearWalls and wallCount', () => {
		const w = setWalls(g, [0, 1, 2], true);
		expect(wallCount(w)).toBe(3);
		expect(wallCount(clearWalls(w))).toBe(0);
		expect(clearWalls(g)).toBe(g);
	});
});

describe('resizeGrid', () => {
	it('returns the same grid at the same size', () => {
		const g = concaveGrid();
		expect(resizeGrid(g, 32, 22)).toBe(g);
	});

	it('scales the slide layout to half size', () => {
		const half = resizeGrid(concaveGrid(), 16, 11);
		expect(cellPosition(half, half.start)).toEqual({ col: 3, row: 9 });
		expect(cellPosition(half, half.goal)).toEqual({ col: 11, row: 1 });
		const walls = half.walls.flatMap((w, i) => (w ? [cellPosition(half, i)] : []));
		expect(walls).toEqual([
			{ col: 5, row: 3 },
			{ col: 6, row: 3 },
			{ col: 7, row: 3 },
			{ col: 8, row: 3 },
			{ col: 9, row: 3 },
			{ col: 9, row: 4 },
			{ col: 9, row: 5 }
		]);
	});

	it('keeps the start and goal apart and open', () => {
		const g = setWalls(emptyGrid(10, 10), [], true);
		const near = { ...g, start: cellAt(g, 4, 4), goal: cellAt(g, 5, 5) };
		const small = resizeGrid(near, 2, 2);
		expect(small.start).not.toBe(small.goal);
		const walled = { ...near, walls: near.walls.map(() => true) };
		walled.walls[near.start] = false;
		walled.walls[near.goal] = false;
		const shrunk = resizeGrid(walled, 3, 3);
		expect(shrunk.walls[shrunk.start]).toBe(false);
		expect(shrunk.walls[shrunk.goal]).toBe(false);
		expect(shrunk.start).not.toBe(shrunk.goal);
	});
});
