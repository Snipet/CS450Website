import { describe, expect, it } from 'vitest';
import {
	CELLS,
	EMPTY_BOARD,
	LINES,
	LINE_NAMES,
	SQUARE_NAMES,
	boardDiagnostics,
	countMarks,
	formatBoard,
	isBoard,
	isFull,
	isTerminal,
	legalMoves,
	moveBetween,
	moveText,
	other,
	parseBoard,
	parseMoveText,
	playMoves,
	playerOf,
	readBoardText,
	result,
	squareLabel,
	squareNumber,
	toMove,
	utility,
	winner,
	winningLines
} from './tictactoe';
import { reachableBoards } from './tictactoe-search';

/** The terminal boards at the bottom of Games and Adversarial Search slide 6. */
const SLIDE_6_TERMINALS = [
	{ board: 'XOX.OX.O.', utility: -1 },
	{ board: 'XOXOOXXXO', utility: 0 },
	{ board: 'XOX.X.XOO', utility: 1 }
];

function allBoards(): string[] {
	const out: string[] = [];
	for (let n = 0; n < 3 ** CELLS; n++) {
		let b = '';
		let k = n;
		for (let i = 0; i < CELLS; i++) {
			b += '.XO'[k % 3];
			k = Math.floor(k / 3);
		}
		out.push(b);
	}
	return out;
}

describe('squares and lines', () => {
	it('numbers squares 1–9 row by row from the top left', () => {
		expect(squareNumber(0)).toBe(1);
		expect(squareNumber(8)).toBe(9);
		expect(squareLabel(4)).toBe('square 5 (center)');
		expect(squareLabel(0)).toBe('square 1 (top left)');
		expect(SQUARE_NAMES).toHaveLength(9);
	});

	it('has the eight lines: rows, columns, diagonals', () => {
		expect(LINES).toHaveLength(8);
		expect(LINE_NAMES).toHaveLength(8);
		const counts = new Array(9).fill(0);
		for (const line of LINES) for (const s of line) counts[s]++;
		// The center is on 4 lines, corners on 3, edges on 2.
		expect(counts).toEqual([3, 2, 3, 2, 4, 2, 3, 2, 3]);
	});
});

describe('isBoard', () => {
	it('accepts nine characters of X, O and .', () => {
		expect(isBoard(EMPTY_BOARD)).toBe(true);
		expect(isBoard('XOX.OX.O.')).toBe(true);
		expect(isBoard('xox.ox.o.')).toBe(false);
		expect(isBoard('XOX.OX.O')).toBe(false);
		expect(isBoard('XOX_OX.O.')).toBe(false);
		expect(isBoard(9)).toBe(false);
	});
});

describe('turns', () => {
	it('gives X the move when the counts are equal (X is MAX and moves first)', () => {
		expect(toMove(EMPTY_BOARD)).toBe('X');
		expect(toMove('X........')).toBe('O');
		expect(toMove('XO.......')).toBe('X');
		expect(playerOf('X')).toBe('MAX');
		expect(playerOf('O')).toBe('MIN');
		expect(other('X')).toBe('O');
		expect(countMarks('XOX.OX.O.')).toEqual({ X: 3, O: 3 });
	});
});

describe('terminal states and utilities', () => {
	it('scores the slide 6 terminal boards −1, 0, +1 for MAX', () => {
		for (const { board, utility: u } of SLIDE_6_TERMINALS) {
			expect(isTerminal(board), board).toBe(true);
			expect(utility(board), board).toBe(u);
			expect(boardDiagnostics(board), board).toEqual([]);
		}
		expect(winner('XOX.OX.O.')).toBe('O');
		expect(winner('XOXOOXXXO')).toBeNull();
		expect(winner('XOX.X.XOO')).toBe('X');
		expect(winningLines('XOX.X.XOO')).toEqual([{ mark: 'X', line: 7 }]);
		expect(LINE_NAMES[7]).toBe('diagonal from the top right');
	});

	it('finds every line a move completes', () => {
		// X's last move on square 5 completes the middle row and a diagonal.
		expect(winningLines('XOOXXXOOX')).toEqual([
			{ mark: 'X', line: 1 },
			{ mark: 'X', line: 6 }
		]);
	});

	it('treats a full board without a line as a draw', () => {
		expect(isFull('XOXOOXXXO')).toBe(true);
		expect(isFull(EMPTY_BOARD)).toBe(false);
		expect(isTerminal(EMPTY_BOARD)).toBe(false);
	});
});

