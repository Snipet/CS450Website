/**
 * 8-puzzle boards: parsing, formatting, and moves of the blank
 * (Solving Problems by Searching, slide 10; Informed Search, slide 32).
 */
import type { Diagnostic } from '../diagnostics';
import type { Board, FormatBoardOptions, ParsedBoard, PuzzleAction, PuzzleMove } from './types';

/** Squares per row and column. */
export const SIZE = 3;
/** Squares on the board (eight tiles and the blank). */
export const CELLS = SIZE * SIZE;

/** Start state of Informed Search slide 32 (and Solving Problems by Searching slide 10): `7 2 4 / 5 _ 6 / 8 3 1`. */
export const SLIDE_START: Board = '724506831';
/** Goal state of the same slides: `_ 1 2 / 3 4 5 / 6 7 8`. */
export const SLIDE_GOAL: Board = '012345678';

/** The blank's moves in successor order. */
export const PUZZLE_ACTIONS: readonly PuzzleAction[] = ['Left', 'Right', 'Up', 'Down'];

/** The move that undoes each move. */
export const OPPOSITE: Readonly<Record<PuzzleAction, PuzzleAction>> = {
	Left: 'Right',
	Right: 'Left',
	Up: 'Down',
	Down: 'Up'
};

const OFFSETS: Readonly<Record<PuzzleAction, { dr: number; dc: number }>> = {
	Left: { dr: 0, dc: -1 },
	Right: { dr: 0, dc: 1 },
	Up: { dr: -1, dc: 0 },
	Down: { dr: 1, dc: 0 }
};

/** Whether a value is a board: nine characters, the digits 0–8 once each. */
export function isBoard(value: unknown): value is Board {
	if (typeof value !== 'string' || value.length !== CELLS) return false;
	let seen = 0;
	for (let i = 0; i < CELLS; i++) {
		const d = value.charCodeAt(i) - 48;
		if (d < 0 || d >= CELLS || seen & (1 << d)) return false;
		seen |= 1 << d;
	}
	return true;
}

/** Row of a square (0 at the top). */
export const rowOf = (cell: number): number => Math.floor(cell / SIZE);
/** Column of a square (0 at the left). */
export const colOf = (cell: number): number => cell % SIZE;

/** The tile on a square (0 for the blank). */
export const tileAt = (board: Board, cell: number): number => board.charCodeAt(cell) - 48;

/** The square holding a tile (0 for the blank). */
export const cellOf = (board: Board, tile: number): number => board.indexOf(String(tile));

/** The blank's square. */
export const blankCell = (board: Board): number => board.indexOf('0');

function swap(board: Board, a: number, b: number): Board {
	const chars = board.split('');
	[chars[a], chars[b]] = [chars[b], chars[a]];
	return chars.join('');
}

/** The square the blank moves to, or -1 when the move leaves the board. */
function target(blank: number, action: PuzzleAction): number {
	const { dr, dc } = OFFSETS[action];
	const r = rowOf(blank) + dr;
	const c = colOf(blank) + dc;
	return r < 0 || r >= SIZE || c < 0 || c >= SIZE ? -1 : r * SIZE + c;
}

/**
 * The successor function: every legal move of the blank, in the order Left,
 * Right, Up, Down, with the resulting board and the tile that slides.
 */
export function moves(board: Board): PuzzleMove[] {
	const blank = blankCell(board);
	const out: PuzzleMove[] = [];
	for (const action of PUZZLE_ACTIONS) {
		const to = target(blank, action);
		if (to < 0) continue;
		out.push({ action, board: swap(board, blank, to), tile: tileAt(board, to) });
	}
	return out;
}

/** The board after the blank moves, or null when the move would leave the board. */
export function applyMove(board: Board, action: PuzzleAction): Board | null {
	const blank = blankCell(board);
	const to = target(blank, action);
	return to < 0 ? null : swap(board, blank, to);
}

/**
 * The move that slides the tile on `cell` into the blank: the blank moves
 * toward that square. Null unless the square is next to the blank.
 */
export function actionForCell(board: Board, cell: number): PuzzleAction | null {
	const blank = blankCell(board);
	for (const action of PUZZLE_ACTIONS) if (target(blank, action) === cell) return action;
	return null;
}

/**
 * Boards visited by a sequence of moves, starting with `board`. Stops before
 * the first move that would leave the board.
 */
export function playMoves(board: Board, actions: readonly PuzzleAction[]): Board[] {
	const out = [board];
	let current = board;
	for (const action of actions) {
		const next = applyMove(current, action);
		if (next === null) break;
		out.push(next);
		current = next;
	}
	return out;
}

