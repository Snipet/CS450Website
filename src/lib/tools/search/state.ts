/**
 * The search tool's URL state: the graph text (formatGraphText) plus the
 * search settings and the current step. A link carrying only
 * LinkStates['search'] (graph plus optional settings) is accepted; the other
 * fields take their defaults.
 */
import type { Annotation } from '$lib/components/search/describe';
import type { NodeShape } from '$lib/components/search/graph-scene';
import { hasErrors } from '$lib/theory/diagnostics';
import { ROMANIA, ROMANIA_PROBLEM, formatGraphText, parseGraphText } from '$lib/theory/graphs';
import type { SuccessorOrder } from '$lib/theory/graphs';
import { DEFAULT_WEIGHT } from '$lib/theory/search';
import type { RepeatMode, StrategyId } from '$lib/theory/search';

export type GoalTest = 'expand' | 'generate';

/** What is written under the search-tree nodes; `auto` follows the strategy (§3.2). */
export type AnnotationChoice = 'auto' | Annotation;

/** Strategies in lecture order. */
export const STRATEGIES: readonly StrategyId[] = [
	'bfs',
	'dfs',
	'dls',
	'ids',
	'ucs',
	'greedy',
	'astar',
	'wastar'
];
export const MODES: readonly RepeatMode[] = ['tree', 'path', 'graph'];
export const GOAL_TESTS: readonly GoalTest[] = ['expand', 'generate'];
export const ORDERS: readonly SuccessorOrder[] = ['alphabetical', 'listed'];
export const ANNOTATIONS: readonly AnnotationChoice[] = ['auto', 'none', 'g', 'h', 'f', 'fgh'];
export const SHAPES: readonly NodeShape[] = ['circle', 'square'];

/** DLS: the depth limit. IDS: the largest limit tried. */
export const DEFAULT_DEPTH_LIMIT = 3;
export const MIN_DEPTH_LIMIT = 0;
export const MAX_DEPTH_LIMIT = 50;

/** α for weighted A* (Informed Search, slide 38: α > 1; α = 1 is A*). */
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 10;

/** Nodes taken off the frontier before a run stops. */
export const DEFAULT_MAX_EXPANSIONS = 500;
export const MIN_MAX_EXPANSIONS = 1;
export const MAX_MAX_EXPANSIONS = 5000;

/** Nodes generated before a run stops (keeps huge tree searches bounded). */
export const NODE_LIMIT = 50_000;

export interface SearchToolState {
	/** The problem in the graph text format. */
	graph: string;
	strategy: StrategyId;
	mode: RepeatMode;
	goalTest: GoalTest;
	depthLimit: number;
	/** α for weighted A*. */
	weight: number;
	/** Successor order. */
	order: SuccessorOrder;
	annotation: AnnotationChoice;
	/** How states are drawn: circles, or squares with outside labels (the Romania map). */
	shape: NodeShape;
	maxExpansions: number;
	/** Index into the step trace. */
	step: number;
}

/** A tool configuration without the step (what a preset sets). */
export type SearchScenario = Omit<SearchToolState, 'step'>;

/** The settings besides the graph. */
export type SearchSettings = Omit<SearchScenario, 'graph'>;

/** The settings of a state or scenario (everything but the graph and the step). */
export function settingsOf(s: SearchScenario): SearchSettings {
	return {
		strategy: s.strategy,
		mode: s.mode,
		goalTest: s.goalTest,
		depthLimit: s.depthLimit,
		weight: s.weight,
		order: s.order,
		annotation: s.annotation,
		shape: s.shape,
		maxExpansions: s.maxExpansions
	};
}

/** What the URL may hold: the graph, and any of the other fields. */
export type SavedSearchState = { graph: string } & Partial<Omit<SearchToolState, 'graph'>>;

const ROMANIA_TEXT = formatGraphText(ROMANIA_PROBLEM, { positions: true });

/** The page as first opened: A* tree search from Arad to Bucharest (Informed Search, slides 17–22). */
export function defaultSearchState(): SearchToolState {
	return {
		graph: ROMANIA_TEXT,
		strategy: 'astar',
		mode: 'tree',
		goalTest: 'expand',
		depthLimit: DEFAULT_DEPTH_LIMIT,
		weight: DEFAULT_WEIGHT,
		order: 'alphabetical',
		annotation: 'auto',
		shape: 'square',
		maxExpansions: DEFAULT_MAX_EXPANSIONS,
		step: 0
	};
}

const oneOf =
	<T>(list: readonly T[]) =>
	(v: unknown): v is T =>
		(list as readonly unknown[]).includes(v);