describe('moves', () => {
	it('lists successors in square order, as on slide 6', () => {
		expect(legalMoves(EMPTY_BOARD)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
		expect(legalMoves(EMPTY_BOARD).map((s) => result(EMPTY_BOARD, s))).toEqual([
			'X........',
			'.X.......',
			'..X......',
			'...X.....',
			'....X....',
			'.....X...',
			'......X..',
			'.......X.',
			'........X'
		]);
		// Second level of slide 6: O's replies to X in the corner, in square order.
		expect(
			legalMoves('X........')
				.slice(0, 3)
				.map((s) => result('X........', s))
		).toEqual(['XO.......', 'X.O......', 'X..O.....']);
	});

	it('has no moves once the game is over', () => {
		for (const { board } of SLIDE_6_TERMINALS) expect(legalMoves(board)).toEqual([]);
	});

	it('refuses an occupied square or a finished game', () => {
		expect(() => result('X........', 0)).toThrow();
		expect(() => result('XOX.OX.O.', 3)).toThrow();
	});

	it('plays a sequence of moves', () => {
		expect(playMoves(EMPTY_BOARD, [4, 0, 8])).toEqual([
			EMPTY_BOARD,
			'....X....',
			'O...X....',
			'O...X...X'
		]);
		expect(playMoves(EMPTY_BOARD, [4, 4])).toBeNull();
		expect(playMoves('XOX.X.XOO', [3])).toBeNull();
		expect(playMoves(EMPTY_BOARD, [9])).toBeNull();
		expect(playMoves(EMPTY_BOARD, [])).toEqual([EMPTY_BOARD]);
	});

	it('finds the square between two boards', () => {
		expect(moveBetween(EMPTY_BOARD, '....X....')).toBe(4);
		expect(moveBetween(EMPTY_BOARD, EMPTY_BOARD)).toBeNull();
		expect(moveBetween(EMPTY_BOARD, 'X...X....')).toBeNull();
		expect(moveBetween('X........', 'O........')).toBeNull();
	});

	it('writes moves as digits 1–9', () => {
		expect(moveText([4, 0, 8])).toBe('519');
		expect(parseMoveText('519')).toEqual([4, 0, 8]);
		expect(parseMoveText('')).toEqual([]);
		expect(parseMoveText('50')).toBeNull();
		expect(parseMoveText('5a')).toBeNull();
	});
});

describe('formatBoard', () => {
	it('writes rows separated by slashes, lines, or the stored text', () => {
		expect(formatBoard('XOX.OX.O.')).toBe('X O X / . O X / . O .');
		expect(formatBoard('XOX.OX.O.', { rows: 'lines' })).toBe('X O X\n. O X\n. O .');
		expect(formatBoard('XOX.OX.O.', { rows: 'compact' })).toBe('XOX.OX.O.');
	});
});

describe('boardDiagnostics', () => {
	it('reports wrong counts', () => {
		expect(boardDiagnostics('O........')[0].message).toMatch(/O never has more marks than X/);
		expect(boardDiagnostics('XX.......')[0].message).toMatch(/at most one mark more than O/);
	});

	it('reports two winners and play after a win', () => {
		expect(boardDiagnostics('XXXOOO...')[0].message).toMatch(/Both X and O/);
		// X completed the top row, then O moved again.
		expect(boardDiagnostics('XXXOO.O..')[0].message).toMatch(/O moved after it/);
		// O completed the middle row, then X moved again.
		expect(boardDiagnostics('XX.OOOX.X')[0].message).toMatch(/X moved after it/);
	});

	it('accepts exactly the 5,478 positions reachable from the empty board', () => {
		const legal = allBoards().filter((b) => boardDiagnostics(b).length === 0);
		expect(legal).toHaveLength(5478);
		expect(new Set(legal)).toEqual(new Set(reachableBoards()));
	});
});

describe('parseBoard', () => {
	it('reads marks row by row, ignoring separators and case', () => {
		for (const text of [
			'X O X / . O X / . O .',
			'XOX.OX.O.',
			'xox\n.ox\n.o.',
			'X|O|X, _|O|X, -|O|_',
			'[X O X] [. O X] [. O .]'
		]) {
			expect(parseBoard(text), text).toEqual({ board: 'XOX.OX.O.', diagnostics: [] });
		}
	});

	it('reports unknown characters with their position', () => {
		const r = parseBoard('X0.......');
		expect(r.board).toBeNull();
		expect(r.diagnostics).toHaveLength(1);
		expect(r.diagnostics[0].message).toMatch(/use the letter O/);
		expect(r.diagnostics[0].span).toEqual({ start: 1, end: 2, source: null });
		expect(parseBoard('X?.......').diagnostics[0].message).toMatch(/Unexpected character “\?”/);
	});

	it('reports a wrong number of squares', () => {
		const r = parseBoard('X O X');
		expect(r.board).toBeNull();
		expect(r.diagnostics[0].message).toBe('A board has 9 squares; this one has 3.');
		expect(r.diagnostics[0].span).toEqual({ start: 0, end: 5, source: null });
	});

	it('reads the squares of an impossible board separately', () => {
		expect(readBoardText('O . . / . . . / . . .')).toEqual({ cells: 'O........', diagnostics: [] });
		expect(readBoardText('X O').cells).toBeNull();
		expect(readBoardText('X#O').diagnostics[0].span).toEqual({ start: 1, end: 2, source: null });
	});

	it('rejects impossible boards', () => {
		const r = parseBoard('O . . / . . . / . . .');
		expect(r.board).toBeNull();
		expect(r.diagnostics[0].severity).toBe('error');
	});
});
