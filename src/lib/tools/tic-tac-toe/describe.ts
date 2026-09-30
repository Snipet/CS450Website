/**
 * Words for the tic-tac-toe tool: values, moves, results, and the
 * screen-reader text of boards and squares.
 */
import {
	LINE_NAMES,
	SQUARE_NAMES,
	playerOf,
	squareLabel,
	toMove,
	type Board,
	type Mark
} from '$lib/theory/games/tictactoe';
import { WIN_SCORE } from '$lib/theory/games/tictactoe-search';
import { formatCount } from '$lib/theory/search';
import type { GameStatus } from './game';
import { PLAYER_INFO, type ComputerMove } from './players';

const MINUS = '−';

/** "+1", "0", "−1", "+4", "−100". */
export function formatValue(v: number): string {
	if (v > 0) return `+${v}`;
	if (v < 0) return `${MINUS}${-v}`;
	return '0';
}

/** What a full-search value means for MAX: "X wins", "draw", "O wins". */
export function outcomeWord(v: number): string {
	return v > 0 ? 'X wins' : v < 0 ? 'O wins' : 'draw';
}

/**
 * The outcome a depth-limited value stands for, when it is one: ±WIN_SCORE is
 * a win found within the cutoff; anything else is an evaluation (or a draw).
 */
export function cutoffWord(v: number): string | null {
	if (v === WIN_SCORE) return 'X wins';
	if (v === -WIN_SCORE) return 'O wins';
	return null;
}

/** "Minimax value +1: X wins with perfect play by both sides." */
export function valueSentence(v: number): string {
	const what =
		v > 0
			? 'X wins with perfect play by both sides'
			: v < 0
				? 'O wins with perfect play by both sides'
				: 'a draw with perfect play by both sides';
	return `Minimax value ${formatValue(v)}: ${what}.`;
}

/** "square 5 (center)" with an uppercase first letter. */
export const squareTitle = (square: number): string =>
	`Square ${square + 1} (${SQUARE_NAMES[square]})`;

const cellWord = (c: string) => (c === 'X' ? 'X' : c === 'O' ? 'O' : 'empty');

/** "Row 1: X, O, empty. Row 2: …" */
export function speakBoard(board: Board): string {
	return [0, 1, 2]
		.map((r) => `Row ${r + 1}: ${[...board.slice(r * 3, r * 3 + 3)].map(cellWord).join(', ')}`)
		.join('. ');
}

export function statusHeadline(status: GameStatus): string {
	if (status.kind === 'playing') return `${status.mark} to move`;
	if (status.kind === 'won') return `${status.mark} wins`;
	return 'Draw';
}

/** "X wins: top row." / "Draw: the board is full and nobody has three in a row." */
export function resultSentence(status: GameStatus): string {
	if (status.kind === 'won') {
		const lines = status.lines.map((l) => LINE_NAMES[l]).join(' and ');
		return `${status.mark} wins: ${lines}.`;
	}
	if (status.kind === 'draw') return 'Draw: the board is full and nobody has three in a row.';
	return `${status.mark} (${playerOf(status.mark)}) to move.`;
}

/** "X plays square 5 (center)." */
export function moveSentence(mark: Mark, square: number): string {
	return `${mark} plays ${squareLabel(square)}.`;
}

/** Announcement after a move: the move, then whose turn it is or the result. */
export function announceMove(before: Board, square: number, status: GameStatus): string {
	return `${moveSentence(toMove(before), square)} ${resultSentence(status)}`;
}

/** "O (minimax) played square 5 (center): value 0; 59,704 nodes visited." */
export function computerSummary(mark: Mark, move: ComputerMove): string {
	const { search } = move;
	const who =
		move.kind === 'depth'
			? `${mark} (depth-limited, cutoff ${search.depth})`
			: `${mark} (${PLAYER_INFO[move.kind].label.toLowerCase()})`;
	const value =
		move.kind === 'depth'
			? `backed-up value ${formatValue(search.value)}`
			: `minimax value ${formatValue(search.value)}`;
	const c = search.counts;
	const parts = [`${formatCount(c.nodes)} ${c.nodes === 1 ? 'node' : 'nodes'} visited`];
	if (move.kind !== 'minimax') {
		parts.push(`${formatCount(c.cutoffs)} ${c.cutoffs === 1 ? 'cutoff' : 'cutoffs'}`);
	}
	if (move.kind === 'depth') parts.push(`${formatCount(c.evaluations)} scored with Eval`);
	return `${who} played ${squareLabel(move.square)}: ${value}; ${parts.join(', ')}.`;
}

export interface SquareFacts {
	square: number;
	mark: string;
	/** Value shown on an empty square, if any. */
	value?: number | null;
	/** 'minimax' (+1/0/−1) or 'depth' (backed-up Eval). */
	mode?: 'minimax' | 'depth';
	best?: boolean;
	winning?: boolean;
	last?: boolean;
}

/** Accessible name of a board square. */
export function squareDescription(f: SquareFacts): string {
	const parts = [`${squareTitle(f.square)}: ${cellWord(f.mark)}`];
	if (f.mark === '.' && f.value !== null && f.value !== undefined) {
		if (f.mode === 'depth') {
			const word = cutoffWord(f.value);
			parts.push(`depth-limited value ${formatValue(f.value)}${word ? ` (${word})` : ''}`);
		} else {
			parts.push(`minimax value ${formatValue(f.value)} (${outcomeWord(f.value)})`);
		}
	}
	if (f.best) parts.push('best move');
	if (f.winning) parts.push('part of the winning line');
	if (f.last) parts.push('last move');
	return parts.join(', ');
}
