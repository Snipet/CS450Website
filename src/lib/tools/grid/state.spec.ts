import { describe, expect, it } from 'vitest';
import { concaveGrid, decodeGrid, encodeGrid } from '$lib/theory/grid';
import {
	DEFAULT_GRID_WEIGHT,
	GRID_ALGORITHMS,
	completeGridState,
	defaultGridState,
	isGridAlgorithm,
	isGridHeuristic,
	isSavedGridState
} from './state';

describe('grid tool state', () => {
	it('opens on A* around the slide obstacle with α = 5 (slide 39)', () => {
		const d = defaultGridState();
		expect(decodeGrid(d.grid).grid).toEqual(concaveGrid());
		expect(d).toMatchObject({
			algorithm: 'astar',
			compare: null,
			diagonal: true,
			heuristic: 'euclidean',
			weight: 5,
			shade: true
		});
		expect(DEFAULT_GRID_WEIGHT).toBe(5);
	});

	it('offers the six grid strategies', () => {
		expect(GRID_ALGORITHMS).toEqual(['bfs', 'dfs', 'ucs', 'greedy', 'astar', 'wastar']);
		expect(isGridAlgorithm('ids')).toBe(false);
		expect(isGridAlgorithm('astar')).toBe(true);
		expect(isGridHeuristic('octile')).toBe(true);
		expect(isGridHeuristic('h2')).toBe(false);
	});

	it('accepts a cross-tool link with only the grid (LinkStates["grid"])', () => {
		const link = { grid: encodeGrid(concaveGrid(16, 11)) };
		expect(isSavedGridState(link)).toBe(true);
		expect(completeGridState(link)).toEqual({ ...defaultGridState(), grid: link.grid });
	});

	it('accepts full saved state and keeps its fields', () => {
		const full = { ...defaultGridState(), algorithm: 'ucs' as const, compare: 'astar' as const };
		expect(isSavedGridState(full)).toBe(true);
		expect(completeGridState(full)).toEqual(full);
	});

	it('rejects bad values', () => {
		const grid = encodeGrid(concaveGrid());
		for (const bad of [
			null,
			'grid',
			{},
			{ grid: 5 },
			{ grid: '32x22~s0.0' },
			{ grid, algorithm: 'ids' },
			{ grid, compare: 'foo' },
			{ grid, diagonal: 'yes' },
			{ grid, heuristic: 'h1' },
			{ grid, weight: 0.5 },
			{ grid, weight: Number.NaN },
			{ grid, shade: 1 }
		])
			expect(isSavedGridState(bad), JSON.stringify(bad)).toBe(false);
		expect(isSavedGridState({ grid, compare: null })).toBe(true);
	});
});
