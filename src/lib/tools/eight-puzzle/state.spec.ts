import { describe, expect, it } from 'vitest';
import { SLIDE_GOAL, SLIDE_START } from '$lib/theory/puzzle';
import {
	MAX_SCRAMBLE,
	MAX_SEED,
	MIN_SCRAMBLE,
	completePuzzleState,
	defaultPuzzleState,
	isSavedPuzzleState
} from './state';

describe('defaultPuzzleState', () => {
	it('opens on the slide boards with both overlays', () => {
		expect(defaultPuzzleState()).toEqual({
			start: SLIDE_START,
			goal: SLIDE_GOAL,
			moves: 20,
			seed: 1,
			misplaced: true,
			distances: true
		});
	});
});

describe('isSavedPuzzleState', () => {
	it('accepts the LinkStates shape and the tool’s own fields', () => {
		expect(isSavedPuzzleState({ start: '724506831' })).toBe(true);
		expect(isSavedPuzzleState({ start: '724506831', goal: '012345678' })).toBe(true);
		expect(
			isSavedPuzzleState({ start: 'x', moves: 3, seed: 9, misplaced: false, distances: true })
		).toBe(true);
		// Extra fields are allowed.
		expect(isSavedPuzzleState({ start: '724506831', other: 1 })).toBe(true);
	});

	it('rejects the wrong shapes', () => {
		expect(isSavedPuzzleState(null)).toBe(false);
		expect(isSavedPuzzleState([])).toBe(false);
		expect(isSavedPuzzleState({})).toBe(false);
		expect(isSavedPuzzleState({ start: 724506831 })).toBe(false);
		expect(isSavedPuzzleState({ start: '724506831', goal: 1 })).toBe(false);
		expect(isSavedPuzzleState({ start: '724506831', moves: '3' })).toBe(false);
		expect(isSavedPuzzleState({ start: '724506831', misplaced: 'yes' })).toBe(false);
	});
});

describe('completePuzzleState', () => {
	it('reads boards as digits or formatted text', () => {
		expect(completePuzzleState({ start: '320415678' }).start).toBe('320415678');
		expect(completePuzzleState({ start: '3 2 _ / 4 1 5 / 6 7 8' }).start).toBe('320415678');
		expect(completePuzzleState({ start: SLIDE_GOAL, goal: SLIDE_START }).goal).toBe(SLIDE_START);
	});

	it('falls back to defaults for unreadable fields', () => {
		const s = completePuzzleState({ start: 'nope', goal: '11', moves: Number.NaN });
		expect(s).toEqual(defaultPuzzleState());
	});

	it('clamps the scramble settings', () => {
		const high = completePuzzleState({ start: SLIDE_START, moves: 1e6, seed: 1e9 });
		expect(high.moves).toBe(MAX_SCRAMBLE);
		expect(high.seed).toBe(MAX_SEED);
		const low = completePuzzleState({ start: SLIDE_START, moves: -4, seed: -2 });
		expect(low.moves).toBe(MIN_SCRAMBLE);
		expect(low.seed).toBe(0);
		expect(completePuzzleState({ start: SLIDE_START, moves: 7.6 }).moves).toBe(8);
	});

	it('keeps the overlay switches', () => {
		const s = completePuzzleState({ start: SLIDE_START, misplaced: false, distances: false });
		expect(s.misplaced).toBe(false);
		expect(s.distances).toBe(false);
	});
});
