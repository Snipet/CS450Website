/**
 * Explicit weighted graphs: the state spaces drawn on the slides (Romania, the
 * tiny search problem) and ones typed into the tools. See docs/ARCHITECTURE.md §4.2.
 */

export interface GraphNode {
	/** Unique name; also the display label. */
	id: string;
	/** Position in drawing units (y grows downward). Missing positions are laid out automatically. */
	x?: number;
	y?: number;
}

export interface GraphEdge {
	from: string;
	to: string;
	/** Step cost (≥ 0). */
	cost: number;
}

export interface WeightedGraph {
	/** Undirected edges can be taken both ways and are listed once. */
	directed: boolean;
	/** In declaration order. */
	nodes: GraphNode[];
	edges: GraphEdge[];
}

/** A graph search problem: a graph, a start state, goal states, and an optional heuristic. */
export interface GraphProblemSpec {
	graph: WeightedGraph;
	start: string;
	goals: string[];
	/** h(n) by node name; nodes left out have h = 0. */
	h?: Readonly<Record<string, number>>;
	/** What the heuristic is, e.g. "Straight-line distance to Bucharest". */
	hLabel?: string;
}

/**
 * Order of the successor function's output.
 * - `alphabetical` (default): by neighbor name, as the lecture examples expand them.
 * - `listed`: in the order the edges are written.
 */
export type SuccessorOrder = 'alphabetical' | 'listed';
