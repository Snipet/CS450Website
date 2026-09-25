/**
 * What the heuristics tool shows about a heuristic on a graph problem: the h
 * table (h(n) against h*(n), Informed Search slide 25), the consistency check
 * per edge direction (slide 28), the verdicts of slide 29, the A* runs that
 * test them (slides 26–30), dominance and the pointwise maximum (slides 35,
 * 37), and weighted A* (slide 38).
 */
import {
	checkHeuristic,
	compareHeuristics,
	graphProblem,
	shortestPath,
	type GraphProblemSpec,
	type HeuristicReport
} from '$lib/theory/graphs';
import { search, type RepeatMode, type SearchResult } from '$lib/theory/search';
import { formatValue, fullHeuristic, hValue, maxOf, type Heuristic } from './edit';

const EPS = 1e-9;

// ---------------------------------------------------------------------------
// The h table
// ---------------------------------------------------------------------------

export interface HRow {
	id: string;
	h: number;
	/** True cost to the nearest goal (Infinity when no goal can be reached). */
	hStar: number;
	/** h(n) ≤ h*(n). */
	admissible: boolean;
	/** h*(n) − h(n): how far below the true cost h is (negative: it overestimates). */
	margin: number;
	start: boolean;
	goal: boolean;
}

/** One row per state, in graph order. */
export function heuristicRows(spec: GraphProblemSpec, report: HeuristicReport): HRow[] {
	const goals = new Set(spec.goals);
	return report.nodes.map((n) => ({
		id: n.id,
		h: n.h,
		hStar: n.hStar,
		admissible: n.admissible,
		margin: n.hStar - n.h,
		start: n.id === spec.start,
		goal: goals.has(n.id)
	}));
}

/** States where h overestimates, worst first (ties in graph order). */
export function overestimates(rows: readonly HRow[]): HRow[] {
	return rows.filter((r) => !r.admissible).sort((a, b) => a.margin - b.margin);
}

// ---------------------------------------------------------------------------
// Consistency
// ---------------------------------------------------------------------------

export interface EdgeRow {
	from: string;
	to: string;
	cost: number;
	hFrom: number;
	hTo: number;
	/** h(n) ≤ c(n, n') + h(n'). */
	consistent: boolean;
	/** c(n, n') − (h(n) − h(n')): negative when the check fails; f drops by −slack along this edge. */
	slack: number;
	/** Unique per edge direction. */
	key: string;
}

/**
 * Every edge direction, the failed checks first (largest failure first), then
 * the others in edge order.
 */
