/**
 * Heuristic practice: a small undirected graph with h values that are
 * consistent, admissible but not consistent, or not admissible (Informed
 * Search, slides 25–29), checked with the heuristic analysis of the graph
 * engine, plus what A* tree and graph search return with that h.
 */
import { seededRandom } from '$lib/theory/games';
import {
	checkHeuristic,
	formatGraphText,
	graphProblem,
	shortestPath,
	trueCosts,
	type GraphProblemSpec,
	type HeuristicReport
} from '$lib/theory/graphs';
import { search } from '$lib/theory/search';
import { consistentHeuristic } from './search-drill';

export type HeuristicKind = 'consistent' | 'admissible' | 'inadmissible';

export interface AStarOutcome {
	cost: number | null;
	states: string[];
	optimal: boolean;
}

export interface HeuristicDrill {
	seed: number;
	kind: HeuristicKind;
	spec: GraphProblemSpec;
	report: HeuristicReport;
	/** Cost of a cheapest path from S to G. */
	optimalCost: number;
	tree: AStarOutcome;
	graph: AStarOutcome;
}

type Random = () => number;
const between = (rand: Random, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

/** Positions of the six states (S at the left, G at the right). */
const LAYOUT: Record<string, [number, number]> = {
	S: [0, 90],
	A: [120, 0],
	B: [120, 180],
	C: [250, 0],
	D: [250, 180],
	G: [370, 90]
};

/** Edges that can be drawn on LAYOUT without crossings; the spine keeps the graph connected. */
const SPINE: readonly [string, string][] = [
	['S', 'A'],
	['S', 'B'],
	['A', 'C'],
	['B', 'D'],
	['C', 'G'],
	['D', 'G']
];
const EXTRA: readonly [string, string][] = [
	['A', 'B'],
	['C', 'D'],
	['A', 'D']
];

/** A connected six-state graph on LAYOUT: a random spanning set of edges plus extras, costs 1–6. */
export function randomSmallGraph(rand: Random): GraphProblemSpec {
	// Drop at most one spine edge, keeping S–G connected (the extras can reconnect it).
	const spine = [...SPINE];
	if (rand() < 0.5) spine.splice(Math.floor(rand() * spine.length), 1);
	const chosen = [...spine, ...EXTRA.filter(() => rand() < 0.5)];
	const nodes = Object.entries(LAYOUT).map(([id, [x, y]]) => ({ id, x, y }));
	const edges = chosen.map(([from, to]) => ({ from, to, cost: between(rand, 1, 6) }));
	return { graph: { directed: false, nodes, edges }, start: 'S', goals: ['G'] };
}

function connected(spec: GraphProblemSpec): boolean {
	const hStar = trueCosts(spec);
	return [...hStar.values()].every(Number.isFinite);
}

/** Raises one state to h* and lowers a neighbor so that one edge breaks consistency; null if no edge can. */
function breakConsistency(
	spec: GraphProblemSpec,
	h: Record<string, number>,
	rand: Random
): Record<string, number> | null {
	const hStar = trueCosts(spec);
	const arcs = spec.graph.edges.flatMap((e) => [e, { from: e.to, to: e.from, cost: e.cost }]);
	const candidates = arcs.filter(
		({ from, to, cost }) =>
			!spec.goals.includes(from) && !spec.goals.includes(to) && hStar.get(from)! - cost - 1 >= 0
	);
	if (!candidates.length) return null;
	const { from, to, cost } = candidates[Math.floor(rand() * candidates.length)];
	const out = { ...h };
	out[from] = hStar.get(from)!;
	out[to] = Math.min(out[to], hStar.get(from)! - cost - 1);
	return out;
}

function makeInadmissible(
	spec: GraphProblemSpec,
	h: Record<string, number>,
	rand: Random
): Record<string, number> {
	const hStar = trueCosts(spec);
	const inner = spec.graph.nodes.map((n) => n.id).filter((id) => !spec.goals.includes(id));
	const id = inner[Math.floor(rand() * inner.length)];
	return { ...h, [id]: hStar.get(id)! + between(rand, 1, 3) };
}

function outcome(spec: GraphProblemSpec, mode: 'tree' | 'graph', optimal: number): AStarOutcome {
	const r = search(graphProblem(spec), { strategy: 'astar', mode, maxExpansions: 500 });
	const cost = r.solution?.cost ?? null;
	return { cost, states: r.solution?.states ?? [], optimal: cost === optimal };
}

const KINDS: readonly HeuristicKind[] = ['consistent', 'admissible', 'inadmissible'];

/** The kind a seed asks for, picked at random so the next one cannot be predicted. */
export function kindForSeed(seed: number): HeuristicKind {
	return KINDS[Math.floor(seededRandom(seed * 31 + 7)() * KINDS.length)];
}

/** A drill for `seed`; `kind` defaults to `kindForSeed(seed)`. */
export function heuristicDrill(
	seed: number,
	kind: HeuristicKind = kindForSeed(seed)
): HeuristicDrill {
	const rand = seededRandom(seed * 104729 + 17);
	let spec = randomSmallGraph(rand);
	for (let attempt = 0; attempt < 200; attempt++) {
		const candidate = attempt === 0 ? spec : randomSmallGraph(rand);
		if (!connected(candidate)) continue;
		const base = consistentHeuristic(candidate, rand, 0.4);
		const h =
			kind === 'consistent'
				? base
				: kind === 'admissible'
					? breakConsistency(candidate, base, rand)
					: makeInadmissible(candidate, base, rand);
		if (!h) continue;
		const report = checkHeuristic(candidate, h);
		const fits =
			kind === 'consistent'
				? report.consistent
				: kind === 'admissible'
					? report.admissible && !report.consistent
					: !report.admissible;
		spec = { ...candidate, h };
		if (fits) break;
	}
	const report = checkHeuristic(spec);
	const optimalCost = shortestPath(spec)?.cost ?? Infinity;
	return {
		seed,
		kind,
		spec,
		report,
		optimalCost,
		tree: outcome(spec, 'tree', optimalCost),
		graph: outcome(spec, 'graph', optimalCost)
	};
}

export function heuristicGraphText(drill: Pick<HeuristicDrill, 'spec'>): string {
	return formatGraphText(drill.spec, { positions: true });
}

export interface HeuristicAnswer {
	admissible: boolean | null;
	consistent: boolean | null;
}

/** Which answers are right (null: not answered). */
export function gradeHeuristic(
	drill: Pick<HeuristicDrill, 'report'>,
	answer: HeuristicAnswer
): { admissible: boolean | null; consistent: boolean | null } {
	const grade = (given: boolean | null, truth: boolean) =>
		given === null ? null : given === truth;
	return {
		admissible: grade(answer.admissible, drill.report.admissible),
		consistent: grade(answer.consistent, drill.report.consistent)
	};
}
