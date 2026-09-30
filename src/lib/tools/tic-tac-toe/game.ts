/**
 * A game as the page keeps it: the position it started from and the squares
 * played since. Undo steps back to the last position where a human player is
 * to move, so a computer reply does not follow at once.
 */
import {
	LINES,
	isFull,
	playMoves,
	toMove,
	winningLines,
	type Board,
	type Mark
} from '$lib/theory/games/tictactoe';
import { hasHuman, type Players } from './players';

/** The boards of a game, starting with `start`; stops before the first illegal move. */
export function gameBoards(start: Board, squares: readonly number[]): Board[] {
	const all = playMoves(start, squares);
	if (all) return all;
	// Keep the longest legal prefix.
	for (let n = squares.length - 1; n >= 0; n--) {
		const prefix = playMoves(start, squares.slice(0, n));
		if (prefix) return prefix;
	}
	return [start];
}

/** How many of the game's moves remain after Undo. `boards[k]` is the board after k moves. */
export function undoLength(boards: readonly Board[], players: Players): number {
	let n = boards.length - 2;
	if (n < 0) return 0;
	if (!hasHuman(players)) return n;
	while (n > 0 && players[toMove(boards[n])] !== 'human') n--;
	return n;
}

export type GameStatus =
	| { kind: 'playing'; mark: Mark }
	| { kind: 'won'; mark: Mark; lines: number[]; squares: number[] }
	| { kind: 'draw' };

export function gameStatus(board: Board): GameStatus {
	const lines = winningLines(board);
	if (lines.length) {
		const squares = [...new Set(lines.flatMap((l) => [...LINES[l.line]]))].sort((a, b) => a - b);
		return { kind: 'won', mark: lines[0].mark, lines: lines.map((l) => l.line), squares };
	}
	if (isFull(board)) return { kind: 'draw' };
	return { kind: 'playing', mark: toMove(board) };
}
