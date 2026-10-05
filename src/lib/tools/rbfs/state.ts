/**
 * The RBFS tool's URL state: the graph text (formatGraphText), how states
 * are drawn, the expansion limit, and the current step. A link carrying only
 * LinkStates['rbfs'] (an optional graph) is accepted; the other fields take
 * their defaults.
 */
import type { NodeShape } from '$lib/components/search/graph-scene';
import { hasErrors } from '$lib/theory/diagnostics';
import { ROMANIA, ROMANIA_PROBLEM, formatGraphText, parseGraphText } from '$lib/theory/graphs';

export const SHAPES: readonly NodeShape[] = ['circle', 'square'];

/** Nodes RBFS may expand before a run stops. */
export const DEFAULT_MAX_EXPANSIONS = 500;
export const MIN_MAX_EXPANSIONS = 1;
export const MAX_MAX_EXPANSIONS = 5000;

export interface RbfsToolState {
	/** The problem in the graph text format (h values from its h: lines). */
	graph: string;
	/** How states are drawn: circles, or squares with outside labels (the Romania map). */
	shape: NodeShape;
	maxExpansions: number;
	/** Index into the step trace. */
	step: number;
}

/** A tool configuration without the step (what a preset sets). */
export type RbfsScenario = Omit<RbfsToolState, 'step'>;

/** What the URL may hold: any of the fields (LinkStates['rbfs'] is `{ graph?: string }`). */
export type SavedRbfsState = Partial<RbfsToolState>;

export const ROMANIA_TEXT = formatGraphText(ROMANIA_PROBLEM, { positions: true });

/** The page as first opened: Arad to Bucharest with straight-line distances (AIMA Figure 3.27). */
export function defaultRbfsState(): RbfsToolState {
	return { graph: ROMANIA_TEXT, shape: 'square', maxExpansions: DEFAULT_MAX_EXPANSIONS, step: 0 };
}

const isIntIn = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export const isShape = (v: unknown): v is NodeShape => (SHAPES as readonly unknown[]).includes(v);
export const isMaxExpansions = (v: unknown): v is number =>
	isIntIn(v, MIN_MAX_EXPANSIONS, MAX_MAX_EXPANSIONS);
export const isStep = (v: unknown): v is number => isIntIn(v, 0, Number.MAX_SAFE_INTEGER);

/** Whether graph text parses without errors. */
export function isValidGraphText(text: string): boolean {
	return !hasErrors(parseGraphText(text).diagnostics);
}

/**
 * Accepts saved state whose fields, when present, have the right types and
 * whose graph parses without errors. Used as `syncToHash`'s `validate`.
 */
export function isSavedRbfsState(value: unknown): value is SavedRbfsState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const v = value as Record<string, unknown>;
	if (v.graph !== undefined && (typeof v.graph !== 'string' || !isValidGraphText(v.graph)))
		return false;
	const checks: [string, (x: unknown) => boolean][] = [
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
export function completeRbfsState(saved: SavedRbfsState): RbfsToolState {
	const d = defaultRbfsState();
	const graph = saved.graph ?? d.graph;
	return {
		graph,
		shape: saved.shape ?? defaultShape(graph),
		maxExpansions: saved.maxExpansions ?? d.maxExpansions,
		step: saved.step ?? 0
	};
}

/** An expansion limit as typed, made whole and put in range (the minimum for NaN). */
export function cleanMaxExpansions(v: number): number {
	if (!Number.isFinite(v))
		return Number.isNaN(v) || v < 0 ? MIN_MAX_EXPANSIONS : MAX_MAX_EXPANSIONS;
	return Math.min(MAX_MAX_EXPANSIONS, Math.max(MIN_MAX_EXPANSIONS, Math.round(v)));
}
