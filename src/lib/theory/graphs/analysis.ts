/**
 * Heuristic analysis on explicit graphs (Informed Search, slides 25–29 and
 * 35–37): true costs h*(n), the optimal path, admissibility (h(n) ≤ h*(n)),
 * consistency (h(n) ≤ c(n, n') + h(n') for every edge), dominance, and the
 * pointwise maximum of heuristics. A state without an h value has h = 0.
 */
import { compareNames } from './names';
import type { GraphProblemSpec, WeightedGraph } from './types';

/** Tolerance for comparing sums of costs. */
const EPS = 1e-9;

type Heuristic = Readonly<Record<string, number>>;

/** h(n) with missing values as 0 (own properties only, so "constructor" is a state like any other). */
function hOf(h: Heuristic, id: string): number {
	return Object.hasOwn(h, id) ? h[id] : 0;
}

interface Arc {
	to: string;
	cost: number;
}

/**
 * Arcs out of each node (`reverse`: into it, pointing back), both ways for
 * undirected edges. Edges naming unknown nodes are ignored.
 */
function arcs(graph: WeightedGraph, reverse: boolean): Map<string, Arc[]> {
	const out = new Map<string, Arc[]>(graph.nodes.map((n) => [n.id, []]));
	for (const e of graph.edges) {
		if (!out.has(e.from) || !out.has(e.to)) continue;
		const [a, b] = reverse ? [e.to, e.from] : [e.from, e.to];
		out.get(a)!.push({ to: b, cost: e.cost });
		if (!graph.directed && a !== b) out.get(b)!.push({ to: a, cost: e.cost });
	}
	return out;
}

/** Binary min-heap of [priority, name], ties by name order. */
class Heap {
	private items: [number, string][] = [];
	get size() {
		return this.items.length;
	}
	private less(i: number, j: number) {
		const [pa, a] = this.items[i];
		const [pb, b] = this.items[j];
		return pa < pb || (pa === pb && compareNames(a, b) < 0);
	}
	private swap(i: number, j: number) {
		[this.items[i], this.items[j]] = [this.items[j], this.items[i]];
	}
	push(priority: number, id: string) {
		const items = this.items;
		items.push([priority, id]);
		for (let i = items.length - 1; i > 0;) {
			const p = (i - 1) >> 1;
			if (!this.less(i, p)) break;
			this.swap(i, p);
			i = p;
		}
	}
	pop(): [number, string] {
		const items = this.items;
		const top = items[0];
		const last = items.pop()!;
		if (items.length) {
			items[0] = last;
			for (let i = 0; ;) {
				const l = 2 * i + 1;
				const r = l + 1;
				let m = i;
				if (l < items.length && this.less(l, m)) m = l;
				if (r < items.length && this.less(r, m)) m = r;
				if (m === i) break;
				this.swap(i, m);
				i = m;
			}
		}
		return top;
	}
}

/**
 * h*(n) for every node: the cost of a cheapest path from n to any goal
 * (Infinity when no goal is reachable). Dijkstra from the goals over reversed
 * edges; undirected edges count both ways. Step costs are assumed ≥ 0.
 */
export function trueCosts(spec: GraphProblemSpec): Map<string, number> {
	const back = arcs(spec.graph, true);
	const dist = new Map<string, number>(spec.graph.nodes.map((n) => [n.id, Infinity]));
	const heap = new Heap();
	for (const g of spec.goals) {
		if (!dist.has(g) || dist.get(g) === 0) continue;
		dist.set(g, 0);
		heap.push(0, g);
	}
	while (heap.size) {
		const [d, u] = heap.pop();
		if (d > dist.get(u)!) continue;
		for (const { to, cost } of back.get(u)!) {
			const nd = d + cost;
			if (nd < dist.get(to)!) {
				dist.set(to, nd);
				heap.push(nd, to);
			}
		}
	}
	return dist;
}

/** Whether two sums of costs are equal up to rounding. */
const sameCost = (a: number, b: number) =>
	Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * A cheapest path from the start to the nearest goal, or null when no goal
 * is reachable (or the start is not a node). Among paths of equal cost the
 * one whose state names come first in name order wins, compared from the
 * start (a path never continues past a goal, since its prefix would come
 * first). This holds with zero-cost edges too.
 *
 * Every cheapest path uses only "tight" edges (n → n' with g(n) + c = g(n'),
 * g the distance from the start), and every path of tight edges from the
 * start to a goal at distance C* is a cheapest one. So the path is built one
 * state at a time: the first successor in name order, over a tight edge, that
 * can still reach such a goal by tight edges without revisiting the path.
 */
