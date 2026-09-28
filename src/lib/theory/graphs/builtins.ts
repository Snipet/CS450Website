/**
 * Graphs drawn on the lecture slides. Node positions are read off the slide
 * drawings (drawing units, y down), so the tools draw them the same way.
 */
import type { GraphProblemSpec, WeightedGraph } from './types';

// ---------------------------------------------------------------------------
// Romania (Solving Problems by Searching, slide 6; Informed Search, slide 6)
// ---------------------------------------------------------------------------

const ROMANIA_POS: Record<string, [number, number]> = {
	Arad: [26, 233],
	Bucharest: [849, 672],
	Craiova: [455, 778],
	Dobreta: [222, 746],
	Eforie: [1280, 762],
	Fagaras: [599, 347],
	Giurgiu: [780, 822],
	Hirsova: [1203, 611],
	Iasi: [1044, 195],
	Lugoj: [222, 536],
	Mehadia: [230, 640],
	Neamt: [864, 114],
	Oradea: [132, 21],
	Pitesti: [638, 567],
	'Rimnicu Vilcea': [403, 452],
	Sibiu: [336, 324],
	Timisoara: [33, 452],
	Urziceni: [1000, 611],
	Vaslui: [1139, 359],
	Zerind: [72, 127]
};

/** Road distances in km, as on the map. */
const ROMANIA_ROADS: [string, string, number][] = [
	['Arad', 'Zerind', 75],
	['Arad', 'Sibiu', 140],
	['Arad', 'Timisoara', 118],
	['Zerind', 'Oradea', 71],
	['Oradea', 'Sibiu', 151],
	['Timisoara', 'Lugoj', 111],
	['Lugoj', 'Mehadia', 70],
	['Mehadia', 'Dobreta', 75],
	['Dobreta', 'Craiova', 120],
	['Sibiu', 'Fagaras', 99],
	['Sibiu', 'Rimnicu Vilcea', 80],
	['Rimnicu Vilcea', 'Pitesti', 97],
	['Rimnicu Vilcea', 'Craiova', 146],
	['Craiova', 'Pitesti', 138],
	['Fagaras', 'Bucharest', 211],
	['Pitesti', 'Bucharest', 101],
	['Bucharest', 'Giurgiu', 90],
	['Bucharest', 'Urziceni', 85],
	['Urziceni', 'Hirsova', 98],
	['Hirsova', 'Eforie', 86],
	['Urziceni', 'Vaslui', 142],
	['Vaslui', 'Iasi', 92],
	['Iasi', 'Neamt', 87]
];

/** The road map of Romania (20 cities, 23 roads). */
export const ROMANIA: WeightedGraph = {
	directed: false,
	nodes: Object.entries(ROMANIA_POS).map(([id, [x, y]]) => ({ id, x, y })),
	edges: ROMANIA_ROADS.map(([from, to, cost]) => ({ from, to, cost }))
};

/** Straight-line distance to Bucharest (Informed Search, slide 6). */
export const SLD_BUCHAREST: Readonly<Record<string, number>> = {
	Arad: 366,
	Bucharest: 0,
	Craiova: 160,
	Dobreta: 242,
	Eforie: 161,
	Fagaras: 176,
	Giurgiu: 77,
	Hirsova: 151,
	Iasi: 226,
	Lugoj: 244,
	Mehadia: 241,
	Neamt: 234,
	Oradea: 380,
	Pitesti: 100,
	'Rimnicu Vilcea': 193,
	Sibiu: 253,
	Timisoara: 329,
	Urziceni: 80,
	Vaslui: 199,
	Zerind: 374
};

/**
 * Straight-line distance to Fagaras. The slides give no table for Fagaras;
 * these are distances measured on the slide's map drawing, scaled so that no
 * road is shorter than its drawn length, and rounded down. That scaling makes
 * the table consistent (h(n) ≤ c(n, n') + h(n') on every road), and so also
 * admissible.
 */
export const SLD_FAGARAS: Readonly<Record<string, number>> = sldTable('Fagaras');

function sldTable(goal: string): Record<string, number> {
	const dist = (a: string, b: string) => {
		const [ax, ay] = ROMANIA_POS[a];
		const [bx, by] = ROMANIA_POS[b];
		return Math.hypot(ax - bx, ay - by);
	};
	const scale = Math.min(...ROMANIA_ROADS.map(([a, b, cost]) => cost / dist(a, b)));
	return Object.fromEntries(
		Object.keys(ROMANIA_POS).map((city) => [city, Math.floor(dist(city, goal) * scale)])
	);
}

/** Arad to Bucharest with straight-line distance (Solving Problems by Searching, slide 6). */
export const ROMANIA_PROBLEM: GraphProblemSpec = {
	graph: ROMANIA,
	start: 'Arad',
	goals: ['Bucharest'],
	h: SLD_BUCHAREST,
	hLabel: 'Straight-line distance to Bucharest'
};

/** Iasi to Fagaras, where greedy best-first tree search loops (Informed Search, slide 12). */
export const ROMANIA_IASI_FAGARAS: GraphProblemSpec = {
	graph: ROMANIA,
	start: 'Iasi',
	goals: ['Fagaras'],
	h: SLD_FAGARAS,
	hLabel: 'Straight-line distance to Fagaras (measured on the map)'
};

// ---------------------------------------------------------------------------
// Tiny search problem (Uninformed Search, slides 3 and 41; example from P. Abbeel and D. Klein)
// ---------------------------------------------------------------------------

