/**
 * The vacuum world as a search problem (Solving Problems by Searching, slides
 * 8–9): n squares in a row, the agent in one of them, each square dirty or
 * clean, so n·2ⁿ states. Actions Left, Right, Suck cost 1 each; an action with
 * no effect (Left in the leftmost square, Right in the rightmost, Suck on a
 * clean square) is a self-loop, as on the slide 9 diagram.
 *
 * State names: the agent's square letter, a space, then `D` (dirty) or `C`
 * (clean) for each square from left to right. With two squares, "A DD" has the
 * agent in A and both squares dirty (the slide 3 picture) and "B CD" has the
 * agent in B with only B dirty. Squares are lettered A, B, C, D, E.
 */
import type { Diagnostic } from '../diagnostics';
import type { GraphProblemSpec, WeightedGraph } from '../graphs/types';
import type { SearchProblem, Successor } from '../search/types';

export const MIN_SQUARES = 2;
export const MAX_SQUARES = 5;

/** The actions of slide 8, in successor order. */
export type SpaceAction = 'Left' | 'Right' | 'Suck';
export const SPACE_ACTIONS: readonly SpaceAction[] = ['Left', 'Right', 'Suck'];

export interface VacuumState {
	/** Index of the agent's square (0 = leftmost, A). */
	location: number;
	/** Whether each square is dirty, left to right. */
	dirt: readonly boolean[];
}

export interface VacuumTransition {
	from: string;
	to: string;
	action: SpaceAction;
}

/** Drawing units between neighboring states in the default layout. */
export const SPACE_SPACING = 140;
const GROUP_GAP = 70;
const ROW_SPACING = 120;

function checkSquares(n: number): void {
	if (!Number.isInteger(n) || n < MIN_SQUARES || n > MAX_SQUARES) {
		throw new RangeError(
			`The vacuum world has ${MIN_SQUARES}–${MAX_SQUARES} squares here (got ${n}).`
		);
	}
}

/** Letter of square `i`: A, B, C, … */
export function squareLetter(i: number): string {
	return String.fromCharCode(65 + i);
}

/** Number of states with `n` squares: n·2ⁿ (8 for the two-square world). */
export function vacuumStateCount(n: number): number {
	return n * 2 ** n;
}

/** "A DD" */
export function vacuumStateName(state: VacuumState): string {
	return `${squareLetter(state.location)} ${state.dirt.map((d) => (d ? 'D' : 'C')).join('')}`;
}

/**
 * Reads a state name ("A DD", "c dcd"; case-insensitive, the space optional).
 * With `squares`, the name must describe that many squares.
 */
export function parseVacuumState(
	text: string,
	squares?: number
): { state: VacuumState | null; diagnostics: Diagnostic[] } {
	const span = { start: 0, end: text.length, source: null };
	const m = /^\s*([A-Za-z])\s*([CDcd]+)\s*$/.exec(text);
	if (!m) {
		return {
			state: null,
			diagnostics: [
				{
					severity: 'error',
					message: 'Write a state as the agent’s square and a C or D for each square, e.g. "A DD".',
					span
				}
			]
		};
	}
	const dirt = [...m[2].toUpperCase()].map((c) => c === 'D');
	const location = m[1].toUpperCase().charCodeAt(0) - 65;
	const n = squares ?? dirt.length;
	const diagnostics: Diagnostic[] = [];
	if (dirt.length !== n) {
		diagnostics.push({
			severity: 'error',
			message: `The state lists ${dirt.length} squares; the world has ${n}.`,
			span
		});
	} else if (n < MIN_SQUARES || n > MAX_SQUARES) {
		diagnostics.push({
			severity: 'error',
			message: `The world has ${MIN_SQUARES}–${MAX_SQUARES} squares.`,
			span
		});
	}
	if (location >= dirt.length) {
		diagnostics.push({
			severity: 'error',
			message: `There is no square ${squareLetter(location)} in a ${dirt.length}-square world.`,
			span
		});
	}
	return { state: diagnostics.length ? null : { location, dirt }, diagnostics };
}

/**
 * All states in layout order: rows by number of clean squares (none first),
 * within a row by dirt pattern (C before D, left to right), and the agent's
 * square A, B, … for each pattern. For two squares this is the slide 9 order:
 * A DD, B DD, A CD, B CD, A DC, B DC, A CC, B CC.
 */
export function vacuumStates(n: number): VacuumState[] {
	checkSquares(n);
	const patterns: boolean[][] = [];
	for (let mask = 0; mask < 2 ** n; mask++) {
		// Bit i (from the left) set = square i clean.
		patterns.push(Array.from({ length: n }, (_, i) => !(mask & (1 << (n - 1 - i)))));
	}
	const clean = (d: boolean[]) => d.filter((x) => !x).length;
	const text = (d: boolean[]) => d.map((x) => (x ? 'D' : 'C')).join('');
	patterns.sort((a, b) => clean(a) - clean(b) || (text(a) < text(b) ? -1 : 1));
	return patterns.flatMap((dirt) =>
		Array.from({ length: n }, (_, location) => ({ location, dirt }))
	);
}