export function consistencyRows(report: HeuristicReport): EdgeRow[] {
	const rows = report.edges.map((e, i) => ({
		...e,
		slack: e.cost - (e.hFrom - e.hTo),
		key: `${i}`
	}));
	const failed = rows.filter((r) => !r.consistent).sort((a, b) => a.slack - b.slack);
	return [...failed, ...rows.filter((r) => r.consistent)];
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

export interface Verdicts {
	admissible: boolean;
	consistent: boolean;
	/** h(g) = 0 at every goal. */
	goalsZero: boolean;
	/** States where h(n) > h*(n), worst first. */
	over: HRow[];
	/** Edge directions where h(n) > c(n, n') + h(n'), worst first. */
	violations: EdgeRow[];
	/** Goals with h > 0. */
	goalsAbove: string[];
	states: number;
	directions: number;
}

export function verdicts(spec: GraphProblemSpec, h: Heuristic = spec.h ?? {}): Verdicts {
	const report = checkHeuristic(spec, h);
	const rows = heuristicRows(spec, report);
	const edges = consistencyRows(report);
	return {
		admissible: report.admissible,
		consistent: report.consistent,
		goalsZero: report.goalsZero,
		over: overestimates(rows),
		violations: edges.filter((e) => !e.consistent),
		goalsAbove: spec.goals.filter((g) => hValue(h, g) > EPS),
		states: rows.length,
		directions: edges.length
	};
}

const f = formatValue;

/** "Arad (h = 732 > h* = 418)" for an overestimating state. */
export function overText(r: HRow): string {
	return `${r.id} (h = ${f(r.h)} > h* = ${f(r.hStar)})`;
}

/** "h(A) = 4 > c(A, C) + h(C) = 1 + 1 = 2" for a failed consistency check. */
export function violationText(e: EdgeRow): string {
	return `h(${e.from}) = ${f(e.hFrom)} > c(${e.from}, ${e.to}) + h(${e.to}) = ${f(e.cost)} + ${f(e.hTo)} = ${f(e.cost + e.hTo)}`;
}

/** Joins a list as "A, B, and 3 more". */
export function listSome(items: readonly string[], max = 3): string {
	if (items.length <= max) return items.join(', ');
	return `${items.slice(0, max).join(', ')}, and ${items.length - max} more`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One sentence on admissibility. */
export function admissibilitySentence(v: Verdicts): string {
	if (v.admissible) return `h(n) ≤ h*(n) at all ${plural(v.states, 'state')}.`;
	const [worst, ...rest] = v.over;
	return `h(n) > h*(n) at ${plural(v.over.length, 'state')}: ${listSome([
		overText(worst),
		...rest.map((r) => r.id)
	])}.`;
}

/** One sentence on consistency. */
export function consistencySentence(v: Verdicts): string {
	if (v.consistent) {
		return v.directions
			? `h(n) ≤ c(n, n') + h(n') on all ${plural(v.directions, 'edge direction')}.`
			: 'The graph has no edges.';
	}
	const [worst] = v.violations;
	const at = `${worst.from} → ${worst.to}: ${violationText(worst)}`;
	return v.violations.length === 1
		? `The check fails on ${at}.`
		: `The check fails on ${v.violations.length} edge directions. Largest failure, ${at}.`;
}

/** The short verdict read out when it changes. */
export function verdictSummary(v: Verdicts): string {
	const a = v.admissible ? 'admissible' : `not admissible (${plural(v.over.length, 'state')})`;
	const c = v.consistent
		? 'consistent'
		: `not consistent (${plural(v.violations.length, 'edge direction')})`;
	return `h is ${a} and ${c}.`;
}

// ---------------------------------------------------------------------------
// A* runs
// ---------------------------------------------------------------------------

/** Search limits per run: the page reruns every search on each edit. */
export const RUN_LIMITS = { maxExpansions: 5000, maxNodes: 20_000 } as const;

export interface RunReport {
	mode: RepeatMode;
	strategy: 'astar' | 'wastar';
	/** α for weighted A* (1 for A*). */
	weight: number;
	cost: number | null;
	states: string[] | null;
	expanded: number;
	popped: number;
	generated: number;
	/** The search stopped at RUN_LIMITS before it ended. */
	stopped: boolean;
	/** cost ≤ C* (null without a solution or without C*). */
	optimal: boolean | null;
	result: SearchResult;
}

/** A* (or weighted A* with α = `weight` ≠ 1) with heuristic `h`, in tree or graph mode. */
export function runAStar(
	spec: GraphProblemSpec,
	h: Heuristic,
	mode: RepeatMode,
	cStar: number | null,
	weight = 1
): RunReport {
	const weighted = Math.abs(weight - 1) > EPS;
	const result = search(graphProblem({ ...spec, h: fullHeuristic(spec, h) }), {
		strategy: weighted ? 'wastar' : 'astar',
		mode,
		...(weighted ? { weight } : {}),
		...RUN_LIMITS,
		record: 'summary'
	});
	const sol = result.solution;
	return {
		mode,
		strategy: weighted ? 'wastar' : 'astar',
		weight: weighted ? weight : 1,
		cost: sol ? sol.cost : null,
		states: sol ? sol.states : null,
		expanded: result.stats.expanded,
		popped: result.stats.popped,
		generated: result.stats.generated,
		stopped: result.failure === 'limit',
		optimal: sol && cStar !== null ? sol.cost <= cStar + EPS : null,
		result
	};
}

/** C* and a cheapest path, or null when no goal can be reached. */
export function optimalPath(spec: GraphProblemSpec): { cost: number; states: string[] } | null {
	return shortestPath(spec);
}

export interface PoppedNode {
	/** Position in the order nodes were taken off the frontier (0-based). */
	index: number;
	label: string;
	g: number;
	h: number;
	/** f(n) = g(n) + h(n). */
	f: number;
}

export interface FBands {
	below: PoppedNode[];
	equal: PoppedNode[];
	above: PoppedNode[];
}

/**
 * The nodes an A* run took off the frontier, grouped by f(n) against C*
 * (slide 30: A* expands all nodes with f(n) ≤ C*), each group in pop order.
 * The goal node is included.
 */
export function fBands(result: SearchResult, cStar: number): FBands {
	const popped = result.nodes
		.filter((n) => n.closed !== null)
		.sort((a, b) => a.closed! - b.closed!)
		.map((n, index) => {
			const h = n.h ?? 0;
			return { index, label: n.label, g: n.g, h, f: n.g + h };
		});
	return {
		below: popped.filter((n) => n.f < cStar - EPS),
		equal: popped.filter((n) => Math.abs(n.f - cStar) <= EPS),
		above: popped.filter((n) => n.f > cStar + EPS)
	};
}

// ---------------------------------------------------------------------------
// Dominance and combining (slides 35, 37)
// ---------------------------------------------------------------------------

export type SecondKind = 'zero' | 'perfect' | 'preset' | 'scaled' | 'custom';

/** The heuristic h1 is compared with. */
export type SecondChoice =
	| { kind: 'zero' }
	| { kind: 'perfect' }
	| { kind: 'preset' }
	| { kind: 'scaled'; factor: number }
	| { kind: 'custom'; h: Record<string, number> };

export interface DominanceRow {
	id: string;
	h1: number;
	h2: number;
	max: number;
	/** Sign of h2 − h1. */
	cmp: -1 | 0 | 1;
}

export type DominanceVerdict =
	/** Same values everywhere. */
	| 'equal'
	/** h2 ≥ h1 everywhere. */
	| 'h2'
	/** h1 ≥ h2 everywhere. */
	| 'h1'
	/** Each is larger somewhere. */
	| 'neither';

export interface DominanceReport {
	rows: DominanceRow[];
	verdict: DominanceVerdict;
	admissible1: boolean;
	admissible2: boolean;
	admissibleMax: boolean;
	/** max{h1, h2} by state. */
	max: Record<string, number>;
}

export function dominance(spec: GraphProblemSpec, h1: Heuristic, h2: Heuristic): DominanceReport {
	const forward = compareHeuristics(spec, h1, h2);
	const backward = compareHeuristics(spec, h2, h1);
	const max = maxOf(spec, h1, h2);
	const rows = forward.nodes.map((n) => {
		const d = n.h2 - n.h1;
		return {
			id: n.id,
			h1: n.h1,
			h2: n.h2,
			max: max[n.id],
			cmp: (Math.abs(d) <= EPS ? 0 : d > 0 ? 1 : -1) as -1 | 0 | 1
		};
	});
	const verdict: DominanceVerdict = forward.equal
		? 'equal'
		: forward.dominates
			? 'h2'
			: backward.dominates
				? 'h1'
				: 'neither';
	return {
		rows,
		verdict,
		admissible1: checkHeuristic(spec, h1).admissible,
		admissible2: checkHeuristic(spec, h2).admissible,
		admissibleMax: checkHeuristic(spec, max).admissible,
		max
	};
}

/** One sentence on which heuristic dominates (slide 35 needs both admissible). */
export function dominanceSentence(d: DominanceReport): string {
	const both = d.admissible1 && d.admissible2;
	switch (d.verdict) {
		case 'equal':
			return 'h1 and h2 have the same value at every state.';
		case 'h2':
			return both
				? 'h2(n) ≥ h1(n) for all n and both are admissible: h2 dominates h1.'
				: `h2(n) ≥ h1(n) for all n, but ${notAdmissible(d)}, so neither dominates in the slide’s sense.`;
		case 'h1':
			return both
				? 'h1(n) ≥ h2(n) for all n and both are admissible: h1 dominates h2.'
				: `h1(n) ≥ h2(n) for all n, but ${notAdmissible(d)}, so neither dominates in the slide’s sense.`;
		case 'neither':
			return 'Each is larger at some state, so neither dominates the other; max{h1(n), h2(n)} is at least as large as both everywhere.';
	}
}

function notAdmissible(d: DominanceReport): string {
	if (!d.admissible1 && !d.admissible2) return 'neither is admissible';
	return d.admissible1 ? 'h2 is not admissible' : 'h1 is not admissible';
}
