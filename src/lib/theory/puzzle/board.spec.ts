import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '../diagnostics';
import {
	CELLS,
	OPPOSITE,
	PUZZLE_ACTIONS,
	SIZE,
	SLIDE_GOAL,
	SLIDE_START,
	actionForCell,
	applyMove,
	blankCell,
	cellOf,
	colOf,
	formatBoard,
	isBoard,
	moves,
	parseBoard,
	playMoves,
	rowOf,
	tileAt
} from './board';

const errors = (ds: Diagnostic[]) => ds.filter((d) => d.severity === 'error');
const messages = (ds: Diagnostic[]) => ds.map((d) => d.message);

describe('constants', () => {
	it('uses the slide start and goal (Informed Search slide 32)', () => {
		expect(SIZE).toBe(3);
		expect(CELLS).toBe(9);
		expect(formatBoard(SLIDE_START)).toBe('7 2 4 / 5 _ 6 / 8 3 1');
		expect(formatBoard(SLIDE_GOAL)).toBe('_ 1 2 / 3 4 5 / 6 7 8');
	});

	it('lists the blank moves in successor order, with their opposites', () => {
		expect(PUZZLE_ACTIONS).toEqual(['Left', 'Right', 'Up', 'Down']);
		for (const a of PUZZLE_ACTIONS) expect(OPPOSITE[OPPOSITE[a]]).toBe(a);
		expect(OPPOSITE.Left).toBe('Right');
		expect(OPPOSITE.Up).toBe('Down');
	});
});

describe('isBoard', () => {
	it('accepts permutations of 0–8', () => {
		expect(isBoard(SLIDE_START)).toBe(true);
		expect(isBoard(SLIDE_GOAL)).toBe(true);
		expect(isBoard('876543210')).toBe(true);
	});

	it('rejects anything else', () => {
		expect(isBoard('72450683')).toBe(false);
		expect(isBoard('7245068311')).toBe(false);
		expect(isBoard('724506833')).toBe(false);
		expect(isBoard('724596831')).toBe(false);
		expect(isBoard('72450683_')).toBe(false);
		expect(isBoard(724506831)).toBe(false);
		expect(isBoard(null)).toBe(false);
	});
});

describe('squares', () => {
	it('numbers squares row by row', () => {
		expect([rowOf(0), colOf(0)]).toEqual([0, 0]);
		expect([rowOf(5), colOf(5)]).toEqual([1, 2]);
		expect([rowOf(7), colOf(7)]).toEqual([2, 1]);
	});

	it('finds tiles and the blank', () => {
		expect(tileAt(SLIDE_START, 0)).toBe(7);
		expect(tileAt(SLIDE_START, 4)).toBe(0);
		expect(cellOf(SLIDE_START, 1)).toBe(8);
		expect(cellOf(SLIDE_START, 0)).toBe(4);
		expect(blankCell(SLIDE_START)).toBe(4);
		expect(blankCell(SLIDE_GOAL)).toBe(0);
	});
});

describe('moves', () => {
	it('moves the blank Left, Right, Up, Down from the center', () => {
		expect(moves(SLIDE_START)).toEqual([
			{ action: 'Left', board: '724056831', tile: 5 },
			{ action: 'Right', board: '724560831', tile: 6 },
			{ action: 'Up', board: '704526831', tile: 2 },
			{ action: 'Down', board: '724536801', tile: 3 }
		]);
	});

	it('keeps the blank on the board in a corner and on an edge', () => {
		expect(moves(SLIDE_GOAL).map((m) => m.action)).toEqual(['Right', 'Down']);
		expect(moves('102345678').map((m) => m.action)).toEqual(['Left', 'Right', 'Down']);
		expect(moves('123456780').map((m) => m.action)).toEqual(['Left', 'Up']);
	});

	it('applies a single move, or returns null off the board', () => {
		expect(applyMove(SLIDE_GOAL, 'Right')).toBe('102345678');
		expect(applyMove(SLIDE_GOAL, 'Down')).toBe('312045678');
		expect(applyMove(SLIDE_GOAL, 'Left')).toBeNull();
		expect(applyMove(SLIDE_GOAL, 'Up')).toBeNull();
		for (const m of moves(SLIDE_START)) expect(applyMove(SLIDE_START, m.action)).toBe(m.board);
	});

	it('undoes a move with its opposite', () => {
		for (const m of moves(SLIDE_START)) {
			expect(applyMove(m.board, OPPOSITE[m.action])).toBe(SLIDE_START);
		}
	});

	it('maps a square next to the blank to the move that slides its tile', () => {
		expect(actionForCell(SLIDE_START, 3)).toBe('Left');
		expect(actionForCell(SLIDE_START, 5)).toBe('Right');
		expect(actionForCell(SLIDE_START, 1)).toBe('Up');
		expect(actionForCell(SLIDE_START, 7)).toBe('Down');
		expect(actionForCell(SLIDE_START, 0)).toBeNull();
		expect(actionForCell(SLIDE_START, 4)).toBeNull();
		// Square 3 is not next to square 2 (different rows).
		expect(actionForCell('120345678', 3)).toBeNull();
	});

	it('plays a sequence of moves and stops at an illegal one', () => {
		expect(playMoves(SLIDE_GOAL, ['Right', 'Down'])).toEqual([
			SLIDE_GOAL,
			'102345678',
			'142305678'
		]);
		expect(playMoves(SLIDE_GOAL, ['Up', 'Right'])).toEqual([SLIDE_GOAL]);
		expect(playMoves(SLIDE_GOAL, [])).toEqual([SLIDE_GOAL]);
	});
});

