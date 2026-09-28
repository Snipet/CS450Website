/**
 * The 8-puzzle tool's share-link state. It accepts `LinkStates['eight-puzzle']`
 * (`{ start, goal? }`, boards as nine digits with 0 for the blank) and adds
 * the scramble settings and the board overlays.
 */
import { SLIDE_GOAL, SLIDE_START, parseBoard, type Board } from '$lib/theory/puzzle';
import type { LinkStates } from '$lib/tools/links';

export const MIN_SCRAMBLE = 1;
export const MAX_SCRAMBLE = 100;
export const MAX_SEED = 99_999;

export interface PuzzleState {
	start: Board;
	goal: Board;
	/** Scramble length. */
	moves: number;
	/** Scramble seed. */
	seed: number;
	/** Highlight misplaced tiles (h1) on the board. */
	misplaced: boolean;
	/** Show each tile's Manhattan distance (h2) on the board. */
	distances: boolean;
}

export type SavedPuzzleState = LinkStates['eight-puzzle'] &
	Partial<Omit<PuzzleState, 'start' | 'goal'>>;

export function defaultPuzzleState(): PuzzleState {
	return {
		start: SLIDE_START,
		goal: SLIDE_GOAL,
		moves: 20,
		seed: 1,
		misplaced: true,
		distances: true
	};
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const optional = (v: unknown, type: 'string' | 'number' | 'boolean') =>
	v === undefined || typeof v === type;

/** Whether a decoded hash has the right shape (boards are checked by `completePuzzleState`). */
export function isSavedPuzzleState(value: unknown): value is SavedPuzzleState {
	if (!isObject(value) || typeof value.start !== 'string') return false;
	return (
		optional(value.goal, 'string') &&
		optional(value.moves, 'number') &&
		optional(value.seed, 'number') &&
		optional(value.misplaced, 'boolean') &&
		optional(value.distances, 'boolean')
	);
}

const clampInt = (n: number | undefined, min: number, max: number, fallback: number) =>
	n === undefined || !Number.isFinite(n) ? fallback : Math.min(max, Math.max(min, Math.round(n)));

/** A saved state with defaults for missing or unreadable fields. */
export function completePuzzleState(saved: SavedPuzzleState): PuzzleState {
	const d = defaultPuzzleState();
	return {
		start: parseBoard(saved.start).board ?? d.start,
		goal: (saved.goal !== undefined && parseBoard(saved.goal).board) || d.goal,
		moves: clampInt(saved.moves, MIN_SCRAMBLE, MAX_SCRAMBLE, d.moves),
		seed: clampInt(saved.seed, 0, MAX_SEED, d.seed),
		misplaced: saved.misplaced ?? d.misplaced,
		distances: saved.distances ?? d.distances
	};
}
