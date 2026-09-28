/**
 * The 8-puzzle solvers the tool runs (in a Web Worker): each is a strategy of
 * the shared search engine with a repeated-state mode and a heuristic, run
 * with `record: 'summary'` and reduced to the numbers the results table shows.
 */
import {
	PUZZLE_GRAPH_LIMITS,
	puzzleProblem,
	type Board,
	type PuzzleAction,
	type PuzzleHeuristic
} from '$lib/theory/puzzle';
import { search, type RepeatMode, type SearchOptions, type StrategyId } from '$lib/theory/search';

export type SolverId = 'bfs' | 'ids' | 'greedy' | 'astar-h1' | 'astar-h2' | 'wastar';

export interface SolverSpec {
	id: SolverId;
	/** Table label: "BFS", "A* (h2)", … */
	label: string;
	/** How repeated states are handled, in a few words. */
	detail: string;
	strategy: StrategyId;
	mode: RepeatMode;
	heuristic: PuzzleHeuristic;
	/** Weighted A* inflation factor α. */
	weight?: number;
	/** Whether the solver always returns an optimal solution (unit step costs, admissible h). */
	optimal: boolean;
	/** Cheap enough to run on the main thread when Web Workers are unavailable. */
	light: boolean;
}

/** IDS stops after generating this many nodes. */
export const IDS_NODE_BUDGET = 1_000_000;
/** Largest IDS depth limit (the budget always stops it first). */
const IDS_MAX_LIMIT = 100;
/** Weighted A* α (docs/ARCHITECTURE.md §3.4). */
export const WEIGHT = 2;

export const SOLVERS: readonly SolverSpec[] = [
	{
		id: 'bfs',
		label: 'BFS',
		detail: 'graph search',
		strategy: 'bfs',
		mode: 'graph',
		heuristic: 'zero',
		optimal: true,
		light: false
	},
	{
		id: 'ids',
		label: 'IDS',
		detail: 'tree search, path check',
		strategy: 'ids',
		mode: 'path',
		heuristic: 'zero',
		optimal: true,
		light: false
	},
	{
		id: 'greedy',
		label: 'Greedy (h2)',
		detail: 'graph search',
		strategy: 'greedy',
		mode: 'graph',
		heuristic: 'h2',
		optimal: false,
		light: true
	},
	{
		id: 'astar-h1',
		label: 'A* (h1)',
		detail: 'graph search',
		strategy: 'astar',
		mode: 'graph',
		heuristic: 'h1',
		optimal: true,
		light: false
	},
	{
		id: 'astar-h2',
		label: 'A* (h2)',
		detail: 'graph search',
		strategy: 'astar',
		mode: 'graph',
		heuristic: 'h2',
		optimal: true,
		light: true
	},
	{
		id: 'wastar',
		label: `Weighted A* (h2, α = ${WEIGHT})`,
		detail: 'graph search',
		strategy: 'wastar',
		mode: 'graph',
		heuristic: 'h2',
		weight: WEIGHT,
		optimal: false,
		light: true
	}
];

export const SOLVER_IDS: readonly SolverId[] = SOLVERS.map((s) => s.id);

export function solverSpec(id: SolverId): SolverSpec {
	const spec = SOLVERS.find((s) => s.id === id);
	if (!spec) throw new Error(`Unknown solver ${id}`);
	return spec;
}

export const isSolverId = (value: unknown): value is SolverId =>
	typeof value === 'string' && (SOLVER_IDS as readonly string[]).includes(value);

/** What a solver run reports. */
export interface SolverRun {
	solver: SolverId;
	start: Board;
	goal: Board;
	/** `solved`; `exhausted`: the frontier emptied (no solution); `limit`: the node budget stopped it. */
	outcome: 'solved' | 'exhausted' | 'limit';
	expanded: number;
	generated: number;
	maxFrontier: number;
	/** Explored-set size at the end (graph search). */
	explored: number;
	/** Moves in the solution; null when none was found. */
	length: number | null;
	actions: PuzzleAction[];
	/** Run time in milliseconds. */
	ms: number;
	/** IDS: the node budget. */
	budget: number | null;
	/** IDS: the depth limit of the last iteration. */
	depthLimit: number | null;
}

/** Search options for a solver. */
export function solverOptions(spec: SolverSpec, idsBudget = IDS_NODE_BUDGET): SearchOptions {
	const base: SearchOptions = {
		strategy: spec.strategy,
		mode: spec.mode,
		record: 'summary',
		...(spec.weight !== undefined ? { weight: spec.weight } : {})
	};
	if (spec.strategy === 'ids') {
		return {
			...base,
			depthLimit: IDS_MAX_LIMIT,
			maxNodes: idsBudget,
			maxExpansions: Number.MAX_SAFE_INTEGER
		};
	}
	return { ...base, ...PUZZLE_GRAPH_LIMITS };
}

export interface RunOptions {
	/** IDS node budget (default IDS_NODE_BUDGET). */
	idsBudget?: number;
	/** Clock in milliseconds (default `performance.now`). */
	now?: () => number;
}

/** Runs one solver from `start` to `goal`. */
export function runSolver(
	id: SolverId,
	start: Board,
	goal: Board,
	options: RunOptions = {}
): SolverRun {
	const spec = solverSpec(id);
	const now = options.now ?? (() => performance.now());
	const budget = options.idsBudget ?? IDS_NODE_BUDGET;
	const t0 = now();
	const result = search(puzzleProblem(start, goal, spec.heuristic), solverOptions(spec, budget));
	const ms = now() - t0;
	const solution = result.solution;
	const last = result.iterations[result.iterations.length - 1];
	return {
		solver: id,
		start,
		goal,
		outcome: solution ? 'solved' : result.failure === 'limit' ? 'limit' : 'exhausted',
		expanded: result.stats.expanded,
		generated: result.stats.generated,
		maxFrontier: result.stats.maxFrontier,
		explored: result.stats.explored,
		length: solution ? solution.depth : null,
		actions: solution ? (solution.actions as PuzzleAction[]) : [],
		ms,
		budget: spec.strategy === 'ids' ? budget : null,
		depthLimit: spec.strategy === 'ids' && last ? last.limit : null
	};
}

/** A request to the solver worker. */
export interface SolverRequest {
	id: number;
	solver: SolverId;
	start: Board;
	goal: Board;
}

/** The worker's answer to a request. */
export type SolverResponse = { id: number; run: SolverRun } | { id: number; error: string };

/** Handles one worker message: runs the solver, or reports what went wrong. */
export function handleRequest(request: SolverRequest, options: RunOptions = {}): SolverResponse {
	try {
		return { id: request.id, run: runSolver(request.solver, request.start, request.goal, options) };
	} catch (e) {
		return { id: request.id, error: e instanceof Error ? e.message : String(e) };
	}
}
