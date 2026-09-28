/**
 * The state spaces tool's URL state. A link carrying only
 * LinkStates['state-spaces'] ({ problem?, squares? }) is accepted; the other
 * fields take their defaults.
 */
import { PROBLEM_IDS, type ProblemId } from './content';
import {
	BASIC_STRATEGIES,
	MAX_DRAWN_SQUARES,
	MIN_DRAWN_SQUARES,
	initialState,
	isStateOf,
	type BasicStrategy
} from './space';

export interface StateSpacesState {
	problem: ProblemId;
	/** Squares of the vacuum world (2–4). */
	squares: number;
	/** The state the successor function is applied to (city, vacuum state name, or board). */
	selected: string;
	/** Strategy of the "basic idea" search. */
	strategy: BasicStrategy;
	/** Step of the "basic idea" search. */
	step: number;
}

/** Everything but the step (the step lives in the page's stepper). */
export type StateSpacesConfig = Omit<StateSpacesState, 'step'>;

/** The state without its step. */
export function configOf(s: StateSpacesState): StateSpacesConfig {
	return { problem: s.problem, squares: s.squares, selected: s.selected, strategy: s.strategy };
}

/** What a preset sets: everything but the selected state and the step. */
export type StateSpacesScenario = Pick<StateSpacesState, 'problem' | 'squares' | 'strategy'>;

/** What the URL may hold. `selected` may be null (the initial state). */
export type SavedStateSpaces = Partial<Omit<StateSpacesState, 'selected'>> & {
	selected?: string | null;
};

/** Largest vacuum world accepted in a link (drawn with at most MAX_DRAWN_SQUARES squares). */
const MAX_LINK_SQUARES = 10;

/** The page as first opened: Romania (slide 6), breadth-first search from Arad. */
export function defaultStateSpaces(): StateSpacesState {
	return { problem: 'romania', squares: 2, selected: 'Arad', strategy: 'bfs', step: 0 };
}

const isInt = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export const isProblemId = (v: unknown): v is ProblemId =>
	(PROBLEM_IDS as readonly unknown[]).includes(v);

export const isBasicStrategy = (v: unknown): v is BasicStrategy =>
	(BASIC_STRATEGIES as readonly unknown[]).includes(v);

/** Accepts saved state whose fields, when present, have the right types and ranges. */
export function isSavedStateSpaces(value: unknown): value is SavedStateSpaces {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const v = value as Record<string, unknown>;
	if (v.problem !== undefined && !isProblemId(v.problem)) return false;
	if (v.squares !== undefined && !isInt(v.squares, 1, MAX_LINK_SQUARES)) return false;
	if (v.selected !== undefined && v.selected !== null && typeof v.selected !== 'string')
		return false;
	if (v.strategy !== undefined && !isBasicStrategy(v.strategy)) return false;
	if (v.step !== undefined && !isInt(v.step, 0, Number.MAX_SAFE_INTEGER)) return false;
	return true;
}

/** Squares clamped to the drawable range. */
export const clampSquares = (n: number): number =>
	Math.max(MIN_DRAWN_SQUARES, Math.min(MAX_DRAWN_SQUARES, Math.round(n)));

/**
 * Saved state with defaults for missing fields; squares clamped to 2–4 and a
 * selected state that does not belong to the problem replaced by its initial state.
 */
export function completeStateSpaces(saved: SavedStateSpaces): StateSpacesState {
	const d = defaultStateSpaces();
	const problem = saved.problem ?? d.problem;
	const squares = clampSquares(saved.squares ?? d.squares);
	const selected =
		typeof saved.selected === 'string' && isStateOf(problem, squares, saved.selected)
			? saved.selected
			: initialState(problem, squares);
	return {
		problem,
		squares,
		selected,
		strategy: saved.strategy ?? d.strategy,
		step: saved.step ?? d.step
	};
}

/** The state for a scenario: its initial state selected, the search at its first step. */
export function stateForScenario(s: StateSpacesScenario): StateSpacesState {
	const squares = clampSquares(s.squares);
	return {
		problem: s.problem,
		squares,
		selected: initialState(s.problem, squares),
		strategy: s.strategy,
		step: 0
	};
}
