import { describe, expect, it } from 'vitest';
import { EMPTY_BOARD } from '$lib/theory/games/tictactoe';
import { DEFAULT_WEIGHTS } from '$lib/theory/games/tictactoe-search';
import {
	announceMove,
	computerSummary,
	cutoffWord,
	formatValue,
	moveSentence,
	outcomeWord,
	resultSentence,
	speakBoard,
	squareDescription,
	squareTitle,
	statusHeadline,
	valueSentence
} from './describe';
import { gameStatus } from './game';
import { computerMove } from './players';

const settings = { depth: 3, weights: DEFAULT_WEIGHTS };

describe('values', () => {
	it('writes values with a sign and a real minus', () => {
		expect(formatValue(1)).toBe('+1');
		expect(formatValue(0)).toBe('0');
		expect(formatValue(-1)).toBe('−1');
		expect(formatValue(-100)).toBe('−100');
	});

	it('reads values for MAX as outcomes', () => {
		expect(outcomeWord(1)).toBe('X wins');
		expect(outcomeWord(0)).toBe('draw');
		expect(outcomeWord(-1)).toBe('O wins');
		expect(cutoffWord(100)).toBe('X wins');
		expect(cutoffWord(-100)).toBe('O wins');
		expect(cutoffWord(4)).toBeNull();
		expect(valueSentence(0)).toBe('Minimax value 0: a draw with perfect play by both sides.');
		expect(valueSentence(1)).toBe('Minimax value +1: X wins with perfect play by both sides.');
		expect(valueSentence(-1)).toBe('Minimax value −1: O wins with perfect play by both sides.');
	});
});

describe('boards and moves', () => {
	it('reads a board row by row', () => {
		expect(speakBoard('XO..X....')).toBe(
			'Row 1: X, O, empty. Row 2: empty, X, empty. Row 3: empty, empty, empty'
		);
		expect(squareTitle(8)).toBe('Square 9 (bottom right)');
	});

	it('describes the state of the game', () => {
		expect(statusHeadline(gameStatus(EMPTY_BOARD))).toBe('X to move');
		expect(statusHeadline(gameStatus('XOX.X.XOO'))).toBe('X wins');
		expect(statusHeadline(gameStatus('XOXOOXXXO'))).toBe('Draw');
		expect(resultSentence(gameStatus(EMPTY_BOARD))).toBe('X (MAX) to move.');
		expect(resultSentence(gameStatus('X........'))).toBe('O (MIN) to move.');
		expect(resultSentence(gameStatus('XOX.X.XOO'))).toBe('X wins: diagonal from the top right.');
		expect(resultSentence(gameStatus('XOOXXXOOX'))).toBe(
			'X wins: middle row and diagonal from the top left.'
		);
		expect(resultSentence(gameStatus('XOXOOXXXO'))).toBe(
			'Draw: the board is full and nobody has three in a row.'
		);
	});

	it('announces a move and what follows', () => {
		expect(moveSentence('X', 4)).toBe('X plays square 5 (center).');
		expect(announceMove(EMPTY_BOARD, 4, gameStatus('....X....'))).toBe(
			'X plays square 5 (center). O (MIN) to move.'
		);
		expect(announceMove('XOX.X..OO', 6, gameStatus('XOX.X.XOO'))).toBe(
			'X plays square 7 (bottom left). X wins: diagonal from the top right.'
		);
	});

	it('summarizes a computer move with its search', () => {
		expect(computerSummary('X', computerMove(EMPTY_BOARD, 'minimax', settings)!)).toBe(
			'X (minimax) played square 1 (top left): minimax value 0; 549,946 nodes visited.'
		);
		expect(computerSummary('X', computerMove(EMPTY_BOARD, 'alphabeta', settings)!)).toBe(
			'X (alpha-beta) played square 1 (top left): minimax value 0; 18,297 nodes visited, 4,237 cutoffs.'
		);
		expect(computerSummary('O', computerMove('.X.XO....', 'depth', settings)!)).toMatch(
			/^O \(depth-limited, cutoff 3\) played square 9 \(bottom right\): backed-up value −4; \d+ nodes visited, \d+ cutoffs, \d+ scored with Eval\.$/
		);
	});

	it('names each square for screen readers', () => {
		expect(squareDescription({ square: 0, mark: 'X' })).toBe('Square 1 (top left): X');
		expect(squareDescription({ square: 2, mark: '.', value: 1, mode: 'minimax', best: true })).toBe(
			'Square 3 (top right): empty, minimax value +1 (X wins), best move'
		);
		expect(squareDescription({ square: 2, mark: '.', value: -4, mode: 'depth' })).toBe(
			'Square 3 (top right): empty, depth-limited value −4'
		);
		expect(squareDescription({ square: 2, mark: '.', value: 100, mode: 'depth' })).toBe(
			'Square 3 (top right): empty, depth-limited value +100 (X wins)'
		);
		expect(squareDescription({ square: 4, mark: 'O', winning: true, last: true })).toBe(
			'Square 5 (center): O, part of the winning line, last move'
		);
	});
});