export const isStrategy = oneOf(STRATEGIES);
export const isMode = oneOf(MODES);
export const isGoalTest = oneOf(GOAL_TESTS);
export const isOrder = oneOf(ORDERS);
export const isAnnotation = oneOf(ANNOTATIONS);
export const isShape = oneOf(SHAPES);

const isIntIn = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export const isDepthLimit = (v: unknown): v is number =>
	isIntIn(v, MIN_DEPTH_LIMIT, MAX_DEPTH_LIMIT);
export const isMaxExpansions = (v: unknown): v is number =>
	isIntIn(v, MIN_MAX_EXPANSIONS, MAX_MAX_EXPANSIONS);
export const isWeight = (v: unknown): v is number =>
	typeof v === 'number' && Number.isFinite(v) && v >= MIN_WEIGHT && v <= MAX_WEIGHT;
export const isStep = (v: unknown): v is number => isIntIn(v, 0, Number.MAX_SAFE_INTEGER);

/** A whole number in [min, max]: rounded and clamped (min for NaN). */
function wholeIn(v: number, min: number, max: number): number {
	if (!Number.isFinite(v)) return Number.isNaN(v) ? min : v > 0 ? max : min;
	return Math.min(max, Math.max(min, Math.round(v)));
}

/**
 * A settings change with its numbers made valid: the depth limit and the
 * expansion limit whole and in range, α finite and in range. Number fields can
 * report a value such as 2.5 while it is being typed; the run and the saved
 * state (which `isSavedSearchState` checks) only ever see valid numbers.
 */
export function cleanSettings(patch: Partial<SearchSettings>): Partial<SearchSettings> {
	const out = { ...patch };
	if (out.depthLimit !== undefined)
		out.depthLimit = wholeIn(out.depthLimit, MIN_DEPTH_LIMIT, MAX_DEPTH_LIMIT);
	if (out.maxExpansions !== undefined)
		out.maxExpansions = wholeIn(out.maxExpansions, MIN_MAX_EXPANSIONS, MAX_MAX_EXPANSIONS);
	if (out.weight !== undefined)
		out.weight = Number.isFinite(out.weight)
			? Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, out.weight))
			: DEFAULT_WEIGHT;
	return out;
}

/** Whether graph text parses without errors. */
export function isValidGraphText(text: string): boolean {
	return !hasErrors(parseGraphText(text).diagnostics);
}

/**
 * Accepts saved state whose graph parses without errors and whose other
 * fields, when present, have the right types. Used as `syncToHash`'s `validate`.
 */
export function isSavedSearchState(value: unknown): value is SavedSearchState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const v = value as Record<string, unknown>;
	if (typeof v.graph !== 'string' || !isValidGraphText(v.graph)) return false;
	const checks: [string, (x: unknown) => boolean][] = [
		['strategy', isStrategy],
		['mode', isMode],
		['goalTest', isGoalTest],
		['depthLimit', isDepthLimit],
		['weight', isWeight],
		['order', isOrder],
		['annotation', isAnnotation],
		['shape', isShape],
		['maxExpansions', isMaxExpansions],
		['step', isStep]
	];
	return checks.every(([key, ok]) => v[key] === undefined || ok(v[key]));
}

const ROMANIA_CITIES = new Set(ROMANIA.nodes.map((n) => n.id));

/**
 * How to draw a graph when the state does not say: squares with outside
 * labels for the Romania road map (as on the slides), circles otherwise.
 */
export function defaultShape(text: string): NodeShape {
	const nodes = parseGraphText(text).spec?.graph.nodes;
	const map =
		nodes !== undefined &&
		nodes.length === ROMANIA_CITIES.size &&
		nodes.every((n) => ROMANIA_CITIES.has(n.id));
	return map ? 'square' : 'circle';
}

/** Saved state with defaults for missing fields. */
export function completeSearchState(saved: SavedSearchState): SearchToolState {
	const d = defaultSearchState();
	return {
		graph: saved.graph,
		strategy: saved.strategy ?? d.strategy,
		mode: saved.mode ?? d.mode,
		goalTest: saved.goalTest ?? d.goalTest,
		depthLimit: saved.depthLimit ?? d.depthLimit,
		weight: saved.weight ?? d.weight,
		order: saved.order ?? d.order,
		annotation: saved.annotation ?? d.annotation,
		shape: saved.shape ?? defaultShape(saved.graph),
		maxExpansions: saved.maxExpansions ?? d.maxExpansions,
		step: saved.step ?? 0
	};
}
