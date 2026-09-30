import { describe, expect, it } from 'vitest';
import { decode, encode } from '$lib/url-state';
import {
	SLIDE_TREE,
	completeMinimaxState,
	defaultMinimaxState,
	isSavedMinimaxState,
	isValidTreeText,
	wholeIn
} from './state';

describe('minimax tool state', () => {
	it('opens on the slide tree with alpha-beta', () => {
		const d = defaultMinimaxState();
		expect(d).toMatchObject({
			tree: SLIDE_TREE,
			algorithm: 'alphabeta',
			ordering: 'given',
			cutoff: null,
			step: 0
		});
		expect(isSavedMinimaxState(d)).toBe(true);
	});

	it('accepts the LinkStates shape', () => {
		expect(isSavedMinimaxState({ tree: SLIDE_TREE })).toBe(true);
		expect(isSavedMinimaxState({ tree: SLIDE_TREE, algorithm: 'minimax' })).toBe(true);
		const s = completeMinimaxState({ tree: '[1 2]', algorithm: 'minimax' });
		expect(s).toEqual({ ...defaultMinimaxState(), tree: '[1 2]', algorithm: 'minimax' });
	});

	it('rejects bad shapes and values', () => {
		for (const bad of [
			null,
			[],
			'x',
			{},
			{ tree: 5 },
			{ tree: '[1' },
			{ tree: SLIDE_TREE, algorithm: 'maxn' },
			{ tree: SLIDE_TREE, ordering: 'random' },
			{ tree: SLIDE_TREE, cutoff: 0 },
			{ tree: SLIDE_TREE, cutoff: 1.5 },
			{ tree: SLIDE_TREE, actions: 'yes' },
			{ tree: SLIDE_TREE, branching: 9 },
			{ tree: SLIDE_TREE, depth: 0 },
			{ tree: SLIDE_TREE, seed: -1 },
			{ tree: SLIDE_TREE, min: 500 },
			{ tree: SLIDE_TREE, step: -1 }
		])
			expect(isSavedMinimaxState(bad)).toBe(false);
		expect(isSavedMinimaxState({ tree: SLIDE_TREE, cutoff: null, step: 3 })).toBe(true);
	});

	it('keeps the random depth within the node limit', () => {
		expect(completeMinimaxState({ tree: SLIDE_TREE, branching: 5, depth: 9 }).depth).toBe(4);
	});

	it('round-trips through the URL hash', () => {
		const s = { ...defaultMinimaxState(), cutoff: 2, step: 7 };
		expect(decode(encode(s), isSavedMinimaxState)).toEqual(s);
		expect(decode('#v1.garbage', isSavedMinimaxState)).toBeNull();
	});

	it('checks tree text and clamps numbers', () => {
		expect(isValidTreeText(SLIDE_TREE)).toBe(true);
		expect(isValidTreeText('[')).toBe(false);
		expect(wholeIn(2.6, 1, 5)).toBe(3);
		expect(wholeIn(NaN, 1, 5)).toBe(1);
		expect(wholeIn(Infinity, 1, 5)).toBe(5);
		expect(wholeIn(-Infinity, 1, 5)).toBe(1);
	});
});
