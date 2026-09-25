/**
 * Heuristics for the 8-puzzle (Informed Search, slides 32–37): h1 counts
 * misplaced tiles, h2 adds up the Manhattan distances of the tiles; the
 * blank is never counted.
 */
import { CELLS, SIZE } from './board';
import type { Board, PuzzleHeuristic, TileDistance } from './types';

/** Heuristics in menu order. */
export const PUZZLE_HEURISTICS: readonly PuzzleHeuristic[] = ['h1', 'h2', 'max', 'zero'];

/** Goal square of each tile, indexed by tile (index 0 is the blank). */
function goalCells(goal: Board): Int8Array {
	const at = new Int8Array(CELLS);
	for (let i = 0; i < CELLS; i++) at[goal.charCodeAt(i) - 48] = i;
	return at;
}

function misplacedWith(board: Board, goal: Board): number {
	let n = 0;
	for (let i = 0; i < CELLS; i++) {
		const c = board.charCodeAt(i);
		if (c !== 48 && c !== goal.charCodeAt(i)) n++;
	}
	return n;
}

function manhattanWith(board: Board, at: Int8Array): number {
	let sum = 0;
	for (let i = 0; i < CELLS; i++) {
		const tile = board.charCodeAt(i) - 48;
		if (tile === 0) continue;
		const g = at[tile];
		sum += Math.abs(((i / SIZE) | 0) - ((g / SIZE) | 0)) + Math.abs((i % SIZE) - (g % SIZE));
	}
	return sum;
}

/** h1(n): the number of tiles not on their goal square (the blank does not count). */
export function misplacedTiles(board: Board, goal: Board): number {
	return misplacedWith(board, goal);
}

/** h2(n): the sum over tiles 1–8 of the rows plus columns between each tile and its goal square. */
export function manhattanDistance(board: Board, goal: Board): number {
	return manhattanWith(board, goalCells(goal));
}

/** Each tile's Manhattan distance to its goal square, tiles 1–8 in order (the terms of h2). */
export function tileDistances(board: Board, goal: Board): TileDistance[] {
	const at = goalCells(goal);
	const out: TileDistance[] = [];
	for (let tile = 1; tile < CELLS; tile++) {
		const i = board.indexOf(String(tile));
		const g = at[tile];
		const distance =
			Math.abs(Math.floor(i / SIZE) - Math.floor(g / SIZE)) + Math.abs((i % SIZE) - (g % SIZE));
		out.push({ tile, distance });
	}
	return out;
}

/**
 * The heuristic as a function of the board, for a fixed goal: h1, h2,
 * max(h1, h2) (Informed Search, slide 37), or 0.
 */
export function puzzleHeuristic(goal: Board, h: PuzzleHeuristic): (board: Board) => number {
	const at = goalCells(goal);
	switch (h) {
		case 'h1':
			return (board) => misplacedWith(board, goal);
		case 'h2':
			return (board) => manhattanWith(board, at);
		case 'max':
			return (board) => Math.max(misplacedWith(board, goal), manhattanWith(board, at));
		default:
			return () => 0;
	}
}
