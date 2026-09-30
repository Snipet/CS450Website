/**
 * Tic-tac-toe as a game tree (Games and Adversarial Search, slide 6): X is
 * MAX and moves first, O is MIN, and terminal utilities are for MAX: +1 when
 * X wins, 0 for a draw, −1 when O wins.
 *
 * A board is nine characters row by row, `X`, `O`, or `.` for an empty
 * square (`X.O.X...O`). Squares are numbered 1–9 row by row from the top
 * left; in code they are indices 0–8. Successors are generated in square
 * order. Whose turn it is follows from the counts: X when both players have
 * the same number of marks, otherwise O.
 *
 * Search (minimax, alpha-beta, evaluation functions, tree counts) is in
 * `tictactoe-search.ts`.
 */
import type { Diagnostic } from '../diagnostics';

export type Mark = 'X' | 'O';
/** Nine characters row by row: `X`, `O`, or `.` for an empty square. */
export type Board = string;
export type GamePlayer = 'MAX' | 'MIN';

export const CELLS = 9;
export const EMPTY = '.';
export const EMPTY_BOARD: Board = '.........';

/** The eight lines: rows top to bottom, columns left to right, then the two diagonals. */
export const LINES: readonly (readonly [number, number, number])[] = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6]
];

export const LINE_NAMES: readonly string[] = [
	'top row',
	'middle row',
	'bottom row',
	'left column',
	'middle column',
	'right column',
	'diagonal from the top left',
	'diagonal from the top right'
];

/** Square names by index (square 1 is index 0). */
export const SQUARE_NAMES: readonly string[] = [
	'top left',
	'top middle',
	'top right',
	'middle left',
	'center',
	'middle right',
	'bottom left',
	'bottom middle',
	'bottom right'
];

const BOARD_RE = /^[XO.]{9}$/;

/** Whether `value` is a board string (nine of `X`, `O`, `.`); legality is not checked. */
export function isBoard(value: unknown): value is Board {
	return typeof value === 'string' && BOARD_RE.test(value);
}

/** The square's number, 1–9, for an index 0–8. */
export const squareNumber = (square: number): number => square + 1;

/** "square 5 (center)". */
export function squareLabel(square: number): string {
	return `square ${square + 1} (${SQUARE_NAMES[square]})`;
}

export function countMarks(board: Board): { X: number; O: number } {
	let x = 0;
	let o = 0;
	for (const c of board) {
		if (c === 'X') x++;
		else if (c === 'O') o++;
	}
	return { X: x, O: o };
}

/** The mark that moves next: X when the counts are equal, otherwise O. */
export function toMove(board: Board): Mark {
	const { X, O } = countMarks(board);
	return X === O ? 'X' : 'O';
}

export const playerOf = (mark: Mark): GamePlayer => (mark === 'X' ? 'MAX' : 'MIN');
export const other = (mark: Mark): Mark => (mark === 'X' ? 'O' : 'X');

/** Lines completed on the board, as indices into `LINES`, with their owner. */
export function winningLines(board: Board): { mark: Mark; line: number }[] {
	const out: { mark: Mark; line: number }[] = [];
	for (let i = 0; i < LINES.length; i++) {
		const [a, b, c] = LINES[i];
		const m = board[a];
		if (m !== EMPTY && m === board[b] && m === board[c]) out.push({ mark: m as Mark, line: i });
	}
	return out;
}

/** The player with three in a row, or null. (On a legal board at most one player has one.) */
export function winner(board: Board): Mark | null {
	for (const [a, b, c] of LINES) {
		const m = board[a];
		if (m !== EMPTY && m === board[b] && m === board[c]) return m as Mark;
	}
	return null;
}

export const isFull = (board: Board): boolean => !board.includes(EMPTY);

/** A win for either player or a full board. */
export const isTerminal = (board: Board): boolean => winner(board) !== null || isFull(board);

/** Utility for MAX of a terminal board: +1 X wins, −1 O wins, 0 otherwise (a draw). */
export function utility(board: Board): number {
	const w = winner(board);
	return w === 'X' ? 1 : w === 'O' ? -1 : 0;
}

/** Empty squares in square order; none once the game is over. */
export function legalMoves(board: Board): number[] {
	if (isTerminal(board)) return [];
	const out: number[] = [];
	for (let i = 0; i < CELLS; i++) if (board[i] === EMPTY) out.push(i);
	return out;
}

/**
 * The board after the side to move marks `square`. Throws on an occupied
 * square or a finished game (a programming error: callers offer legal moves only).
 */
export function result(board: Board, square: number): Board {
	if (board[square] !== EMPTY || isTerminal(board)) {
		throw new Error(`Illegal move: square ${square + 1} on ${board}`);
	}
	return board.slice(0, square) + toMove(board) + board.slice(square + 1);
}