/** `7 2 4 / 5 _ 6 / 8 3 1`, or one row per line with `rows: 'lines'`. */
export function formatBoard(board: Board, options: FormatBoardOptions = {}): string {
	const blank = options.blank ?? '_';
	const rows: string[] = [];
	for (let r = 0; r < SIZE; r++) {
		const cells: string[] = [];
		for (let c = 0; c < SIZE; c++) {
			const ch = board[r * SIZE + c] ?? '?';
			cells.push(ch === '0' ? blank : ch);
		}
		rows.push(cells.join(' '));
	}
	return rows.join(options.rows === 'lines' ? '\n' : ' / ');
}

// Characters that separate cells or rows and are otherwise ignored.
const SEPARATOR = /[\s,;/|()[\]{}]/;
const BLANKS = new Set(['_', '0']);

const span = (start: number, end: number) => ({ start, end, source: null });

function listTiles(tiles: number[]): string {
	if (tiles.length === 1) return `Tile ${tiles[0]} is`;
	const head = tiles.slice(0, -1).join(', ');
	return `Tiles ${head} and ${tiles[tiles.length - 1]} are`;
}

/**
 * Reads a board typed row by row. Cells are single characters: `1`–`8` for
 * the tiles and `_` or `0` for the blank. Spaces, commas, slashes, line
 * breaks and brackets between them are ignored, so `7 2 4 / 5 _ 6 / 8 3 1`,
 * `724506831`, `7,2,4,5,0,6,8,3,1` and one row per line all read the same.
 * Problems (unknown characters, a wrong number of cells, repeated or missing
 * tiles, no blank) are reported as diagnostics with spans into `text`.
 */
export function parseBoard(text: string): ParsedBoard {
	const diagnostics: Diagnostic[] = [];
	const cells: { value: number; at: number }[] = [];

	for (let i = 0; i < text.length;) {
		const ch = text[i];
		if (SEPARATOR.test(ch)) {
			i++;
			continue;
		}
		if (BLANKS.has(ch) || (ch >= '1' && ch <= '8')) {
			cells.push({ value: BLANKS.has(ch) ? 0 : Number(ch), at: i });
			i++;
			continue;
		}
		// A run of characters that are neither cells nor separators.
		let end = i + 1;
		while (end < text.length) {
			const next = text[end];
			if (SEPARATOR.test(next) || BLANKS.has(next) || (next >= '1' && next <= '8')) break;
			end++;
		}
		const bad = text.slice(i, end);
		diagnostics.push({
			severity: 'error',
			message: `“${bad}” is not a tile: use 1–8 for the tiles and _ or 0 for the blank.`,
			span: span(i, end)
		});
		i = end;
	}

	if (cells.length === 0) {
		if (diagnostics.length === 0) {
			diagnostics.push({
				severity: 'error',
				message: 'The board is empty: enter the nine squares row by row, with _ for the blank.'
			});
		}
		return { board: null, diagnostics };
	}

	const firstAt = new Map<number, number>();
	const reported = new Set<number>();
	for (const cell of cells) {
		if (!firstAt.has(cell.value)) {
			firstAt.set(cell.value, cell.at);
			continue;
		}
		if (reported.has(cell.value)) continue;
		reported.add(cell.value);
		diagnostics.push({
			severity: 'error',
			message:
				cell.value === 0
					? 'The blank appears more than once.'
					: `Tile ${cell.value} appears more than once.`,
			span: span(cell.at, cell.at + 1)
		});
	}

	if (cells.length !== CELLS) {
		const extra = cells.length > CELLS ? cells[CELLS] : null;
		diagnostics.push({
			severity: 'error',
			message: `Expected 9 squares (8 tiles and the blank), found ${cells.length}.`,
			...(extra ? { span: span(extra.at, text.length) } : {})
		});
	}
	if (!firstAt.has(0)) {
		diagnostics.push({
			severity: 'error',
			message: 'No blank: mark the empty square with _ or 0.'
		});
	}
	if (cells.length === CELLS) {
		const missing: number[] = [];
		for (let t = 1; t < CELLS; t++) if (!firstAt.has(t)) missing.push(t);
		if (missing.length) {
			diagnostics.push({ severity: 'error', message: `${listTiles(missing)} missing.` });
		}
	}

	if (diagnostics.some((d) => d.severity === 'error')) return { board: null, diagnostics };
	return { board: cells.map((c) => c.value).join(''), diagnostics };
}
