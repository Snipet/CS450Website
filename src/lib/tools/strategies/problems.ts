/**
 * The lecture problems the comparison runs on, and the presets that load
 * them. Each problem is also written as graph text (with drawing positions),
 * which is what the search tool links carry and what a link to this tool may
 * bring in its place.
 */
import type { NodeShape } from '$lib/components/search/graph-scene';
import type { Preset } from '$lib/components/ui/types';
import type { Citation } from '$lib/lectures';
import {
	ASTAR_WRONG_PROBLEM,
	BINARY_TREE_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	formatGraphText,
	type GraphProblemSpec,
	type WeightedGraph
} from '$lib/theory/graphs';
import type { RepeatMode } from '$lib/theory/search';

export const PROBLEM_IDS = [
	'tiny',
	'binary-tree',
	'romania',
	'iasi-fagaras',
	'greedy-trap',
	'astar-wrong'
] as const;

export type ProblemId = (typeof PROBLEM_IDS)[number];

export interface LectureProblem {
	id: ProblemId;
	/** Name in the preset menu and the problem panel. */
	label: string;
	spec: GraphProblemSpec;
	cite: Citation;
}

export const PROBLEMS: Record<ProblemId, LectureProblem> = {
	tiny: {
		id: 'tiny',
		label: 'Tiny search problem',
		spec: TINY_PROBLEM,
		cite: { deck: 'uninformed', slide: [39, 41] }
	},
	'binary-tree': {
		id: 'binary-tree',
		label: 'IDS binary tree',
		spec: BINARY_TREE_PROBLEM,
		cite: { deck: 'uninformed', slide: [34, 37] }
	},
	romania: {
		id: 'romania',
		label: 'Romania: Arad to Bucharest',
		spec: ROMANIA_PROBLEM,
		cite: { deck: 'informed', slide: [8, 22] }
	},
	'iasi-fagaras': {
		id: 'iasi-fagaras',
		label: 'Romania: Iasi to Fagaras',
		spec: ROMANIA_IASI_FAGARAS,
		cite: { deck: 'informed', slide: 12 }
	},
	'greedy-trap': {
		id: 'greedy-trap',
		label: 'Greedy vs. A*',
		spec: GREEDY_TRAP_PROBLEM,
		cite: { deck: 'informed', slide: 15 }
	},
	'astar-wrong': {
		id: 'astar-wrong',
		label: 'A* gone wrong',
		spec: ASTAR_WRONG_PROBLEM,
		cite: { deck: 'informed', slide: [27, 29] }
	}
};

export const isProblemId = (v: unknown): v is ProblemId =>
	typeof v === 'string' && (PROBLEM_IDS as readonly string[]).includes(v);

/** A problem as graph text with drawing positions (round-trips through parseGraphText). */
export function problemText(id: ProblemId): string {
	return formatGraphText(PROBLEMS[id].spec, { positions: true });
}

/** The lecture problem whose graph text is exactly `text`, if any. */
export function matchProblemText(text: string): ProblemId | null {
	const trimmed = text.trim();
	return PROBLEM_IDS.find((id) => problemText(id).trim() === trimmed) ?? null;
}

const ROMANIA_CITIES = new Set(ROMANIA.nodes.map((n) => n.id));

/** Squares with outside labels for the Romania road map (as on the slides), circles otherwise. */
export function shapeFor(graph: WeightedGraph): NodeShape {
	const map =
		graph.nodes.length === ROMANIA_CITIES.size &&
		graph.nodes.every((n) => ROMANIA_CITIES.has(n.id));
	return map ? 'square' : 'circle';
}

/** What a preset loads: a lecture problem and a repeated-state mode. */
export interface ProblemPreset {
	problem: ProblemId;
	mode: RepeatMode;
}

const UNINFORMED = 'Uninformed search';
const INFORMED = 'Informed search';

function preset(
	id: ProblemId,
	group: string,
	mode: RepeatMode,
	description: string
): Preset<ProblemPreset> {
	const p = PROBLEMS[id];
	return { id, group, label: p.label, description, cite: p.cite, value: { problem: id, mode } };
}

export const PRESETS: readonly Preset<ProblemPreset>[] = [
	preset(
		'tiny',
		UNINFORMED,
		'tree',
		'Tree search on the directed graph of the tiny search problem. BFS returns S → e → r → f → G, the path with the fewest steps (cost 14); UCS returns S → d → e → r → f → G (cost 10). The problem has no h values, so greedy search takes nodes off the frontier in BFS order and A* in UCS order.'
	),
	preset(
		'binary-tree',
		UNINFORMED,
		'tree',
		'The complete binary tree A–O with goal M; every step costs 1. IDS takes A | A B C | A B D E C F G | A B D H I E J K C F L M off the frontier, and UCS takes the nodes off in the same order as BFS.'
	),
	preset(
		'romania',
		INFORMED,
		'tree',
		'Tree search from Arad to Bucharest with the straight-line distance. DFS goes Arad, Sibiu, Arad, Sibiu, … until the limit stops it. UCS and A* return the route through Rimnicu Vilcea and Pitesti (418); BFS, IDS, greedy, and weighted A* the route through Fagaras (450).'
	),
	preset(
		'iasi-fagaras',
		INFORMED,
		'tree',
		'Iasi to Fagaras with straight-line distances to Fagaras measured on the map. Greedy tree search goes Iasi, Neamt, Iasi, Neamt, … until the limit stops it, and so does DFS. With a path check or graph search both reach Fagaras.'
	),
	preset(
		'greedy-trap',
		INFORMED,
		'tree',
		'A short path through a state with h = 2 and a long path whose states all have h = 1. Greedy best-first search returns the long path (cost 6) and A* the short one (cost 3).'
	),
	preset(
		'astar-wrong',
		INFORMED,
		'graph',
		'h is admissible but not consistent. A* graph search expands C through B before the cheaper path through A reaches it and returns cost 6; switch to tree search and A* returns cost 5.'
	)
];
