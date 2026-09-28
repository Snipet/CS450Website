import { describe, expect, it } from 'vitest';
import { SLIDE_GOAL, playMoves } from '$lib/theory/puzzle';
import { chartPoints, linePath, niceTicks } from './chart';

describe('chartPoints', () => {
	it('lists g, h1, h2 and the moves left for each board of a solution', () => {
		const boards = playMoves('320415678', ['Left', 'Down', 'Left', 'Up']);
		expect(chartPoints(boards, SLIDE_GOAL)).toEqual([
			{ g: 0, h1: 4, h2: 4, left: 4 },
			{ g: 1, h1: 3, h2: 3, left: 3 },
			{ g: 2, h1: 2, h2: 2, left: 2 },
			{ g: 3, h1: 1, h2: 1, left: 1 },
			{ g: 4, h1: 0, h2: 0, left: 0 }
		]);
		expect(chartPoints([], SLIDE_GOAL)).toEqual([]);
	});
});

describe('niceTicks', () => {
	it('ends at the first round value at or above the maximum', () => {
		expect(niceTicks(26, 3)).toEqual([0, 10, 20, 30]);
		expect(niceTicks(42, 3)).toEqual([0, 10, 20, 30, 40, 50]);
		expect(niceTicks(4, 3)).toEqual([0, 2, 4]);
		expect(niceTicks(4, 5)).toEqual([0, 1, 2, 3, 4]);
		expect(niceTicks(18, 3)).toEqual([0, 10, 20]);
		expect(niceTicks(26, 9)).toEqual([0, 5, 10, 15, 20, 25, 30]);
		expect(niceTicks(1, 3)).toEqual([0, 0.5, 1]);
	});

	it('keeps whole-number steps for counts (moves, h1, h2)', () => {
		expect(niceTicks(1, 5, { integer: true })).toEqual([0, 1]);
		expect(niceTicks(1, 3, { integer: true })).toEqual([0, 1]);
		expect(niceTicks(2, 5, { integer: true })).toEqual([0, 1, 2]);
		expect(niceTicks(3, 5, { integer: true })).toEqual([0, 1, 2, 3]);
		expect(niceTicks(26, 3, { integer: true })).toEqual([0, 10, 20, 30]);
		for (const max of [1, 2, 3, 4, 5, 7, 9, 13, 31, 47])
			for (const count of [2, 3, 5, 9])
				for (const t of niceTicks(max, count, { integer: true }))
					expect(Number.isInteger(t), `${max} ${count}`).toBe(true);
	});

	it('returns [0] for empty ranges', () => {
		expect(niceTicks(0)).toEqual([0]);
		expect(niceTicks(-3)).toEqual([0]);
		expect(niceTicks(Number.NaN)).toEqual([0]);
	});
});

describe('linePath', () => {
	it('draws a polyline with one decimal', () => {
		expect(
			linePath([
				[0, 0],
				[10.26, 5],
				[20, 3.14]
			])
		).toBe('M0 0 L10.3 5 L20 3.1');
		expect(linePath([])).toBe('');
	});
});
