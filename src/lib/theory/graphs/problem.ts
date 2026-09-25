import type { SearchProblem, Successor } from '../search/types';
import { compareNames } from './names';
import type { GraphEdge, GraphProblemSpec, SuccessorOrder, WeightedGraph } from './types';

/** An edge as seen from one end: where it leads and what it costs. */
export interface Neighbor {
	to: string;
	cost: number;
	/** Index into `graph.edges`. */
	edge: number;
}

/**
 * Outgoing edges of every node (both directions for undirected graphs), in the
 * requested successor order. Edges naming unknown nodes are ignored.
 */
export function adjacency(
	graph: WeightedGraph,
	order: SuccessorOrder = 'alphabetical'
): Map<string, Neighbor[]> {
	const adj = new Map<string, Neighbor[]>(graph.nodes.map((n) => [n.id, []]));
	graph.edges.forEach((e: GraphEdge, i) => {
		if (!adj.has(e.from) || !adj.has(e.to)) return;
		adj.get(e.from)!.push({ to: e.to, cost: e.cost, edge: i });
		if (!graph.directed && e.from !== e.to)
			adj.get(e.to)!.push({ to: e.from, cost: e.cost, edge: i });
	});
	if (order === 'alphabetical') {
		for (const list of adj.values()) {
			// Stable: parallel edges to the same neighbor keep their listed order.
			list.sort((a, b) => compareNames(a.to, b.to));
		}
	}
	return adj;
}

/** A graph search problem over node names; each action is named after the node it leads to. */
export function graphProblem(
	spec: GraphProblemSpec,
	options: { order?: SuccessorOrder } = {}
): SearchProblem<string> {
	const adj = adjacency(spec.graph, options.order);
	const goals = new Set(spec.goals);
	const h = spec.h;
	return {
		initial: spec.start,
		key: (s) => s,
		successors: (s): Successor<string>[] =>
			(adj.get(s) ?? []).map((n) => ({ action: n.to, state: n.to, cost: n.cost })),
		isGoal: (s) => goals.has(s),
		h: h ? (s) => (Object.hasOwn(h, s) ? h[s] : 0) : undefined
	};
}