/** The result of an action (slide 8 transition model). */
export function vacuumResult(state: VacuumState, action: SpaceAction): VacuumState {
	const n = state.dirt.length;
	switch (action) {
		case 'Left':
			return { location: Math.max(0, state.location - 1), dirt: state.dirt };
		case 'Right':
			return { location: Math.min(n - 1, state.location + 1), dirt: state.dirt };
		default:
			return {
				location: state.location,
				dirt: state.dirt.map((d, i) => (i === state.location ? false : d))
			};
	}
}

/** Whether every square is clean (the goal). */
export function isAllClean(state: VacuumState): boolean {
	return state.dirt.every((d) => !d);
}

/**
 * Every transition, three per state (Left, Right, Suck), self-loops included,
 * in the order of `vacuumStateSpace(n).edges` (edge i is transition i).
 */
export function vacuumTransitions(n: number): VacuumTransition[] {
	return vacuumStates(n).flatMap((s) =>
		SPACE_ACTIONS.map((action) => ({
			from: vacuumStateName(s),
			to: vacuumStateName(vacuumResult(s, action)),
			action
		}))
	);
}

/**
 * Drawing positions: one row per number of clean squares, the states of a dirt
 * pattern side by side (Left/Right pairs next to each other), Suck edges going
 * down to the next row. For two squares this is the slide 9 layout: A DD and
 * B DD on top, A CD, B CD, A DC, B DC in the middle, A CC and B CC at the bottom.
 */
export function vacuumPositions(n: number): Map<string, { x: number; y: number }> {
	const states = vacuumStates(n);
	const rows = new Map<number, VacuumState[]>();
	for (const s of states) {
		const c = s.dirt.filter((d) => !d).length;
		if (!rows.has(c)) rows.set(c, []);
		rows.get(c)!.push(s);
	}
	const groupWidth = (n - 1) * SPACE_SPACING;
	const pitch = groupWidth + SPACE_SPACING + GROUP_GAP;
	const rowWidth = (groups: number) => groups * pitch - SPACE_SPACING - GROUP_GAP;
	const widest = Math.max(...[...rows.values()].map((r) => rowWidth(r.length / n)));
	const out = new Map<string, { x: number; y: number }>();
	for (const [c, row] of rows) {
		const offset = (widest - rowWidth(row.length / n)) / 2;
		row.forEach((s, i) => {
			const group = Math.floor(i / n);
			out.set(vacuumStateName(s), {
				x: offset + group * pitch + s.location * SPACE_SPACING,
				y: c * ROW_SPACING
			});
		});
	}
	return out;
}

/**
 * The state-space graph: n·2ⁿ states with positions (`vacuumPositions`) and
 * a directed edge of cost 1 for every transition, self-loops included. A state
 * with two actions that do nothing (e.g. Left and Suck in "A CD") has two
 * parallel self-loops; `vacuumTransitions` names the action of each edge.
 */
export function vacuumStateSpace(n = 2): WeightedGraph {
	const positions = vacuumPositions(n);
	return {
		directed: true,
		nodes: vacuumStates(n).map((s) => {
			const id = vacuumStateName(s);
			return { id, ...positions.get(id)! };
		}),
		edges: vacuumTransitions(n).map((t) => ({ from: t.from, to: t.to, cost: 1 }))
	};
}

/** Names of the goal states (all squares clean, the agent anywhere). */
export function vacuumGoals(n: number): string[] {
	return vacuumStates(n)
		.filter(isAllClean)
		.map((s) => vacuumStateName(s));
}

function stateOf(name: string, n: number): VacuumState {
	const { state } = parseVacuumState(name, n);
	if (!state) throw new RangeError(`"${name}" is not a state of the ${n}-square vacuum world.`);
	return state;
}

/**
 * The vacuum world as a `SearchProblem` over state names: successors in the
 * order Left, Right, Suck with step cost 1, goal "all squares clean".
 * `selfLoops: false` leaves out actions that do not change the state.
 * Throws on a start name that is not a state (check user text with
 * `parseVacuumState` first).
 */
export function vacuumProblem(
	n: number,
	start: string,
	options: { selfLoops?: boolean } = {}
): SearchProblem<string> {
	checkSquares(n);
	const initial = vacuumStateName(stateOf(start, n));
	const selfLoops = options.selfLoops ?? true;
	const cache = new Map<string, Successor<string>[]>();
	return {
		initial,
		key: (s) => s,
		label: (s) => s,
		successors(name) {
			let list = cache.get(name);
			if (!list) {
				const state = stateOf(name, n);
				list = SPACE_ACTIONS.map((action) => ({
					action,
					state: vacuumStateName(vacuumResult(state, action)),
					cost: 1
				})).filter((s) => selfLoops || s.state !== name);
				cache.set(name, list);
			}
			return list;
		},
		// The dirt part follows the space (the location letter may itself be D).
		isGoal: (name) => !name.slice(name.indexOf(' ') + 1).includes('D')
	};
}

/** The state space with a start and its goals, for the graph tools (StateGraph, graphProblem). */
export function vacuumProblemSpec(n: number, start: string): GraphProblemSpec {
	return {
		graph: vacuumStateSpace(n),
		start: vacuumStateName(stateOf(start, n)),
		goals: vacuumGoals(n)
	};
}
