import { describe, expect, it } from 'vitest';
import { EMPTY_BOARD } from '$lib/theory/games/tictactoe';
import {
	DEFAULT_DEPTH,
	completeTicTacToeState,
	defaultTicTacToeState,
	isSavedTicTacToeState
} from './state';

describe('defaultTicTacToeState', () => {
	it('opens on the empty board, a human X against minimax', () => {
		expect(defaultTicTacToeState()).toEqual({
			board: EMPTY_BOARD,
			moves: '',
			x: 'human',
			o: 'minimax',
			depth: DEFAULT_DEPTH,
			weights: [3, 1, -3, -1],
			values: 'minimax',
			best: true,
			levels: 1,
			expand: 0
		});
	});
});

describe('isSavedTicTacToeState', () => {
	it('accepts the LinkStates shape and the tool’s own fields', () => {
		expect(isSavedTicTacToeState({})).toBe(true);
		expect(isSavedTicTacToeState({ board: 'XO..X...O' })).toBe(true);
		expect(isSavedTicTacToeState({ board: 'X O . / . X . / . . O' })).toBe(true);
		expect(
			isSavedTicTacToeState({
				board: EMPTY_BOARD,
				moves: '519',
				x: 'depth',
				o: 'alphabeta',
				depth: 4,
				weights: [1, 2, -3, -4],
				values: 'off',
				best: false,
				levels: 2,
				expand: 5,
				other: 'ignored'
			})
		).toBe(true);
	});

	it('rejects wrong shapes, impossible boards and out-of-range values', () => {
		for (const bad of [
			null,
			[],
			'XO..X...O',
			{ board: 'OO.......' },
			{ board: 'XOXOX' },
			{ board: 9 },
			{ moves: '50' },
			{ moves: 5 },
			{ x: 'random' },
			{ depth: 0 },
			{ depth: 10 },
			{ depth: 2.5 },
			{ weights: [1, 2, 3] },
			{ weights: [11, 0, 0, 0] },
			{ values: 'all' },
			{ best: 'yes' },
			{ levels: 3 },
			{ expand: 10 }
		]) {
			expect(isSavedTicTacToeState(bad), JSON.stringify(bad)).toBe(false);
		}
	});
});

describe('completeTicTacToeState', () => {
	it('fills in defaults and normalizes the board', () => {
		const s = completeTicTacToeState({ board: 'x o . / . x . / . . o' });
		expect(s.board).toBe('XO..X...O');
		expect({ ...s, board: EMPTY_BOARD }).toEqual(defaultTicTacToeState());
	});

	it('keeps legal moves and cuts at the first illegal one', () => {
		expect(completeTicTacToeState({ moves: '519' }).moves).toBe('519');
		expect(completeTicTacToeState({ moves: '5513' }).moves).toBe('5');
		// X completes the top row on its third move; later moves are dropped.
		expect(completeTicTacToeState({ moves: '1425369' }).moves).toBe('14253');
		expect(completeTicTacToeState({ board: 'XOX.X.XOO', moves: '4' }).moves).toBe('');
	});

	it('keeps the players and settings', () => {
		const s = completeTicTacToeState({
			x: 'alphabeta',
			o: 'human',
			depth: 5,
			weights: [0, 1, 0, -1],
			values: 'depth',
			best: false,
			levels: 2,
			expand: 9
		});
		expect(s).toMatchObject({
			x: 'alphabeta',
			o: 'human',
			depth: 5,
			weights: [0, 1, 0, -1],
			values: 'depth',
			best: false,
			levels: 2,
			expand: 9
		});
	});
});
