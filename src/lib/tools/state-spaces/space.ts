/**
 * The example problems as state spaces for the state spaces tool: the graphs
 * to draw, the successor function of each problem, the search that grows from
 * the start state (Solving Problems by Searching, slides 13–26), and the graph
 * text for opening a problem in the search tool.
 */
import { describeStep, priorityPhrase } from '$lib/components/search/describe';
import type { LoopSide } from '$lib/components/search/graph-scene';
import {
	SPACE_ACTIONS,
	SPACE_SPACING,
	parseVacuumState,
	squareLetter,
	vacuumGoals,
	vacuumProblem,
	vacuumResult,
	vacuumStateName,
	vacuumStateSpace,
	vacuumStates,
	vacuumTransitions,
	type SpaceAction
} from '$lib/theory/agents/vacuum-space';
import {
	ROMANIA_PROBLEM,
	adjacency,
	formatGraphText,
	graphProblem,
	type GraphEdge,
	type GraphProblemSpec,
	type WeightedGraph
} from '$lib/theory/graphs';
import {
	SLIDE_GOAL,
	SLIDE_START,
	isBoard,
	isSolvable,
	moves,
	type Board
} from '$lib/theory/puzzle';
import { search, usesPriority, type SearchNode, type SearchResult } from '$lib/theory/search';
import type { ProblemId } from './content';

/** Problems whose state space is drawn (and searched) on the page. */
export type GraphProblemId = 'romania' | 'vacuum';

export const isGraphProblem = (p: ProblemId): p is GraphProblemId =>
	p === 'romania' || p === 'vacuum';

/** Squares of the vacuum world that can be drawn. */
export const MIN_DRAWN_SQUARES = 2;
export const MAX_DRAWN_SQUARES = 4;

/** Strategies for the "basic idea" search. */
export type BasicStrategy = 'bfs' | 'ucs';
export const BASIC_STRATEGIES: readonly BasicStrategy[] = ['bfs', 'ucs'];

// ---------------------------------------------------------------------------
// Vacuum world
// ---------------------------------------------------------------------------

/** "A DD…": the agent in A and every square dirty. */
export const vacuumStart = (n: number): string => `A ${'D'.repeat(n)}`;

/** One letter per action, as the slide 9 diagram labels its edges. */
export const ACTION_LETTER: Record<SpaceAction, string> = { Left: 'L', Right: 'R', Suck: 'S' };

/** Where slide 9 draws each action's self-loop: Left on the left, Right on the right, Suck below. */
export const LOOP_SIDE: Record<SpaceAction, LoopSide> = {
	Left: 'left',
	Right: 'right',
	Suck: 'bottom'
};

/** Rows wider than this many dirt patterns are split over two lines (n = 4). */
const MAX_PATTERNS_PER_LINE = 3;
const LINE_SPACING = 110;
const GROUP_GAP = 70;

/**
 * The vacuum state space with drawing positions: the slide 9 layout
 * (`vacuumStateSpace`) for 2 and 3 squares; with 4 squares the rows with more
 * than three dirt patterns are split over two lines so the drawing stays about
 * twice as wide as it is tall.
 */
export function vacuumGraph(n: number): WeightedGraph {
	const graph = vacuumStateSpace(n);
	if (n < 4) return graph;
	const rows = new Map<number, string[][]>();
	const states = vacuumStates(n);
	for (let i = 0; i < states.length; i += n) {
		const s = states[i];
		const clean = s.dirt.filter((d) => !d).length;
		if (!rows.has(clean)) rows.set(clean, []);
		rows.get(clean)!.push(states.slice(i, i + n).map(vacuumStateName));
	}
	const groupWidth = (n - 1) * SPACE_SPACING;
	const pitch = groupWidth + SPACE_SPACING + GROUP_GAP;
	const lineWidth = (groups: number) => groups * pitch - SPACE_SPACING - GROUP_GAP;
	const lines: string[][][] = [];
	for (const clean of [...rows.keys()].sort((a, b) => a - b)) {
		const groups = rows.get(clean)!;
		const count = Math.ceil(groups.length / MAX_PATTERNS_PER_LINE);
		const per = Math.ceil(groups.length / count);
		for (let i = 0; i < groups.length; i += per) lines.push(groups.slice(i, i + per));
	}
	const widest = Math.max(...lines.map((l) => lineWidth(l.length)));
	const pos = new Map<string, { x: number; y: number }>();
	lines.forEach((line, li) => {
		const offset = (widest - lineWidth(line.length)) / 2;
		line.forEach((group, gi) => {
			group.forEach((id, si) => {
				pos.set(id, { x: offset + gi * pitch + si * SPACE_SPACING, y: li * LINE_SPACING });
			});
		});
	});
	return { ...graph, nodes: graph.nodes.map((node) => ({ id: node.id, ...pos.get(node.id)! })) };
}