describe('formatBoard', () => {
	it('writes rows separated by slashes, or one per line', () => {
		expect(formatBoard(SLIDE_START, { rows: 'lines' })).toBe('7 2 4\n5 _ 6\n8 3 1');
		expect(formatBoard(SLIDE_START, { blank: '0' })).toBe('7 2 4 / 5 0 6 / 8 3 1');
		expect(formatBoard(SLIDE_START, { blank: ' ', rows: 'lines' })).toBe('7 2 4\n5   6\n8 3 1');
	});

	it('round-trips through parseBoard', () => {
		for (const b of [SLIDE_START, SLIDE_GOAL, '876543210']) {
			expect(parseBoard(formatBoard(b)).board).toBe(b);
			expect(parseBoard(formatBoard(b, { rows: 'lines' })).board).toBe(b);
		}
	});
});

describe('parseBoard', () => {
	it('reads every accepted notation', () => {
		for (const text of [
			'7 2 4 / 5 _ 6 / 8 3 1',
			'724506831',
			'7,2,4,5,0,6,8,3,1',
			'7 2 4\n5 _ 6\n8 3 1',
			'  7 2 4\r\n  5 0 6\r\n  8 3 1\n',
			'[7, 2, 4, 5, 0, 6, 8, 3, 1]',
			'724 / 5_6 / 831',
			'7 2 4 | 5 _ 6 | 8 3 1'
		]) {
			const r = parseBoard(text);
			expect(r.diagnostics, text).toEqual([]);
			expect(r.board, text).toBe(SLIDE_START);
		}
	});

	it('reports an empty board', () => {
		const r = parseBoard('  / ');
		expect(r.board).toBeNull();
		expect(errors(r.diagnostics)).toHaveLength(1);
		expect(r.diagnostics[0].message).toMatch(/empty/);
	});

	it('reports the wrong number of squares', () => {
		const few = parseBoard('7 2 4 / 5 _ 6 / 8 3');
		expect(few.board).toBeNull();
		expect(messages(few.diagnostics)).toEqual([
			'Expected 9 squares (8 tiles and the blank), found 8.'
		]);

		const text = '7 2 4 / 5 _ 6 / 8 3 1 9';
		const bad = parseBoard(text);
		expect(bad.board).toBeNull();
		expect(bad.diagnostics[0].span).toEqual({ start: 22, end: 23, source: null });

		const many = parseBoard('7245068312');
		expect(many.board).toBeNull();
		const length = many.diagnostics.find((d) => d.message.startsWith('Expected'));
		expect(length?.message).toBe('Expected 9 squares (8 tiles and the blank), found 10.');
		expect(length?.span).toEqual({ start: 9, end: 10, source: null });
	});

	it('reports repeated tiles and a repeated blank at the repeat', () => {
		const r = parseBoard('7 2 4 / 5 _ 6 / 8 3 3');
		expect(r.board).toBeNull();
		expect(messages(r.diagnostics)).toEqual([
			'Tile 3 appears more than once.',
			'Tile 1 is missing.'
		]);
		expect(r.diagnostics[0].span).toEqual({ start: 20, end: 21, source: null });

		const blanks = parseBoard('_24506831');
		expect(messages(blanks.diagnostics)).toEqual([
			'The blank appears more than once.',
			'Tile 7 is missing.'
		]);
		expect(blanks.diagnostics[0].span).toEqual({ start: 4, end: 5, source: null });

		const twice = parseBoard('112233450');
		expect(messages(twice.diagnostics)).toEqual([
			'Tile 1 appears more than once.',
			'Tile 2 appears more than once.',
			'Tile 3 appears more than once.',
			'Tiles 6, 7 and 8 are missing.'
		]);
	});

	it('reports a missing blank', () => {
		const r = parseBoard('7 2 4 / 5 1 6 / 8 3 1');
		expect(r.board).toBeNull();
		expect(messages(r.diagnostics)).toContain('No blank: mark the empty square with _ or 0.');
		expect(messages(parseBoard('12345678').diagnostics)).toEqual([
			'Expected 9 squares (8 tiles and the blank), found 8.',
			'No blank: mark the empty square with _ or 0.'
		]);
	});

	it('reports characters that are not tiles, one run at a time', () => {
		const r = parseBoard('7 2 4 / 5 x 6 / 8 3 1');
		expect(r.board).toBeNull();
		expect(r.diagnostics[0]).toEqual({
			severity: 'error',
			message: '“x” is not a tile: use 1–8 for the tiles and _ or 0 for the blank.',
			span: { start: 10, end: 11, source: null }
		});

		const word = parseBoard('7 2 4 / 5 abc 6 / 8 3 1 . 9');
		const bad = word.diagnostics.filter((d) => d.message.includes('is not a tile'));
		expect(bad.map((d) => d.span)).toEqual([
			{ start: 10, end: 13, source: null },
			{ start: 24, end: 25, source: null },
			{ start: 26, end: 27, source: null }
		]);
		expect(bad[0].message).toMatch(/^“abc”/);
		expect(bad[2].message).toMatch(/^“9”/);
	});

	it('never throws on odd input', () => {
		for (const text of ['', '\n\n', '９', '0'.repeat(20), '🙂', '/'.repeat(100)]) {
			const r = parseBoard(text);
			expect(r.board).toBeNull();
			expect(errors(r.diagnostics).length).toBeGreaterThan(0);
		}
	});
});