/** Boards visited playing `squares` from `board`, starting with `board`; null at the first illegal move. */
export function playMoves(board: Board, squares: readonly number[]): Board[] | null {
	const out = [board];
	let b = board;
	for (const s of squares) {
		if (!Number.isInteger(s) || s < 0 || s >= CELLS || b[s] !== EMPTY || isTerminal(b)) return null;
		b = result(b, s);
		out.push(b);
	}
	return out;
}

/** The square where `after` differs from `before` by one new mark, or null. */
export function moveBetween(before: Board, after: Board): number | null {
	let found: number | null = null;
	for (let i = 0; i < CELLS; i++) {
		if (before[i] === after[i]) continue;
		if (before[i] !== EMPTY || found !== null) return null;
		found = i;
	}
	return found;
}

/**
 * Board as text: `X O . / . X . / . . O` (default), one row per line, or the
 * nine characters as stored.
 */
export function formatBoard(
	board: Board,
	{ rows = 'slash' }: { rows?: 'slash' | 'lines' | 'compact' } = {}
): string {
	if (rows === 'compact') return board;
	const r = [0, 3, 6].map((i) => [...board.slice(i, i + 3)].join(' '));
	return r.join(rows === 'lines' ? '\n' : ' / ');
}

/**
 * Problems that make a board impossible in a game where X moves first and
 * the players alternate: wrong counts, both players with three in a row, or
 * a move after the game was won. An empty list means the board is reachable.
 */
export function boardDiagnostics(board: Board): Diagnostic[] {
	const out: Diagnostic[] = [];
	const { X, O } = countMarks(board);
	const error = (message: string) => out.push({ severity: 'error', message });
	if (O > X) {
		error(
			`O has ${O} ${O === 1 ? 'mark' : 'marks'} and X has ${X}: X moves first, so O never has more marks than X.`
		);
	} else if (X > O + 1) {
		error(
			`X has ${X} marks and O has ${O}: the players alternate, so X has at most one mark more than O.`
		);
	}
	if (out.length) return out;
	const lines = winningLines(board);
	const xWins = lines.some((l) => l.mark === 'X');
	const oWins = lines.some((l) => l.mark === 'O');
	if (xWins && oWins) {
		error('Both X and O have three in a row: the game ends at the first line.');
	} else if (xWins && X === O) {
		error('X has three in a row but O moved after it: the game ends when X completes a line.');
	} else if (oWins && X > O) {
		error('O has three in a row but X moved after it: the game ends when O completes a line.');
	}
	return out;
}

const EMPTY_CHARS = new Set(['.', '_', '-']);
const SEPARATORS = /[\s/|,;[\](){}]/;

/**
 * Reads the squares of a typed board without checking that the position is
 * possible: one character per square row by row, `X` or `O` (either case)
 * for marks and `.`, `_`, or `-` for an empty square. Spaces, slashes, `|`,
 * commas, semicolons, brackets and line breaks are ignored, so
 * `X O . / . X . / . . O`, `XO..X...O` and one row per line read the same.
 * Unknown characters and a wrong number of squares are errors (with spans);
 * `cells` is null when there is one.
 */
export function readBoardText(text: string): { cells: string | null; diagnostics: Diagnostic[] } {
	const diagnostics: Diagnostic[] = [];
	let cells = '';
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (SEPARATORS.test(c)) continue;
		const u = c.toUpperCase();
		if (u === 'X' || u === 'O') cells += u;
		else if (EMPTY_CHARS.has(c)) cells += EMPTY;
		else {
			const hint = c === '0' ? ' (use the letter O)' : '';
			diagnostics.push({
				severity: 'error',
				message: `Unexpected character “${c}”${hint}: use X, O, or . for an empty square.`,
				span: { start: i, end: i + 1, source: null }
			});
		}
	}
	if (diagnostics.length) return { cells: null, diagnostics };
	if (cells.length !== CELLS) {
		diagnostics.push({
			severity: 'error',
			message: `A board has 9 squares; this one has ${cells.length}.`,
			span: { start: 0, end: text.length, source: null }
		});
		return { cells: null, diagnostics };
	}
	return { cells, diagnostics };
}

/**
 * Reads a typed board (`readBoardText`) and checks that it is a possible
 * position (`boardDiagnostics`). `board` is null when there is an error.
 */
export function parseBoard(text: string): { board: Board | null; diagnostics: Diagnostic[] } {
	const { cells, diagnostics } = readBoardText(text);
	if (cells === null) return { board: null, diagnostics };
	const legality = boardDiagnostics(cells);
	if (legality.length) return { board: null, diagnostics: legality };
	return { board: cells, diagnostics };
}

/** Squares 1–9 as a digit string (`"519"`) for URLs; the inverse of `parseMoveText`. */
export const moveText = (squares: readonly number[]): string =>
	squares.map((s) => String(s + 1)).join('');

/** Reads `moveText` output; null unless every character is a digit 1–9. */
export function parseMoveText(text: string): number[] | null {
	if (!/^[1-9]*$/.test(text)) return null;
	return [...text].map((c) => Number(c) - 1);
}
