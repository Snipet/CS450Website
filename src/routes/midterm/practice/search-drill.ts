/**
 * Expansion-order practice: a random search problem drawn like the tiny
 * search problem of Uninformed Search (slide 3), a strategy, and the order in
 * which the strategy takes nodes off the frontier (the "expansion order" of
 * slides 4, 6 and 41), computed with the search engine under the site's
 * defaults (alphabetical successors, goal test on expansion, FIFO ties).
 */
import { seededRandom } from '$lib/theory/games';
import {
	formatGraphText,
	trueCosts,
	graphProblem,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import { search, type RepeatMode, type SearchResult } from '$lib/theory/search';

export type DrillStrategy = 'bfs' | 'dfs' | 'dls' | 'ids' | 'ucs' | 'greedy' | 'astar';

export const DRILL_STRATEGIES: readonly DrillStrategy[] = [
	'bfs',
	'dfs',
	'dls',
	'ids',
	'ucs',
	'greedy',
	'astar'
];

/** The strategy as an adjective for "… tree search" / "… graph search". */
export const DRILL_ADJECTIVE: Record<DrillStrategy, string> = {
	bfs: 'Breadth-first',
	dfs: 'Depth-first',
	dls: 'Depth-limited',
	ids: 'Iterative deepening',
	ucs: 'Uniform-cost',
	greedy: 'Greedy best-first',
	astar: 'A*'
};

/** Strategies whose frontier is a priority queue (ties matter there). */
const PRIORITY: ReadonlySet<DrillStrategy> = new Set(['ucs', 'greedy', 'astar']);

export interface SearchDrillSettings {
	strategy: DrillStrategy;
	/** Tree search or graph search (explored set and frontier check). */
	mode: Extract<RepeatMode, 'tree' | 'graph'>;
	seed: number;
}

export interface SearchDrill extends SearchDrillSettings {
	spec: GraphProblemSpec;
	/** DLS: the depth limit (nodes at this depth are not expanded). */
	depthLimit: number;
	result: SearchResult;
	/** Labels in the order they come off the frontier, all IDS iterations in sequence. */
	order: string[];
	/** IDS: the order per depth limit; one entry for the other strategies. */
	iterations: { limit: number | null; order: string[] }[];
}

/** Inner state names; S is the start and G the goal. */
const NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'H'];
const LAYER_GAP = 120;
const ROW_GAP = 86;
/** Generated problems tried per seed before the last one is kept. */
const ATTEMPTS = 400;

const ORDER_BOUNDS: Record<DrillStrategy, [number, number]> = {
	bfs: [5, 14],
	dfs: [5, 12],
	dls: [5, 14],
	ids: [8, 24],
	ucs: [6, 12],
	greedy: [4, 10],
	astar: [6, 12]
};

type Random = () => number;