/** The directed "tiny search problem" graph with the step costs of the UCS example. */
export const TINY_GRAPH: WeightedGraph = {
	directed: true,
	nodes: [
		{ id: 'S', x: 20, y: 220 },
		{ id: 'a', x: 158, y: 48 },
		{ id: 'b', x: 63, y: 97 },
		{ id: 'c', x: 297, y: 91 },
		{ id: 'd', x: 173, y: 175 },
		{ id: 'e', x: 372, y: 153 },
		{ id: 'f', x: 482, y: 183 },
		{ id: 'G', x: 495, y: 45 },
		{ id: 'h', x: 331, y: 227 },
		{ id: 'p', x: 117, y: 278 },
		{ id: 'q', x: 241, y: 295 },
		{ id: 'r', x: 458, y: 279 }
	],
	edges: [
		{ from: 'S', to: 'd', cost: 3 },
		{ from: 'S', to: 'e', cost: 9 },
		{ from: 'S', to: 'p', cost: 1 },
		{ from: 'b', to: 'a', cost: 2 },
		{ from: 'c', to: 'a', cost: 2 },
		{ from: 'd', to: 'b', cost: 1 },
		{ from: 'd', to: 'c', cost: 8 },
		{ from: 'd', to: 'e', cost: 2 },
		{ from: 'e', to: 'h', cost: 8 },
		{ from: 'e', to: 'r', cost: 2 },
		{ from: 'f', to: 'c', cost: 3 },
		{ from: 'f', to: 'G', cost: 2 },
		{ from: 'h', to: 'p', cost: 4 },
		{ from: 'h', to: 'q', cost: 4 },
		{ from: 'p', to: 'q', cost: 15 },
		{ from: 'r', to: 'f', cost: 1 }
	]
};

export const TINY_PROBLEM: GraphProblemSpec = { graph: TINY_GRAPH, start: 'S', goals: ['G'] };

// ---------------------------------------------------------------------------
// A* with an inconsistent heuristic (Informed Search, slides 27–28; Berkeley CS188x)
// ---------------------------------------------------------------------------

export const ASTAR_WRONG_GRAPH: WeightedGraph = {
	directed: true,
	nodes: [
		{ id: 'S', x: 0, y: 70 },
		{ id: 'A', x: 110, y: 20 },
		{ id: 'B', x: 70, y: 150 },
		{ id: 'C', x: 220, y: 80 },
		{ id: 'G', x: 220, y: 210 }
	],
	edges: [
		{ from: 'S', to: 'A', cost: 1 },
		{ from: 'S', to: 'B', cost: 1 },
		{ from: 'A', to: 'C', cost: 1 },
		{ from: 'B', to: 'C', cost: 2 },
		{ from: 'C', to: 'G', cost: 3 }
	]
};

/** Admissible but inconsistent at A → C: A* graph search returns cost 6, tree search 5. */
export const ASTAR_WRONG_PROBLEM: GraphProblemSpec = {
	graph: ASTAR_WRONG_GRAPH,
	start: 'S',
	goals: ['G'],
	h: { S: 2, A: 4, B: 1, C: 1, G: 0 }
};

// ---------------------------------------------------------------------------
// Greedy vs. A* (Informed Search, slide 15)
// ---------------------------------------------------------------------------

/**
 * A short path through a node with h = 2 and a long path whose nodes all have
 * h = 1; every step costs 1. Greedy best-first takes the long path, A* the short one.
 */
export const GREEDY_TRAP_GRAPH: WeightedGraph = {
	directed: true,
	nodes: [
		{ id: 'S', x: 0, y: 100 },
		{ id: 'T1', x: 70, y: 20 },
		{ id: 'T2', x: 210, y: 45 },
		{ id: 'B1', x: 70, y: 100 },
		{ id: 'B2', x: 140, y: 100 },
		{ id: 'B3', x: 210, y: 100 },
		{ id: 'B4', x: 280, y: 100 },
		{ id: 'B5', x: 350, y: 100 },
		{ id: 'G', x: 420, y: 100 }
	],
	edges: [
		{ from: 'S', to: 'T1', cost: 1 },
		{ from: 'T1', to: 'T2', cost: 1 },
		{ from: 'T2', to: 'G', cost: 1 },
		{ from: 'S', to: 'B1', cost: 1 },
		{ from: 'B1', to: 'B2', cost: 1 },
		{ from: 'B2', to: 'B3', cost: 1 },
		{ from: 'B3', to: 'B4', cost: 1 },
		{ from: 'B4', to: 'B5', cost: 1 },
		{ from: 'B5', to: 'G', cost: 1 }
	]
};

export const GREEDY_TRAP_PROBLEM: GraphProblemSpec = {
	graph: GREEDY_TRAP_GRAPH,
	start: 'S',
	goals: ['G'],
	h: { S: 2, T1: 2, T2: 1, B1: 1, B2: 1, B3: 1, B4: 1, B5: 1, G: 0 }
};

// ---------------------------------------------------------------------------
// Binary tree for iterative deepening (Uninformed Search, slides 34–37)
// ---------------------------------------------------------------------------

const TREE_LEVELS = [
	['A'],
	['B', 'C'],
	['D', 'E', 'F', 'G'],
	['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']
];

/** The complete binary tree A–O of depth 3 (every step costs 1). */
export const BINARY_TREE: WeightedGraph = {
	directed: true,
	nodes: TREE_LEVELS.flatMap((level, depth) =>
		level.map((id, i) => ({
			id,
			x: ((i + 0.5) * 8 * 60) / level.length,
			y: depth * 80
		}))
	),
	edges: TREE_LEVELS.slice(1).flatMap((level, d) =>
		level.map((id, i) => ({ from: TREE_LEVELS[d][i >> 1], to: id, cost: 1 }))
	)
};

/** Goal M, found in the limit-3 iteration. */
export const BINARY_TREE_PROBLEM: GraphProblemSpec = {
	graph: BINARY_TREE,
	start: 'A',
	goals: ['M']
};
