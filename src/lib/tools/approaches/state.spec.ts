import { describe, expect, it } from 'vitest';
import { decode, encode } from '$lib/url-state';
import { stateOfTheArtBoard } from './board';
import { completeApproachesState, defaultApproachesState, isSavedApproachesState } from './state';

describe('approaches URL state', () => {
	it('defaults to acting humanly and the slide 27 board', () => {
		expect(defaultApproachesState()).toEqual({
			approach: 'acting-humanly',
			board: stateOfTheArtBoard()
		});
	});

	it('validates saved state', () => {
		expect(isSavedApproachesState({})).toBe(true);
		expect(isSavedApproachesState({ approach: 'thinking-rationally' })).toBe(true);
		expect(isSavedApproachesState({ board: [{ text: 'Chess', at: 'acting-rationally' }] })).toBe(
			true
		);
		expect(isSavedApproachesState(null)).toBe(false);
		expect(isSavedApproachesState([])).toBe(false);
		expect(isSavedApproachesState({ approach: 'x' })).toBe(false);
		expect(isSavedApproachesState({ board: [{ text: '', at: null }] })).toBe(false);
	});

	it('fills in missing fields and copies the board', () => {
		const board = [{ text: 'Chess', at: 'acting-rationally' as const }];
		const full = completeApproachesState({ board });
		expect(full).toEqual({ approach: 'acting-humanly', board });
		expect(full.board[0]).not.toBe(board[0]);
		expect(completeApproachesState({ approach: 'thinking-humanly' }).board).toEqual(
			stateOfTheArtBoard()
		);
	});

	it('round-trips through the URL hash encoding', () => {
		const state = { approach: 'acting-rationally', board: [{ text: 'Chess', at: null }] };
		expect(decode(encode(state), isSavedApproachesState)).toEqual(state);
	});
});
