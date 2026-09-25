/**
 * The strategy comparison's URL state: the problem (a lecture problem, or
 * graph text brought by a link), the run settings, and the inputs of the node
 * counts. A link carrying only LinkStates['strategies'] ({ graph? }) is
 * accepted; every other field takes its default.
 */
import { DEFAULT_WEIGHT, type RepeatMode } from '$lib/theory/search';
import { isProblemId, matchProblemText, type ProblemId } from './problems';

export const MODES: readonly RepeatMode[] = ['tree', 'path', 'graph'];

/** α for weighted A* (Informed Search, slide 38: α > 1; α = 1 is A*). */
export const MIN_ALPHA = 1;
export const MAX_ALPHA = 10;

/** Nodes taken off the frontier before one run stops. */
export const DEFAULT_LIMIT = 1000;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 10_000;

/** Node-count inputs. Exponents stay small enough for exact BigInt arithmetic. */
export const MAX_B = 1000;
export const MAX_DEPTH = 1000;
export const MAX_C_STAR = 10_000;
export const MIN_EPS = 0.1;
export const MAX_EPS = 10_000;
export const MAX_DISKS = 64;

/** Longest graph text accepted from a link. */
export const MAX_GRAPH_TEXT = 100_000;

export interface StrategiesState {
	/** The lecture problem, used when `graph` is null. */
	preset: ProblemId;
	/** Graph text from a link (read-only here), or null. */
	graph: string | null;
	mode: RepeatMode;
	/** α for weighted A*. */
	alpha: number;
	/** Expansion limit: nodes taken off the frontier before a run stops. */
	limit: number;
	/** Maximum branching factor. */
	b: number;
	/** Depth of the optimal solution. */
	d: number;
	/** Maximum length of any path. */
	m: number;
	/** Cost of the optimal solution C*. */
	cStar: number;
	/** Positive lower bound ε on step costs. */
	eps: number;
	/** Towers of Hanoi disks. */
	disks: number;
}

/** What the URL may hold: any of the fields (LinkStates['strategies'] is `{ graph? }`). */
export type SavedStrategiesState = Partial<StrategiesState>;

/**
 * The page as first opened: tree search on Romania, and b = 10, d = 5 for the
 * counts (IDS 123,456 nodes against 111,111 for BFS).
 */
export function defaultStrategiesState(): StrategiesState {
	return {
		preset: 'romania',
		graph: null,
		mode: 'tree',
		alpha: DEFAULT_WEIGHT,
		limit: DEFAULT_LIMIT,
		b: 10,
		d: 5,
		m: 10,
		cStar: 10,
		eps: 1,
		disks: 5
	};
}

export const isMode = (v: unknown): v is RepeatMode =>
	typeof v === 'string' && (MODES as readonly string[]).includes(v);

const isIntIn = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

const isNumberIn = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export const isAlpha = (v: unknown): v is number => isNumberIn(v, MIN_ALPHA, MAX_ALPHA);
export const isLimit = (v: unknown): v is number => isIntIn(v, MIN_LIMIT, MAX_LIMIT);
export const isBranching = (v: unknown): v is number => isIntIn(v, 1, MAX_B);
export const isDepth = (v: unknown): v is number => isIntIn(v, 0, MAX_DEPTH);
export const isCStar = (v: unknown): v is number => isNumberIn(v, 0, MAX_C_STAR);
export const isEps = (v: unknown): v is number => isNumberIn(v, MIN_EPS, MAX_EPS);
export const isDisks = (v: unknown): v is number => isIntIn(v, 1, MAX_DISKS);
const isGraph = (v: unknown): v is string | null =>
	v === null || (typeof v === 'string' && v.length <= MAX_GRAPH_TEXT);

/**
 * Accepts saved state whose fields, when present, have the right types and
 * ranges. Graph text is accepted even with errors: the page shows its
 * diagnostics. Used as `syncToHash`'s `validate`.
 */
export function isSavedStrategiesState(value: unknown): value is SavedStrategiesState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const v = value as Record<string, unknown>;
	const checks: [keyof StrategiesState, (x: unknown) => boolean][] = [
		['preset', isProblemId],
		['graph', isGraph],
		['mode', isMode],
		['alpha', isAlpha],
		['limit', isLimit],
		['b', isBranching],
		['d', isDepth],
		['m', isDepth],
		['cStar', isCStar],
		['eps', isEps],
		['disks', isDisks]
	];
	return checks.every(([key, ok]) => v[key] === undefined || ok(v[key]));
}

/**
 * Saved state with defaults for missing fields. Graph text that is exactly a
 * lecture problem's text loads as that problem.
 */
export function completeStrategiesState(saved: SavedStrategiesState): StrategiesState {
	const d = defaultStrategiesState();
	let preset = saved.preset ?? d.preset;
	let graph = saved.graph ?? null;
	if (graph !== null) {
		const match = matchProblemText(graph);
		if (match) {
			preset = match;
			graph = null;
		}
	}
	return {
		preset,
		graph,
		mode: saved.mode ?? d.mode,
		alpha: saved.alpha ?? d.alpha,
		limit: saved.limit ?? d.limit,
		b: saved.b ?? d.b,
		d: saved.d ?? d.d,
		m: saved.m ?? d.m,
		cStar: saved.cStar ?? d.cStar,
		eps: saved.eps ?? d.eps,
		disks: saved.disks ?? d.disks
	};
}

/**
 * The value written to the URL: `graph` only when a link brought one (and
 * then no `preset`), so the hash stays short.
 */
export function savedStateOf(s: StrategiesState): SavedStrategiesState {
	const { graph, preset, ...rest } = s;
	return graph === null ? { preset, ...rest } : { graph, ...rest };
}
