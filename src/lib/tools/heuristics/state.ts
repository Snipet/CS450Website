/**
 * The heuristics tool's URL state: the problem as graph text (its `h:` lines
 * hold the heuristic being checked), the heuristic it is compared with, α
 * for weighted A*, the selected state, and the preset the problem came from.
 * A link carrying only LinkStates['heuristics'] ({ graph }) is accepted; the
 * other fields take their defaults.
 */
import { hasErrors } from '$lib/theory/diagnostics';
import { parseGraphText } from '$lib/theory/graphs';
import { DEFAULT_WEIGHT } from '$lib/theory/search';
import type { LinkStates } from '$lib/tools/links';
import type { SecondChoice, SecondKind } from './analysis';
import { HEURISTIC_PRESETS, presetById } from './presets';

/** α for weighted A* (Informed Search, slide 38: α > 1; α = 1 is A*). */
export const MIN_ALPHA = 1;
export const MAX_ALPHA = 10;

/** Scale factors for "scale h" and the scaled comparison heuristic. */
export const MIN_FACTOR = 0;
export const MAX_FACTOR = 10;
export const DEFAULT_FACTOR = 0.5;

export const SECOND_KINDS: readonly SecondKind[] = [
	'zero',
	'perfect',
	'preset',
	'scaled',
	'custom'
];

export interface HeuristicsState {
	/** The problem and the heuristic h in the graph text format. */
	graph: string;
	/** The heuristic h2 that h is compared with. */
	second: SecondChoice;
	/** α for weighted A*. */
	alpha: number;
	/** The state whose row is selected. */
	selected: string | null;
	/** Id of the preset the problem came from (for "Reset" and the preset's h). */
	preset: string | null;
}

/** What the URL may hold: the graph, and any of the other fields. */
export type SavedHeuristicsState = LinkStates['heuristics'] &
	Partial<Omit<HeuristicsState, 'graph'>>;

export const DEFAULT_PRESET = 'romania-sld';

/** Romania with the straight-line distance, compared with h = 0. */
export function defaultHeuristicsState(): HeuristicsState {
	return {
		graph: presetById(DEFAULT_PRESET)!.value.graph,
		second: { kind: 'zero' },
		alpha: DEFAULT_WEIGHT,
		selected: null,
		preset: DEFAULT_PRESET
	};
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const isFiniteIn = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export const isAlpha = (v: unknown): v is number => isFiniteIn(v, MIN_ALPHA, MAX_ALPHA);
export const isFactor = (v: unknown): v is number => isFiniteIn(v, MIN_FACTOR, MAX_FACTOR);

/** A heuristic as JSON: state name → finite h ≥ 0. */
export function isHeuristicRecord(v: unknown): v is Record<string, number> {
	return (
		isObject(v) &&
		Object.values(v).every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0)
	);
}

export function isSecondChoice(v: unknown): v is SecondChoice {
	if (!isObject(v) || !(SECOND_KINDS as readonly unknown[]).includes(v.kind)) return false;
	if (v.kind === 'scaled') return isFactor(v.factor);
	if (v.kind === 'custom') return isHeuristicRecord(v.h);
	return true;
}

/** Whether graph text parses without errors. */
export function isValidGraphText(text: string): boolean {
	return !hasErrors(parseGraphText(text).diagnostics);
}

/**
 * Accepts saved state whose graph parses without errors and whose other
 * fields, when present, have the right types. Used as `syncToHash`'s `validate`.
 */
export function isSavedHeuristicsState(value: unknown): value is SavedHeuristicsState {
	if (!isObject(value)) return false;
	if (typeof value.graph !== 'string' || !isValidGraphText(value.graph)) return false;
	const checks: [string, (x: unknown) => boolean][] = [
		['second', isSecondChoice],
		['alpha', isAlpha],
		['selected', (x) => x === null || typeof x === 'string'],
		['preset', (x) => x === null || typeof x === 'string']
	];
	return checks.every(([key, ok]) => value[key] === undefined || ok(value[key]));
}

/**
 * Saved state with defaults for missing fields. An unknown preset id or a
 * selected state that is not in the graph becomes null.
 */
export function completeHeuristicsState(saved: SavedHeuristicsState): HeuristicsState {
	const d = defaultHeuristicsState();
	const spec = parseGraphText(saved.graph).spec;
	const states = new Set(spec?.graph.nodes.map((n) => n.id) ?? []);
	const preset =
		saved.preset && HEURISTIC_PRESETS.some((p) => p.id === saved.preset) ? saved.preset : null;
	return {
		graph: saved.graph,
		second: saved.second ?? d.second,
		alpha: saved.alpha ?? d.alpha,
		selected: saved.selected && states.has(saved.selected) ? saved.selected : null,
		preset
	};
}
