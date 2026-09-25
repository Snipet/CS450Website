import { describe, expect, it } from 'vitest';
import { STRATEGY_PROPERTIES } from '$lib/theory/search';
import { complexityLines } from './properties-view';

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