/** The action of each edge of `vacuumGraph(n)` (edge i is transition i). */
export function vacuumEdgeActions(n: number): SpaceAction[] {
	return vacuumTransitions(n).map((t) => t.action);
}

/** "Agent in A; A dirty, B clean." */
export function describeVacuumState(name: string): string {
	const { state } = parseVacuumState(name);
	if (!state) return name;
	const squares = state.dirt.map((d, i) => `${squareLetter(i)} ${d ? 'dirty' : 'clean'}`);
	return `Agent in ${squareLetter(state.location)}; ${squares.join(', ')}`;
}

// ---------------------------------------------------------------------------
// Problems as graphs
// ---------------------------------------------------------------------------

/** The drawn state space with its start and goals. */
export function graphSpec(problem: GraphProblemId, squares: number): GraphProblemSpec {
	if (problem === 'romania') return ROMANIA_PROBLEM;
	return { graph: vacuumGraph(squares), start: vacuumStart(squares), goals: vacuumGoals(squares) };
}

/** The initial state of each problem (the empty string for robot motion planning). */
export function initialState(problem: ProblemId, squares: number): string {
	switch (problem) {
		case 'romania':
			return ROMANIA_PROBLEM.start;
		case 'vacuum':
			return vacuumStart(squares);
		case 'puzzle':
			return SLIDE_START;
		default:
			return '';
	}
}

const ROMANIA_CITIES = new Set(ROMANIA_PROBLEM.graph.nodes.map((n) => n.id));

/** Whether `state` is a state of the problem (a city, a vacuum state name, a reachable board). */
export function isStateOf(problem: ProblemId, squares: number, state: string): boolean {
	switch (problem) {
		case 'romania':
			return ROMANIA_CITIES.has(state);
		case 'vacuum': {
			const { state: s } = parseVacuumState(state, squares);
			return s !== null && vacuumStateName(s) === state;
		}
		case 'puzzle':
			return isBoard(state) && isSolvable(state, SLIDE_GOAL);
		default:
			return state === '';
	}
}

// ---------------------------------------------------------------------------
// Successor function (slide 14)
// ---------------------------------------------------------------------------

export interface SuccessorRow {
	/** The action as the problem names it ("Go to Sibiu", "Left", "Up"). */
	action: string;
	/** The resulting state (a city, a vacuum state name, a board). */
	state: string;
	cost: number;
	/** The action leaves the state unchanged (a self-loop). */
	same: boolean;
	/** What the action does, when the name alone does not say ("tile 5 moves right"). */
	note?: string;
}

const TILE_DIRECTION: Record<string, string> = {
	Left: 'right',
	Right: 'left',
	Up: 'down',
	Down: 'up'
};

const ROMANIA_ROADS = adjacency(ROMANIA_PROBLEM.graph, 'alphabetical');

/**
 * What the successor function returns for `state`, in successor order:
 * roads in name order (Romania), Left, Right, Suck (vacuum world), and the
 * blank's moves Left, Right, Up, Down (8-puzzle). Empty for robot motion
 * planning and for a state that is not one of the problem's.
 */
