/**
 * The minimax tool's URL state: the tree text (formatGameTree; it carries the
 * root player and a multi-player order), the search settings, the random
 * tree generator's settings, and the current step. A link carrying only
 * LinkStates['minimax'] (`{ tree, algorithm? }`) is accepted; the other
 * fields take their defaults.
 */
import { hasErrors } from '$lib/theory/diagnostics';
import {
	MAX_DEPTH,
	ORDERINGS,
	maxRandomDepth,
	parseGameTree,
	type Ordering
} from '$lib/theory/games';
import type { LinkStates } from '$lib/tools/links';
import type { Algorithm } from './view';

export const ALGORITHMS: readonly Algorithm[] = ['minimax', 'alphabeta'];

export const MIN_BRANCHING = 2;
export const MAX_BRANCHING = 5;
export const MAX_SEED = 99_999;
export const VALUE_LIMIT = 99;

/** The two-ply game of Games and Adversarial Search, slide 9. */
export const SLIDE_TREE = '[[3 12 8] [2 4 6] [14 5 2]]';

export interface MinimaxToolState {
	tree: string;
	algorithm: Algorithm;
	ordering: Ordering;
	/** Depth at which the search is cut off (evaluation values used), or null. */
	cutoff: number | null;
	/** Action labels on the edges. */
	actions: boolean;
	/** Random tree generator: branching, depth, seed, and utility range. */
	branching: number;
	depth: number;
	seed: number;
	min: number;
	max: number;
	step: number;
}

/** A configuration without the step (what a preset sets). */
export type MinimaxScenario = Omit<MinimaxToolState, 'step'>;

export type SavedMinimaxState = LinkStates['minimax'] &
	Partial<Omit<MinimaxToolState, 'tree' | 'algorithm'>>;

export function defaultMinimaxState(): MinimaxToolState {
	return {
		tree: SLIDE_TREE,
		algorithm: 'alphabeta',
		ordering: 'given',
		cutoff: null,
		actions: true,
		branching: 3,
		depth: 4,
		seed: 1,
		min: 0,
		max: 20,
		step: 0
	};
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const isIntIn = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export const isAlgorithm = (v: unknown): v is Algorithm =>
	(ALGORITHMS as readonly unknown[]).includes(v);
export const isOrdering = (v: unknown): v is Ordering =>
	(ORDERINGS as readonly unknown[]).includes(v);

/** Whether tree text parses without errors. */
export function isValidTreeText(text: string): boolean {
	return !hasErrors(parseGameTree(text).diagnostics);
}

/** Accepts saved state whose tree parses and whose other fields, when present, are in range. */
export function isSavedMinimaxState(value: unknown): value is SavedMinimaxState {
	if (!isObject(value) || typeof value.tree !== 'string' || !isValidTreeText(value.tree))
		return false;
	const checks: [string, (x: unknown) => boolean][] = [
		['algorithm', isAlgorithm],
		['ordering', isOrdering],
		['cutoff', (x) => x === null || isIntIn(x, 1, MAX_DEPTH)],
		['actions', (x) => typeof x === 'boolean'],
		['branching', (x) => isIntIn(x, MIN_BRANCHING, MAX_BRANCHING)],
		['depth', (x) => isIntIn(x, 1, MAX_DEPTH)],
		['seed', (x) => isIntIn(x, 0, MAX_SEED)],
		['min', (x) => isIntIn(x, -VALUE_LIMIT, VALUE_LIMIT)],
		['max', (x) => isIntIn(x, -VALUE_LIMIT, VALUE_LIMIT)],
		['step', (x) => isIntIn(x, 0, Number.MAX_SAFE_INTEGER)]
	];
	return checks.every(([key, ok]) => value[key] === undefined || ok(value[key]));
}

/** Saved state with defaults for missing fields; the random depth is kept within the limits. */
export function completeMinimaxState(saved: SavedMinimaxState): MinimaxToolState {
	const d = defaultMinimaxState();
	const branching = saved.branching ?? d.branching;
	return {
		tree: saved.tree,
		algorithm: saved.algorithm ?? d.algorithm,
		ordering: saved.ordering ?? d.ordering,
		cutoff: saved.cutoff === undefined ? d.cutoff : saved.cutoff,
		actions: saved.actions ?? d.actions,
		branching,
		depth: Math.min(saved.depth ?? d.depth, maxRandomDepth(branching)),
		seed: saved.seed ?? d.seed,
		min: saved.min ?? d.min,
		max: saved.max ?? d.max,
		step: saved.step ?? 0
	};
}

/** A whole number in [min, max] (min for NaN). */
export function wholeIn(v: number, min: number, max: number): number {
	if (!Number.isFinite(v)) return Number.isNaN(v) ? min : v > 0 ? max : min;
	return Math.min(max, Math.max(min, Math.round(v)));
}
