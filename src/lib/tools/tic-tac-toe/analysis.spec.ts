import { describe, expect, it } from 'vitest';
import { EMPTY_BOARD } from '$lib/theory/games/tictactoe';
import { DEFAULT_WEIGHTS } from '$lib/theory/games/tictactoe-search';
import {
	VALUE_MODES,
	cutoffReport,
	emptyBoardStats,
	moveAnnotations,
	percent,
	searchStats
} from './analysis';

const cutoff = { depth: 3, weights: DEFAULT_WEIGHTS };

describe('moveAnnotations', () => {
	it('puts minimax values on the empty squares', () => {
		expect(VALUE_MODES).toEqual(['minimax', 'depth', 'off']);
		const a = moveAnnotations('XX..O....', 'minimax', cutoff);
		expect(a.values).toEqual([null, null, 0, 1, null, 1, 1, 1, 1]);
		expect(a.best).toEqual([2]);
		expect(a.allBest).toBe(false);
	});

	it('marks every square best when all moves tie', () => {
		const a = moveAnnotations(EMPTY_BOARD, 'minimax', cutoff);
		expect(a.values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
		expect(a.allBest).toBe(true);
	});

	it('shows depth-limited values, or none with the best moves kept', () => {
		const d = moveAnnotations('.X.XO....', 'depth', cutoff);
		expect(d.values).toEqual([-2, null, -3, null, null, -2, -3, -2, -4]);
		expect(d.best).toEqual([8]);
		const off = moveAnnotations('.X.XO....', 'off', cutoff);
		expect(off.values.every((v) => v === null)).toBe(true);
		expect(off.best).toEqual([0, 2, 6]);
	});

	it('has nothing for a finished game', () => {
		expect(moveAnnotations('XOX.X.XOO', 'minimax', cutoff)).toEqual({
			values: new Array(9).fill(null),
			best: [],
			allBest: false,
			search: null
		});
	});
});

describe('searchStats', () => {
	it('compares minimax with alpha-beta under three orderings', () => {
		const rows = emptyBoardStats();
		expect(rows.map((r) => [r.id, r.counts.nodes])).toEqual([
			['minimax', 549_946],
			['alphabeta-squares', 18_297],
			['alphabeta-center', 7_275],
			['alphabeta-best', 2_312]
		]);
		expect(rows.map((r) => r.label)).toEqual([
			'Minimax',
			'Alpha-beta, square order',
			'Alpha-beta, center, corners, edges',
			'Alpha-beta, best move first'
		]);
		expect(searchStats(EMPTY_BOARD)).toBe(rows);
	});

	it('counts from any position', () => {
		const rows = searchStats('XOXXOO...');
		expect(rows[0].counts.nodes).toBe(11);
		expect(rows[1].counts.nodes).toBe(8);
	});

	it('writes shares as percentages', () => {
		expect(percent(549_946, 549_946)).toBe('100%');
		expect(percent(18_297, 549_946)).toBe('3.3%');
		expect(percent(2_312, 549_946)).toBe('0.42%');
		expect(percent(60, 100)).toBe('60%');
		expect(percent(1, 0)).toBe('—');
	});
});

describe('cutoffReport', () => {
	it('flags the horizon effect position', () => {
		const r = cutoffReport('.X.XO....', 3, DEFAULT_WEIGHTS)!;
		expect(r.chosen).toBe(8);
		expect(r.chosenValue).toBe(1);
		expect(r.value).toBe(0);
		expect(r.worse).toBe(true);
		expect(r.complete).toBe(false);
		expect(r.rows.find((row) => row.square === 8)).toEqual({ square: 8, limited: -4, exact: 1 });
		expect(r.pruned.move).toBe(8);
		expect(r.pruned.counts.nodes).toBeLessThan(r.search.counts.nodes);
	});

	it('finds no mistake when the cutoff covers the rest of the game', () => {
		const r = cutoffReport('.X.XO....', 6, DEFAULT_WEIGHTS)!;
		expect(r.complete).toBe(true);
		expect(r.worse).toBe(false);
		expect(r.rows.every((row) => row.limited === 100 * row.exact)).toBe(true);
	});

	it('is null for a finished game', () => {
		expect(cutoffReport('XOX.X.XOO', 3, DEFAULT_WEIGHTS)).toBeNull();
	});
});
