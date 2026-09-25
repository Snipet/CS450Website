/**
 * 8-puzzle types. See docs/ARCHITECTURE.md §3.6 and §4.3.
 *
 * A board is nine digits read row by row, `0` for the blank:
 * `724506831` is the slide start state `7 2 4 / 5 _ 6 / 8 3 1`.
 */
import type { Diagnostic } from '../diagnostics';

/** Nine digits `0`–`8`, each once, row by row; `0` is the blank. */
export type Board = string;

/** An action moves the blank (Solving Problems by Searching, slide 10); listed in successor order. */
export type PuzzleAction = 'Left' | 'Right' | 'Up' | 'Down';

/** The heuristic a search problem uses: h1 misplaced tiles, h2 Manhattan distance, their max, or 0. */
export type PuzzleHeuristic = 'h1' | 'h2' | 'max' | 'zero';

/** A successor of a board: the blank moves by `action`, sliding `tile` into the old blank square. */
export interface PuzzleMove {
	action: PuzzleAction;
	board: Board;
	tile: number;
}

/** How far a tile is from its goal square (rows plus columns). */
export interface TileDistance {
	tile: number;
	distance: number;
}

export interface FormatBoardOptions {
	/** Text for the blank (default `_`). */
	blank?: string;
	/** `slash` (default): `7 2 4 / 5 _ 6 / 8 3 1`; `lines`: one row per line. */
	rows?: 'slash' | 'lines';
}

export interface ParsedBoard {
	board: Board | null;
	diagnostics: Diagnostic[];
}