export function shortestPath(spec: GraphProblemSpec): { cost: number; states: string[] } | null {
	const next = arcs(spec.graph, false);
	if (!next.has(spec.start)) return null;

	// Dijkstra from the start.
	const dist = new Map<string, number>([[spec.start, 0]]);
	const heap = new Heap();
	heap.push(0, spec.start);
	const done = new Set<string>();
	while (heap.size) {
		const [d, u] = heap.pop();
		if (done.has(u)) continue;
		done.add(u);
		for (const { to, cost } of next.get(u)!) {
			const nd = d + cost;
			if (nd < (dist.get(to) ?? Infinity)) {
				dist.set(to, nd);
				heap.push(nd, to);
			}
		}
	}

	let best = Infinity;
	for (const g of spec.goals) best = Math.min(best, dist.get(g) ?? Infinity);
	if (!Number.isFinite(best)) return null;
	const targets = new Set(spec.goals.filter((g) => dist.has(g) && sameCost(dist.get(g)!, best)));
	const tight = (u: string, v: string, cost: number) =>
		dist.has(u) && dist.has(v) && sameCost(dist.get(u)! + cost, dist.get(v)!);

	// States that reach a target by tight edges without entering `avoid`.
	const back = arcs(spec.graph, true);
	const reaching = (avoid: ReadonlySet<string>): Set<string> => {
		const seen = new Set<string>();
		const queue: string[] = [];
		for (const t of targets) {
			if (avoid.has(t)) continue;
			seen.add(t);
			queue.push(t);
		}
		for (let k = 0; k < queue.length; k++) {
			const v = queue[k];
			for (const { to: u, cost } of back.get(v)!) {
				if (seen.has(u) || avoid.has(u) || !tight(u, v, cost)) continue;
				seen.add(u);
				queue.push(u);
			}
		}
		return seen;
	};

	const states = [spec.start];
	const onPath = new Set(states);
	let at = spec.start;
	while (!targets.has(at)) {
		const ok = reaching(onPath);
		let pick: string | null = null;
		for (const { to, cost } of next.get(at)!) {
			if (onPath.has(to) || !ok.has(to) || !tight(at, to, cost)) continue;
			if (pick === null || compareNames(to, pick) < 0) pick = to;
		}
		if (pick === null) return null; // not reached: some successor always continues the path
		states.push(pick);
		onPath.add(pick);
		at = pick;
	}
	return { cost: dist.get(at)!, states };
}

export interface HeuristicReport {
	/** h(n) ≤ h*(n) for every node (nodes that cannot reach a goal always pass). */
	admissible: boolean;
	/** h(n) ≤ c(n, n') + h(n') for every edge direction. */
	consistent: boolean;
	/** h(g) = 0 for every goal g. */
	goalsZero: boolean;
	/** In graph order. */
	nodes: { id: string; h: number; hStar: number; admissible: boolean }[];
	/** In edge order; an undirected edge appears twice: from → to, then to → from. */
	edges: {
		from: string;
		to: string;
		cost: number;
		hFrom: number;
		hTo: number;
		consistent: boolean;
	}[];
}

/**
 * Checks a heuristic (default: the spec's own; missing values are 0) against
 * the graph: admissibility per node against h*, consistency per edge
 * direction, and whether every goal has h = 0.
 */
export function checkHeuristic(
	spec: GraphProblemSpec,
	h: Heuristic = spec.h ?? {}
): HeuristicReport {
	const { graph } = spec;
	const hStar = trueCosts(spec);
	const nodes = graph.nodes.map(({ id }) => {
		const value = hOf(h, id);
		const star = hStar.get(id)!;
		return { id, h: value, hStar: star, admissible: value <= star + EPS };
	});
	const ids = new Set(hStar.keys());
	const edges: HeuristicReport['edges'] = [];
	const check = (from: string, to: string, cost: number) => {
		const hFrom = hOf(h, from);
		const hTo = hOf(h, to);
		edges.push({ from, to, cost, hFrom, hTo, consistent: hFrom <= cost + hTo + EPS });
	};
	for (const e of graph.edges) {
		if (!ids.has(e.from) || !ids.has(e.to)) continue;
		check(e.from, e.to, e.cost);
		if (!graph.directed && e.from !== e.to) check(e.to, e.from, e.cost);
	}
	return {
		admissible: nodes.every((n) => n.admissible),
		consistent: edges.every((e) => e.consistent),
		goalsZero: spec.goals.every((g) => Math.abs(hOf(h, g)) <= EPS),
		nodes,
		edges
	};
}

export interface HeuristicComparison {
	/** h2(n) ≥ h1(n) for every node (with both admissible, h2 dominates h1: Informed Search, slide 35). */
	dominates: boolean;
	/** h1(n) = h2(n) for every node. */
	equal: boolean;
	/** In graph order; missing values are 0. */
	nodes: { id: string; h1: number; h2: number }[];
}

/** Compares two heuristics node by node over the spec's graph. */
export function compareHeuristics(
	spec: GraphProblemSpec,
	h1: Heuristic,
	h2: Heuristic
): HeuristicComparison {
	const nodes = spec.graph.nodes.map(({ id }) => ({ id, h1: hOf(h1, id), h2: hOf(h2, id) }));
	return {
		dominates: nodes.every((n) => n.h2 >= n.h1 - EPS),
		equal: nodes.every((n) => Math.abs(n.h2 - n.h1) <= EPS),
		nodes
	};
}

/**
 * h(n) = max{h1(n), …, hm(n)} (Informed Search, slide 37) over every state
 * any of them names; a missing value counts as 0.
 */
export function maxHeuristic(...hs: Heuristic[]): Record<string, number> {
	const keys = new Set(hs.flatMap((h) => Object.keys(h)));
	// Object.fromEntries keeps even "__proto__" as an own property.
	return Object.fromEntries([...keys].map((k) => [k, Math.max(...hs.map((h) => hOf(h, k)))]));
}