export function successorRows(problem: ProblemId, squares: number, state: string): SuccessorRow[] {
	if (!isStateOf(problem, squares, state)) return [];
	switch (problem) {
		case 'romania':
			return (ROMANIA_ROADS.get(state) ?? []).map((n) => ({
				action: `Go to ${n.to}`,
				state: n.to,
				cost: n.cost,
				same: false
			}));
		case 'vacuum': {
			const s = parseVacuumState(state, squares).state!;
			return SPACE_ACTIONS.map((action) => {
				const next = vacuumStateName(vacuumResult(s, action));
				return { action, state: next, cost: 1, same: next === state };
			});
		}
		case 'puzzle':
			return moves(state as Board).map((m) => ({
				action: m.action,
				state: m.board,
				cost: 1,
				same: false,
				note: `tile ${m.tile} moves ${TILE_DIRECTION[m.action]}`
			}));
		default:
			return [];
	}
}

// ---------------------------------------------------------------------------
// Search: basic idea (slides 13–26)
// ---------------------------------------------------------------------------

/**
 * Graph search from the problem's start state with BFS or UCS (full step
 * trace). Romania uses the road map (successors in name order); the vacuum
 * world its successor function (Left, Right, Suck).
 */
export function basicSearch(
	problem: GraphProblemId,
	squares: number,
	strategy: BasicStrategy
): SearchResult {
	const p =
		problem === 'romania'
			? graphProblem(ROMANIA_PROBLEM)
			: vacuumProblem(squares, vacuumStart(squares));
	return search(p, { strategy, mode: 'graph' });
}

/**
 * The problem in the graph text format for the search tool: the Romania map
 * with its straight-line distances, or the vacuum state space with one edge
 * per pair of states (one self-loop per state) and the drawing positions.
 */
export function searchToolGraph(problem: GraphProblemId, squares: number): string {
	if (problem === 'romania') return formatGraphText(ROMANIA_PROBLEM, { positions: true });
	const spec = graphSpec('vacuum', squares);
	const seen = new Set<string>();
	const edges: GraphEdge[] = [];
	for (const e of spec.graph.edges) {
		const key = `${e.from}\u0000${e.to}`;
		if (seen.has(key)) continue;
		seen.add(key);
		edges.push(e);
	}
	return formatGraphText({ ...spec, graph: { ...spec.graph, edges } }, { positions: true });
}

/** "A", "A and B", "A, B, and C". */
function listNames(names: readonly string[]): string {
	if (names.length <= 1) return names[0] ?? '';
	if (names.length === 2) return `${names[0]} and ${names[1]}`;
	return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * The sentence for a step of `basicSearch` (§3.3, `describeStep`). With
 * `actions`, an expansion names the action of each child ("Left → A DD") and a
 * state reached by several actions (two self-loops) is named once in the notes.
 */
export function describeBasicStep(result: SearchResult, index: number, actions: boolean): string {
	const step = result.steps[index];
	if (!actions || !step || step.kind !== 'expand' || step.node === null) {
		return describeStep(result, index);
	}
	const node = result.nodes[step.node];
	const prio = priorityPhrase(result.strategy, node, result.options.weight);
	const children = step.children.map((id) => result.nodes[id]);
	const parts = [`Take ${node.label} off the frontier${prio ? ` (${prio})` : ''}.`];
	parts.push(
		children.length
			? `Not a goal; expand it: ${children.map((c) => `${c.action} → ${c.label}`).join(', ')}.`
			: 'Not a goal, and it has no successors.'
	);
	const groups = new Map<string, string[]>();
	for (const c of children) {
		const reason = noteReason(result, c);
		if (!reason) continue;
		if (!groups.has(reason)) groups.set(reason, []);
		const names = groups.get(reason)!;
		if (!names.includes(c.label)) names.push(c.label);
	}
	for (const [reason, names] of groups) {
		const verb = names.length === 1 ? 'is' : 'are';
		parts.push(`${listNames(names)} ${verb} ${reason}; not added.`);
	}
	return parts.join(' ');
}

function noteReason(result: SearchResult, child: SearchNode): string | null {
	switch (child.outcome) {
		case 'explored':
			return 'in the explored set';
		case 'frontier':
			return usesPriority(result.strategy)
				? 'already on the frontier with a path cost as low'
				: 'already on the frontier';
		case 'on-path':
			return 'already on this path';
		default:
			return null;
	}
}
