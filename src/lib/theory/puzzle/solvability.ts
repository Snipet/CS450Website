/**
 * Which boards can reach which (Solving Problems by Searching, slide 10:
 * 181,440 = 9!/2 states). Read the tiles row by row, skipping the blank; an
 * inversion is a pair of tiles in the wrong order. Moving the blank left or
 * right keeps that order; moving it up or down carries one tile past the two
 * tiles between its old and new square, which changes the count by −2, 0 or
 * +2. So the parity of the count never changes, and on a 3 × 3 board a board
 * reaches the goal exactly when the two parities match.
 */
import { CELLS } from './board';
import type { Board } from './types';

/** States reachable from any board: 9!/2. */
export const REACHABLE_STATES = 181_440;

/** Pairs of tiles (the blank skipped) that appear in the opposite of numeric order, reading row by row. */
export function inversions(board: Board): number {
	let n = 0;
	for (let i = 0; i < CELLS; i++) {
		const a = board.charCodeAt(i);
		if (a === 48) continue;
		for (let j = i + 1; j < CELLS; j++) {
			const b = board.charCodeAt(j);
			if (b !== 48 && b < a) n++;
		}
	}
	return n;
}

/** Whether `goal` can be reached from `start`: their inversion counts have the same parity. */
export function isSolvable(start: Board, goal: Board): boolean {
	return inversions(start) % 2 === inversions(goal) % 2;
}
