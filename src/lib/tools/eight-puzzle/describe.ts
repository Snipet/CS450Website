/**
 * Sentences and labels for the 8-puzzle tool: moves, heuristic sums,
 * solvability, solver outcomes, and playback steps.
 */
import { formatCount } from '$lib/components/search/describe';
import {
	OPPOSITE,
	SIZE,
	inversions,
	manhattanDistance,
	misplacedTiles,
	type Board,
	type PuzzleAction,
	type TileDistance
} from '$lib/theory/puzzle';
import type { SolverRun } from './solvers';

/** Arrows for the blank's moves. */
export const ACTION_ARROWS: Readonly<Record<PuzzleAction, string>> = {
	Left: '←',
	Right: '→',
	Up: '↑',
	Down: '↓'
};

/** "Move blank Up: tile 2 slides down." */
export function moveSentence(action: PuzzleAction, tile: number): string {
	return `Move blank ${action}: tile ${tile} slides ${OPPOSITE[action].toLowerCase()}.`;
}

/** A board for screen readers, row by row: "7, 2, 4; 5, blank, 6; 8, 3, 1". */
export function speakBoard(board: Board): string {
	const rows: string[] = [];
	for (let r = 0; r < SIZE; r++) {
		const cells = board
			.slice(r * SIZE, r * SIZE + SIZE)
			.split('')
			.map((c) => (c === '0' ? 'blank' : c));
		rows.push(cells.join(', '));
	}
	return rows.join('; ');
}

/** The h2 sum as written on the slide: "3+1+2+2+2+3+3+2 = 18". */
export function manhattanSum(distances: readonly TileDistance[]): string {
	const total = distances.reduce((s, t) => s + t.distance, 0);
	return `${distances.map((t) => t.distance).join('+')} = ${total}`;
}

export const parity = (n: number): 'even' | 'odd' => (n % 2 === 0 ? 'even' : 'odd');

const inversionCount = (n: number) => `${n} ${n === 1 ? 'inversion' : 'inversions'}`;

/** Solvability in one or two plain sentences. */
export function solvabilityText(start: Board, goal: Board): { solvable: boolean; text: string } {
	const a = inversions(start);
	const b = inversions(goal);
	const solvable = a % 2 === b % 2;
	const counts = `The start board has ${inversionCount(a)} (${parity(a)}) and the goal ${inversionCount(b)} (${parity(b)}).`;
	return {
		solvable,
		text: solvable
			? `${counts} The parities match, so the goal can be reached.`
			: `${counts} No move changes the parity, so no sequence of moves reaches the goal.`
	};
}

/** Milliseconds for the results table: "<1", "12", "1,834". */
export function formatMs(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) return '–';
	if (ms < 1) return '<1';
	return formatCount(Math.round(ms));
}

/**
 * What a finished run found: "26 moves", "Stopped at the node budget (depth
 * limit 20)", "No solution". The generated count of a stopped run is in its
 * own column (it can pass the budget by the last expansion's children).
 */
export function runOutcomeText(run: SolverRun): string {
	switch (run.outcome) {
		case 'solved':
			return `${run.length} ${run.length === 1 ? 'move' : 'moves'}`;
		case 'limit':
			return run.depthLimit !== null
				? `Stopped at the node budget (depth limit ${run.depthLimit})`
				: 'Stopped at the node budget';
		default:
			return run.explored > 0
				? `No solution: ${formatCount(run.explored)} states explored`
				: 'No solution';
	}
}

/** The heuristic values of a board. */
export function heuristicValues(board: Board, goal: Board): { h1: number; h2: number } {
	return { h1: misplacedTiles(board, goal), h2: manhattanDistance(board, goal) };
}

/**
 * The caption of playback step `index` (0 = the start board): the move made
 * and g, h1, h2 of the board it reaches.
 */
export function playbackCaption(
	boards: readonly Board[],
	actions: readonly PuzzleAction[],
	index: number,
	goal: Board
): string {
	const i = Math.max(0, Math.min(index, boards.length - 1));
	const board = boards[i];
	const { h1, h2 } = heuristicValues(board, goal);
	const values = `g = ${i}, h1 = ${h1}, h2 = ${h2}.`;
	if (i === 0) return `Start state. ${values}`;
	const action = actions[i - 1];
	const prev = boards[i - 1];
	const tile = Number(prev[board.indexOf('0')]);
	const done = i === boards.length - 1 && board === goal ? ' Goal reached.' : '';
	return `Move ${i} of ${boards.length - 1}. ${moveSentence(action, tile)} ${values}${done}`;
}
