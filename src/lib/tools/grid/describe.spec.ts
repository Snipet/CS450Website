import { describe, expect, it } from 'vitest';
import {
	concaveGrid,
	emptyGrid,
	gridProblem,
	gridSearchLimits,
	setWalls,
	type Grid
} from '$lib/theory/grid';
import { search, type StrategyId } from '$lib/theory/search';
import { describeGridStep, formatCost, pathSummary, shortGridStep, stepCounts } from './describe';

const run = (grid: Grid, strategy: StrategyId, diagonal = true) =>
	search(gridProblem(grid, { diagonal, heuristic: 'euclidean' }), {
		strategy,
		mode: 'graph',
		record: 'nodes',
		...gridSearchLimits(grid)
	});

describe('formatCost', () => {
	it('keeps integers and gives other costs two decimals', () => {
		expect(formatCost(32)).toBe('32');
		expect(formatCost(24.8)).toBe('24.80');
		expect(formatCost(16 + 8 * Math.SQRT2)).toBe('27.31');
		expect(formatCost(Infinity)).toBe('∞');
	});
});

describe('pathSummary', () => {
	it('counts moves and rounds the cost', () => {
		expect(pathSummary(24, 16 + 8 * Math.SQRT2)).toBe('24 moves, cost 27.31');
		expect(pathSummary(1, 1)).toBe('1 move, cost 1');
	});
});

describe('stepCounts', () => {
	it('counts expanded cells and the frontier with the right plural', () => {
		expect(stepCounts(203, 68)).toBe('203 cells expanded, 68 on the frontier');
		expect(stepCounts(1, 0)).toBe('1 cell expanded, 0 on the frontier');
		expect(stepCounts(0, 1)).toBe('0 cells expanded, 1 on the frontier');
		expect(stepCounts(2125, 41)).toBe('2,125 cells expanded, 41 on the frontier');
	});
});

describe('describeGridStep', () => {
	const grid = concaveGrid();
	const r = run(grid, 'astar');

	it('initializes the frontier with the start cell', () => {
		expect(describeGridStep(r, 0)).toBe('Initialize the frontier with (7, 18).');
	});

	it('expands a cell in the lecture wording, with f = g + h', () => {
		expect(describeGridStep(r, 1)).toBe(
			'Take (7, 18) off the frontier (f = 22.63). Not a goal; expand it: (7, 17), (8, 17), (8, 18), (8, 19), (7, 19), (6, 19), (6, 18), (6, 17).'
		);
	});

	it('reports the path length and cost at the goal', () => {
		expect(describeGridStep(r, r.steps.length - 1)).toBe(
			'Take (23, 2) off the frontier. It contains the goal state: return the solution path (24 moves, cost 27.31).'
		);
	});

	it('reports failure when walls cut the goal off', () => {
		const g = setWalls(emptyGrid(3, 3), [1, 4, 5], true);
		const f = run(g, 'bfs');
		expect(describeGridStep(f, f.steps.length - 1)).toBe(
			'The frontier is empty: return failure (walls cut the goal off from the start).'
		);
	});

	it('is empty outside the trace', () => {
		expect(describeGridStep(r, 9999)).toBe('');
	});
});

describe('shortGridStep', () => {
	const grid = concaveGrid();

	it('one clause per step', () => {
		const r = run(grid, 'ucs');
		expect(shortGridStep(r, 0)).toBe('starts with (7, 18) on the frontier');
		expect(shortGridStep(r, 1)).toBe('expands (7, 18) (g = 0); 8 cells added to the frontier');
		expect(shortGridStep(r, r.steps.length - 1)).toBe('found the goal: 24 moves, cost 27.31');
		expect(shortGridStep(r, r.steps.length + 20)).toBe(
			`found the goal at step ${r.steps.length}: 24 moves, cost 27.31`
		);
	});

	it('counts only children added to the frontier', () => {
		const r = run(grid, 'bfs', false);
		// The second cell expanded has the start as a neighbor, which is explored.
		expect(shortGridStep(r, 2)).toMatch(/^expands \(7, 17\); [0-9]+ cells added/);
		expect(shortGridStep(r, 2)).not.toContain('4 cells');
	});

	it('reports failure', () => {
		const g = setWalls(emptyGrid(3, 3), [1, 4, 5], true);
		const f = run(g, 'bfs');
		expect(shortGridStep(f, f.steps.length - 1)).toBe('the frontier is empty: no path to the goal');
	});
});
