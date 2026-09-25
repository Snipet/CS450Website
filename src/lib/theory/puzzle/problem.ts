/**
 * The 8-puzzle as a search problem for the shared engine (`theory/search`),
 * and seeded scrambles. States are boards; the key is the board string, the
 * label is the formatted board, actions move the blank (Left, Right, Up,
 * Down), and every move costs 1 (Solving Problems by Searching, slide 10).
 */
import { search } from '../search/search';
import type { SearchProblem, Successor } from '../search/types';
import { OPPOSITE, applyMove, formatBoard, moves } from './board';
import { puzzleHeuristic } from './heuristics';
import { REACHABLE_STATES } from './solvability';
import type { Board, PuzzleAction, PuzzleHeuristic } from './types';

/**
 * Limits that never stop a graph search on the 8-puzzle early: each of the
 * 181,440 reachable states is taken off the frontier at most once and has at
 * most four successors.
 */
export const PUZZLE_GRAPH_LIMITS = {
	maxExpansions: REACHABLE_STATES + 1,
	maxNodes: 4 * REACHABLE_STATES + 1
} as const;

/**
 * The puzzle from `start` to `goal` as a search problem. `h` picks the
 * heuristic: `h1` misplaced tiles, `h2` Manhattan distance, `max` the larger
 * of the two, `zero` h = 0.
 */
export function puzzleProblem(
	start: Board,
	goal: Board,
	h: PuzzleHeuristic = 'h2'
): SearchProblem<Board> {
	return {
		initial: start,
		key: (board) => board,
		label: (board) => formatBoard(board),
		successors: (board): Successor<Board>[] =>
			moves(board).map((m) => ({ action: m.action, state: m.board, cost: 1 })),
		isGoal: (board) => board === goal,
		h: puzzleHeuristic(goal, h)
	};
}

/**
 * Number of moves in an optimal solution (breadth-first graph search; every
 * move costs 1), or null when the goal cannot be reached.
 */
export function optimalSolutionLength(start: Board, goal: Board): number | null {
	const result = search(puzzleProblem(start, goal, 'zero'), {
		strategy: 'bfs',
		mode: 'graph',
		record: 'summary',
		...PUZZLE_GRAPH_LIMITS
	});
	return result.solution ? result.solution.depth : null;
}

/** A small seeded pseudo-random generator (mulberry32) returning numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
	let a = Math.trunc(Number.isFinite(seed) ? seed : 0) >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** The moves of `scramble(goal, moves, seed)`, from the goal outward. */
export function scrambleMoves(goal: Board, count: number, seed: number): PuzzleAction[] {
	const random = seededRandom(seed);
	const out: PuzzleAction[] = [];
	let board = goal;
	let last: PuzzleAction | null = null;
	const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
	for (let i = 0; i < n; i++) {
		const options = moves(board).filter((m) => last === null || m.action !== OPPOSITE[last]);
		const pick = options[Math.floor(random() * options.length)];
		out.push(pick.action);
		board = pick.board;
		last = pick.action;
	}
	return out;
}

/**
 * A board `moves` random moves away from `goal`: a random walk of the blank
 * that never undoes the move it just made. The same goal, count and seed
 * always give the same board. The optimal solution can be shorter than the
 * walk when it loops back.
 */
export function scramble(goal: Board, moves: number, seed: number): Board {
	let board = goal;
	for (const action of scrambleMoves(goal, moves, seed)) {
		board = applyMove(board, action) ?? board;
	}
	return board;
}
