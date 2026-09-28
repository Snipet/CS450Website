/**
 * Edits the heuristics tool makes to a problem: new h values (one state, all
 * zero, the true cost h*, a scaled copy, the maximum of two), a new start or
 * goal, and the graph text that keeps them in the URL (formatGraphText).
 */
import { formatGraphText, trueCosts, type GraphProblemSpec } from '$lib/theory/graphs';

export type Heuristic = Readonly<Record<string, number>>;

/** Tolerance for comparing h values. */
const EPS = 1e-9;

/** The graph text of a spec, with drawing positions so the layout survives the round trip. */
export function specText(spec: GraphProblemSpec): string {
	return formatGraphText(spec, { positions: true });
}

/** h(n), 0 when the heuristic has no value for n (own properties only). */
export function hValue(h: Heuristic | undefined, id: string): number {
	return h && Object.hasOwn(h, id) ? h[id] : 0;
}

/** h(n) for every state of the graph, in graph order (missing values are 0). */
export function fullHeuristic(
	spec: GraphProblemSpec,
	h: Heuristic = spec.h ?? {}
): Record<string, number> {
	return Object.fromEntries(spec.graph.nodes.map((n) => [n.id, hValue(h, n.id)]));
}

/** Whether two heuristics give every state of the graph the same value. */
export function sameHeuristic(spec: GraphProblemSpec, a: Heuristic, b: Heuristic): boolean {
	return spec.graph.nodes.every((n) => Math.abs(hValue(a, n.id) - hValue(b, n.id)) <= EPS);
}

/**
 * Rounds to three decimals, the precision the graph text keeps, so a value
 * reads back from the text exactly as it was set. Negative values become 0
 * (the graph text rejects negative h).
 */
export function roundH(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return Math.round(value * 1000) / 1000;
}

/** The spec with a new heuristic and label (`null` removes the label). */
export function withHeuristic(
	spec: GraphProblemSpec,
	h: Heuristic,
	label: string | null
): GraphProblemSpec {
	const ids = new Set(spec.graph.nodes.map((n) => n.id));
	const values = Object.fromEntries(
		Object.entries(h)
			.filter(([id]) => ids.has(id))
			.map(([id, v]) => [id, roundH(v)])
	);
	const next: GraphProblemSpec = { graph: spec.graph, start: spec.start, goals: spec.goals };
	next.h = values;
	const text = label?.replace(/\s+/g, ' ').trim();
	if (text) next.hLabel = text;
	return next;
}

const EDITED = ' (edited)';

/** The label of a heuristic after one of its values was changed by hand. */
export function editedLabel(label: string | undefined): string | null {
	const text = label?.trim();
	if (!text) return null;
	return text.endsWith(EDITED.trim()) ? text : `${text}${EDITED}`;
}

/** The spec with h(id) set to `value`; the other values are kept. */
export function setStateH(spec: GraphProblemSpec, id: string, value: number): GraphProblemSpec {
	const h = { ...fullHeuristic(spec), [id]: roundH(value) };
	const changed = Math.abs(hValue(spec.h, id) - roundH(value)) > EPS;
	return withHeuristic(spec, h, changed ? editedLabel(spec.hLabel) : (spec.hLabel ?? null));
}

/** h(n) = 0 for every state. */
export function zeroHeuristic(spec: GraphProblemSpec): Record<string, number> {
	return Object.fromEntries(spec.graph.nodes.map((n) => [n.id, 0]));
}

/**
 * h(n) = h*(n), the perfect heuristic. States that cannot reach a goal have
 * h*(n) = ∞, which the graph text cannot hold; they get the largest finite
 * h* instead. Every edge into such a state then passes the consistency
 * check, so the result is admissible and consistent.
 */
export function perfectHeuristic(spec: GraphProblemSpec): Record<string, number> {
	const star = trueCosts(spec);
	const finite = [...star.values()].filter(Number.isFinite);
	const dead = finite.length ? Math.max(...finite) : 0;
	return Object.fromEntries(
		spec.graph.nodes.map((n) => {
			const v = star.get(n.id) ?? Infinity;
			return [n.id, roundH(Number.isFinite(v) ? v : dead)];
		})
	);
}

/** factor · h(n) for every state, rounded to three decimals. */
export function scaleHeuristic(
	spec: GraphProblemSpec,
	h: Heuristic,
	factor: number
): Record<string, number> {
	return Object.fromEntries(spec.graph.nodes.map((n) => [n.id, roundH(factor * hValue(h, n.id))]));
}

/** max{h1(n), h2(n)} for every state (Informed Search, slide 37). */
export function maxOf(
	spec: GraphProblemSpec,
	h1: Heuristic,
	h2: Heuristic
): Record<string, number> {
	return Object.fromEntries(
		spec.graph.nodes.map((n) => [n.id, Math.max(hValue(h1, n.id), hValue(h2, n.id))])
	);
}

/** Integers as-is; other numbers with up to three decimals. */
export function formatFactor(n: number): string {
	return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

/**
 * A cost or h value for display: up to three decimals (the precision of the
 * graph text), ∞ for Infinity, and a minus sign rather than a hyphen.
 */
export function formatValue(n: number): string {
	if (Number.isNaN(n)) return '–';
	if (!Number.isFinite(n)) return n > 0 ? '∞' : '−∞';
	const r = Math.round(n * 1000) / 1000;
	const text = String(Object.is(r, -0) ? 0 : r);
	return text.startsWith('-') ? `−${text.slice(1)}` : text;
}

const SCALED = /^(\d+(?:\.\d+)?) × (.+)$/;

/**
 * The label of a scaled heuristic: "2 × Straight-line distance to Bucharest";
 * scaling a scaled label multiplies the factors. Without a label: "2 × h".
 */
export function scaledLabel(label: string | undefined, factor: number): string {
	const text = label?.trim() || 'h';
	const m = SCALED.exec(text);
	if (m) {
		const combined = Math.round(Number(m[1]) * factor * 1000) / 1000;
		return combined === 1 ? m[2] : `${formatFactor(combined)} × ${m[2]}`;
	}
	return factor === 1 ? text : `${formatFactor(factor)} × ${text}`;
}

/** The spec with a new start state. */
export function withStart(spec: GraphProblemSpec, start: string): GraphProblemSpec {
	return { ...spec, start };
}

/** The spec with a single goal state. */
export function withGoal(spec: GraphProblemSpec, goal: string): GraphProblemSpec {
	return { ...spec, goals: [goal] };
}

/**
 * The step of an h field: 1 for whole numbers, otherwise the value's last
 * decimal place (0.1, 0.01, 0.001), so leaving the field without typing does
 * not round the value.
 */
export function stepFor(value: number): number {
	if (Number.isInteger(value)) return 1;
	for (const step of [0.1, 0.01]) {
		const scaled = value / step;
		if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return step;
	}
	return 0.001;
}

/**
 * The step of a field that normally steps by `coarse` (α by 0.5, factors by
 * 0.1): `coarse` while the value is a multiple of it, otherwise the value's
 * last decimal place, so a typed 1.1 or 0.25 is not rounded to the coarse step
 * when the field is left.
 */
export function stepFrom(value: number, coarse: number): number {
	const scaled = value / coarse;
	if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return coarse;
	return Math.min(coarse, stepFor(value));
}
