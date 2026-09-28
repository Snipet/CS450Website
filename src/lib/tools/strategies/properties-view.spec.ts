import { describe, expect, it } from 'vitest';
import { STRATEGY_PROPERTIES } from '$lib/theory/search';
import { complexityLines, mergesTimeAndSpace } from './properties-view';

describe('complexityLines', () => {
	it('puts the greedy worst and best cases on two lines, as on the slide', () => {
		const greedy = STRATEGY_PROPERTIES.find((p) => p.strategy === 'greedy')!;
		expect(complexityLines(greedy.time)).toEqual(['Worst case: O(bᵐ)', 'Best case: O(bd)']);
	});

	it('keeps single entries', () => {
		expect(complexityLines('O(bᵈ)')).toEqual(['O(bᵈ)']);
		expect(complexityLines('')).toEqual([]);
	});
});

describe('mergesTimeAndSpace', () => {
	it('merges the cells the slides merge: UCS, greedy, and A*, not BFS', () => {
		const merged = STRATEGY_PROPERTIES.filter(mergesTimeAndSpace).map((p) => p.strategy);
		expect(merged).toEqual(['ucs', 'greedy', 'astar']);
		// BFS has O(bᵈ) in both columns on the slides, written twice.
		const bfs = STRATEGY_PROPERTIES.find((p) => p.strategy === 'bfs')!;
		expect(bfs.time).toBe(bfs.space);
		expect(mergesTimeAndSpace(bfs)).toBe(false);
	});
});