const pick = <T>(rand: Random, list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const between = (rand: Random, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

function shuffled<T>(rand: Random, list: readonly T[]): T[] {
	const out = [...list];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * A layered directed acyclic graph from S to G: inner states in two or three
 * layers, every inner state reachable from S, G reachable, extra edges
 * (including edges that skip a layer), and step costs 1–9. Names are shuffled
 * across the layers so alphabetical order is not top-to-bottom order.
 */
export function randomLayeredProblem(rand: Random): GraphProblemSpec {
	const layerCount = between(rand, 2, 3);
	const inner = between(rand, layerCount + 2, Math.min(NAMES.length, layerCount * 2 + 1));
	// Every layer gets at least one state; the rest go to random layers (at most 3 per layer).
	const sizes = new Array<number>(layerCount).fill(1);
	for (let k = layerCount; k < inner; k++) {
		const open = sizes.map((s, i) => (s < 3 ? i : -1)).filter((i) => i >= 0);
		sizes[pick(rand, open)]++;
	}
	const names = shuffled(rand, NAMES.slice(0, inner));
	const layers: string[][] = [['S']];
	let next = 0;
	for (const size of sizes) layers.push(names.slice(next, (next += size)));
	layers.push(['G']);

	const edges = new Map<string, number>();
	const add = (from: string, to: string) => {
		if (!edges.has(`${from}>${to}`)) edges.set(`${from}>${to}`, between(rand, 1, 9));
	};
	for (let l = 1; l < layers.length; l++) {
		for (const to of layers[l]) {
			// Every state has a way in from the previous layer.
			add(pick(rand, layers[l - 1]), to);
		}
		for (const from of layers[l - 1]) {
			// And every state but G has a way out (dead ends come from the extra edges' absence).
			if (!layers[l].some((to) => edges.has(`${from}>${to}`)) && rand() < 0.75)
				add(from, pick(rand, layers[l]));
		}
	}
	for (let l = 0; l < layers.length - 1; l++) {
		for (const from of layers[l]) {
			for (const to of layers[l + 1]) if (rand() < 0.3) add(from, to);
			if (l + 2 < layers.length && rand() < 0.25) add(from, pick(rand, layers[l + 2]));
		}
	}

	const nodes = layers.flatMap((layer, l) =>
		layer.map((id, i) => ({
			id,
			x: l * LAYER_GAP,
			y: Math.round((i - (layer.length - 1) / 2) * ROW_GAP)
		}))
	);
	// Edges listed by source position, then target position (the order a reader scans the drawing).
	const position = new Map(nodes.map((n, i) => [n.id, i]));
	const list = [...edges.entries()]
		.map(([key, cost]) => {
			const [from, to] = key.split('>');
			return { from, to, cost };
		})
		.sort(
			(a, b) =>
				position.get(a.from)! - position.get(b.from)! || position.get(a.to)! - position.get(b.to)!
		);
	return { graph: { directed: true, nodes, edges: list }, start: 'S', goals: ['G'] };
}

/**
 * A consistent (so admissible) heuristic: h*(n) lowered at random by up to
 * `fraction` of its value, states that cannot reach a goal given a value of
 * 2–8 (any value is admissible there), then values lowered further until
 * h(n) ≤ c(n, n') + h(n') on every edge. Lowering keeps h ≤ h*, and the
 * relaxation ends because values only fall and stay ≥ 0. Goals keep h = 0.
 */
export function consistentHeuristic(
	spec: GraphProblemSpec,
	rand: Random,
	fraction = 0.5
): Record<string, number> {
	const hStar = trueCosts(spec);
	const h: Record<string, number> = {};
	for (const { id } of spec.graph.nodes) {
		const star = hStar.get(id)!;
		h[id] = Number.isFinite(star)
			? Math.max(0, star - between(rand, 0, Math.ceil(star * fraction)))
			: between(rand, 2, 8);
	}
	for (const g of spec.goals) h[g] = 0;
	const arcs = spec.graph.edges.flatMap((e) =>
		spec.graph.directed ? [e] : [e, { from: e.to, to: e.from, cost: e.cost }]
	);
	let changed = true;
	while (changed) {
		changed = false;
		for (const { from, to, cost } of arcs) {
			if (h[from] > cost + h[to]) {
				h[from] = cost + h[to];
				changed = true;
			}
		}
	}
	return h;
}

/** Whether some node came off the frontier tied on priority with the node behind it. */
export function hasPriorityTie(result: SearchResult): boolean {
	const { steps, nodes } = result;
	for (let k = 1; k < steps.length; k++) {
		const before = steps[k - 1].frontier ?? [];
		if (before.length < 2 || steps[k].kind === 'init') continue;
		const [first, second] = before;
		if (nodes[first].priority !== null && nodes[first].priority === nodes[second].priority)
			return true;
	}
	return false;
}

function run(spec: GraphProblemSpec, s: SearchDrillSettings, depthLimit: number): SearchResult {
	return search(graphProblem(spec), {
		strategy: s.strategy,
		mode: s.mode,
		depthLimit: s.strategy === 'dls' ? depthLimit : undefined,
		maxExpansions: 200
	});
}

function acceptable(s: SearchDrillSettings, result: SearchResult): boolean {
	const [lo, hi] = ORDER_BOUNDS[s.strategy];
	if (result.order.length < lo || result.order.length > hi) return false;
	if (result.failure === 'limit') return false;
	if (s.strategy !== 'dls' && !result.solution) return false;
	if (PRIORITY.has(s.strategy) && hasPriorityTie(result)) return false;
	return true;
}

/** A drill for the settings: the same seed and settings always give the same problem. */
export function searchDrill(settings: SearchDrillSettings): SearchDrill {
	const rand = seededRandom(settings.seed * 7919 + DRILL_STRATEGIES.indexOf(settings.strategy));
	let spec: GraphProblemSpec | null = null;
	let result: SearchResult | null = null;
	let depthLimit = 2;
	for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
		const candidate = randomLayeredProblem(rand);
		if (settings.strategy === 'greedy' || settings.strategy === 'astar') {
			candidate.h = consistentHeuristic(candidate, rand);
			candidate.hLabel = 'Consistent heuristic';
		}
		const limit = between(rand, 2, 3);
		const r = run(candidate, settings, limit);
		spec = candidate;
		result = r;
		depthLimit = limit;
		if (acceptable(settings, r)) break;
	}
	const res = result!;
	const iterations =
		settings.strategy === 'ids'
			? res.iterations.map((it) => ({ limit: it.limit, order: it.order }))
			: [{ limit: settings.strategy === 'dls' ? depthLimit : null, order: res.order }];
	return { ...settings, spec: spec!, depthLimit, result: res, order: res.order, iterations };
}

/** The drill's problem as graph text with positions (for a link to the search tool). */
export function drillGraphText(drill: Pick<SearchDrill, 'spec'>): string {
	return formatGraphText(drill.spec, { positions: true });
}

export interface ParsedOrder {
	/** State names as typed, matched to the problem's names ignoring case. */
	states: string[];
	/** Tokens that are not state names. */
	unknown: string[];
}

/**
 * Reads an expansion order typed as names separated by spaces, commas,
 * arrows, or bars ("S A B", "S, A, B", "S → A | B"). Names match ignoring case.
 */
export function parseOrder(text: string, names: readonly string[]): ParsedOrder {
	const byLower = new Map(names.map((n) => [n.toLowerCase(), n]));
	const states: string[] = [];
	const unknown: string[] = [];
	for (const token of text.split(/[\s,;|()[\]→>]+|-+>?/u)) {
		if (!token) continue;
		const name = byLower.get(token.toLowerCase());
		if (name) states.push(name);
		else unknown.push(token);
	}
	return { states, unknown };
}

export type OrderCheck =
	| { kind: 'empty' }
	| { kind: 'unknown'; tokens: string[] }
	| { kind: 'correct'; length: number }
	/** `matched`: how many leading entries are right. */
	| { kind: 'short'; matched: number; length: number }
	| { kind: 'long'; length: number }
	| { kind: 'wrong'; matched: number };

/** Compares a typed order with the expected one without giving the rest away. */
export function checkOrder(expected: readonly string[], typed: ParsedOrder): OrderCheck {
	if (typed.unknown.length) return { kind: 'unknown', tokens: typed.unknown };
	const given = typed.states;
	if (!given.length) return { kind: 'empty' };
	let matched = 0;
	while (
		matched < given.length &&
		matched < expected.length &&
		given[matched] === expected[matched]
	)
		matched++;
	if (matched === given.length && matched === expected.length)
		return { kind: 'correct', length: matched };
	if (matched === given.length) return { kind: 'short', matched, length: expected.length };
	if (matched === expected.length) return { kind: 'long', length: expected.length };
	return { kind: 'wrong', matched };
}
