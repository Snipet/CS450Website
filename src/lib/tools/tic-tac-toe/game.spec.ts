import { describe, expect, it } from 'vitest';
import { EMPTY_BOARD } from '$lib/theory/games/tictactoe';
import { gameBoards, gameStatus, undoLength } from './game';

describe('gameBoards', () => {
	it('plays the moves from the start', () => {
		expect(gameBoards(EMPTY_BOARD, [4, 0])).toEqual([EMPTY_BOARD, '....X....', 'O...X....']);
		expect(gameBoards('XO.......', [])).toEqual(['XO.......']);
	});

	it('stops before the first illegal move', () => {
		expect(gameBoards(EMPTY_BOARD, [4, 4, 0])).toEqual([EMPTY_BOARD, '....X....']);
		// X wins on the third X move; nothing is played after it.
		expect(gameBoards(EMPTY_BOARD, [0, 3, 1, 4, 2, 5])).toHaveLength(6);
	});
});

describe('undoLength', () => {
	const boards = gameBoards(EMPTY_BOARD, [4, 0, 2]);

	it('steps back one move between two people', () => {
		expect(undoLength(boards, { X: 'human', O: 'human' })).toBe(2);
	});

	it('steps back to the human player’s turn', () => {
		// X (human) played 5, O (computer) 1, X 3: taking back X's move leaves X to move.
		expect(undoLength(boards, { X: 'human', O: 'minimax' })).toBe(2);
		// After O's reply, undo takes back both moves.
		expect(undoLength(boards.slice(0, 3), { X: 'human', O: 'minimax' })).toBe(0);
		expect(undoLength(boards, { X: 'minimax', O: 'human' })).toBe(1);
	});

	it('steps back one move between two computers, and stays at the start', () => {
		expect(undoLength(boards, { X: 'minimax', O: 'depth' })).toBe(2);
		expect(undoLength([EMPTY_BOARD], { X: 'human', O: 'human' })).toBe(0);
		expect(undoLength(boards.slice(0, 2), { X: 'minimax', O: 'human' })).toBe(0);
	});
});

describe('gameStatus', () => {
	it('reports whose turn it is, a win with its squares, or a draw', () => {
		expect(gameStatus(EMPTY_BOARD)).toEqual({ kind: 'playing', mark: 'X' });
		expect(gameStatus('XOX.X.XOO')).toEqual({
			kind: 'won',
			mark: 'X',
			lines: [7],
			squares: [2, 4, 6]
		});
		expect(gameStatus('XOOXXXOOX')).toEqual({
			kind: 'won',
			mark: 'X',
			lines: [1, 6],
			squares: [0, 3, 4, 5, 8]
		});
		expect(gameStatus('XOXOOXXXO')).toEqual({ kind: 'draw' });
	});
});
