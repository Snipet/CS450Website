/**
 * Presets for the heuristics tool: a lecture problem with a heuristic, as
 * graph text with drawing positions (so the text in the URL round-trips).
 */
import type { Preset } from '$lib/components/ui/types';
import {
	ASTAR_WRONG_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	SLD_BUCHAREST,
	TINY_PROBLEM,
	parseGraphText,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import { specText, zeroHeuristic } from './edit';

/** What a preset sets: the problem and its heuristic, as graph text. */
export interface HeuristicsScenario {
	graph: string;
}

const INFORMED = 'Informed search';
const UNINFORMED = 'Uninformed search';

/** 2 × the straight-line distance to Bucharest (the inflated heuristic of weighted A*). */
export const INFLATED_SLD: Readonly<Record<string, number>> = Object.fromEntries(
	Object.entries(SLD_BUCHAREST).map(([city, d]) => [city, 2 * d])
);

const problems: Record<string, GraphProblemSpec> = {
	'romania-sld': ROMANIA_PROBLEM,
	'astar-wrong': { ...ASTAR_WRONG_PROBLEM, hLabel: 'h from the slide' },
	'iasi-fagaras': {
		...ROMANIA_IASI_FAGARAS,
		hLabel: 'Straight-line distance to Fagaras (measured on the map, scaled)'
	},
	'greedy-trap': { ...GREEDY_TRAP_PROBLEM, hLabel: 'h from the slide' },
	'tiny-zero': { ...TINY_PROBLEM, h: zeroHeuristic(TINY_PROBLEM), hLabel: 'h = 0' },
	'romania-inflated': {
		...ROMANIA_PROBLEM,
		h: INFLATED_SLD,
		hLabel: '2 × Straight-line distance to Bucharest'
	}
};

const scenario = (id: string): HeuristicsScenario => ({ graph: specText(problems[id]) });

export const HEURISTIC_PRESETS: readonly Preset<HeuristicsScenario>[] = [
	{
		id: 'romania-sld',
		group: INFORMED,
		label: 'Romania: straight-line distance',
		description:
			'Arad to Bucharest with the straight-line distance to Bucharest as h. A straight line is never longer than the road, so h never overestimates; it is also consistent. A* tree and graph search both return Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (418).',
		cite: { deck: 'informed', slide: 6 },
		value: scenario('romania-sld')
	},
	{
		id: 'astar-wrong',
		group: INFORMED,
		label: 'A* gone wrong',
		description:
			'h is admissible but not consistent at A → C: h(A) = 4 > c(A, C) + h(C) = 2. A* tree search returns S → A → C → G (5); graph search expands C through B first, drops the cheaper path through A, and returns cost 6.',
		cite: { deck: 'informed', slide: [27, 28] },
		value: scenario('astar-wrong')
	},
	{
		id: 'iasi-fagaras',
		group: INFORMED,
		label: 'Iasi to Fagaras: measured distance',
		description:
			'The slides give no straight-line distances to Fagaras. These were measured on the map drawing and scaled so that no road is shorter than its drawn length, then rounded down; that makes the table consistent, and so admissible.',
		cite: { deck: 'informed', slide: 12 },
		value: scenario('iasi-fagaras')
	},
	{
		id: 'greedy-trap',
		group: INFORMED,
		label: 'Greedy vs. A*',
		description:
			'Every step costs 1; h = 1 along the long path and h = 2 at the first state of the short one. h is admissible and consistent, and A* returns the short path (cost 3).',
		cite: { deck: 'informed', slide: 15 },
		value: scenario('greedy-trap')
	},
	{
		id: 'romania-inflated',
		group: INFORMED,
		label: 'Romania: 2 × straight-line distance',
		description:
			'The straight-line distance inflated by α = 2, as weighted A* does. It overestimates the road distance at 18 of the 20 cities, so it is not admissible, and A* with it returns Arad → Sibiu → Fagaras → Bucharest (450 instead of 418).',
		cite: { deck: 'informed', slide: 38 },
		value: scenario('romania-inflated')
	},
	{
		id: 'tiny-zero',
		group: UNINFORMED,
		label: 'Tiny search problem, h = 0',
		description:
			'h = 0 for every state, so A* orders the frontier by g(n) alone, like uniform-cost search: S, p, d, b, e, a, r, f, e, G, and the path S → d → e → r → f → G (cost 10). h = 0 is admissible and consistent.',
		cite: { deck: 'uninformed', slide: 41 },
		value: scenario('tiny-zero')
	}
];

export function presetById(id: string | null | undefined): Preset<HeuristicsScenario> | undefined {
	return id ? HEURISTIC_PRESETS.find((p) => p.id === id) : undefined;
}

/** The preset whose graph text equals `text` exactly, if any. */
export function matchPreset(text: string): Preset<HeuristicsScenario> | undefined {
	return HEURISTIC_PRESETS.find((p) => p.value.graph === text);
}

/** Graph, start and goals of a spec, without the heuristic. */
function structure(spec: GraphProblemSpec): string {
	return JSON.stringify([
		spec.graph.directed,
		spec.graph.nodes,
		spec.graph.edges,
		spec.start,
		spec.goals
	]);
}

const presetStructures = HEURISTIC_PRESETS.map((p) => ({
	preset: p,
	spec: parseGraphText(p.value.graph).spec!
}));

/**
 * The preset a problem comes from: the one with the same text, else the
 * first with the same graph, start and goals (whatever the h values), else
 * undefined.
 */
export function presetForSpec(
	text: string,
	spec: GraphProblemSpec
): Preset<HeuristicsScenario> | undefined {
	const exact = matchPreset(text);
	if (exact) return exact;
	const key = structure(spec);
	return presetStructures.find((p) => structure(p.spec) === key)?.preset;
}

/** States (names) and edges of a spec: the graph without positions, start, goals, or h. */
function graphKey(spec: GraphProblemSpec): string {
	return JSON.stringify([spec.graph.directed, spec.graph.nodes.map((n) => n.id), spec.graph.edges]);
}

/**
 * The preset a problem comes from, for the preset note, "Reset to preset", and
 * "the preset's heuristic": the saved preset while the graph (states and
 * edges) is still its graph, whatever the start, goals, and h; otherwise the
 * preset `presetForSpec` finds.
 */
export function basePresetFor(
	id: string | null,
	text: string,
	spec: GraphProblemSpec
): Preset<HeuristicsScenario> | undefined {
	const saved = presetById(id);
	if (saved) {
		const own = presetStructures.find((p) => p.preset === saved)!.spec;
		if (graphKey(own) === graphKey(spec)) return saved;
	}
	return presetForSpec(text, spec);
}

/** The heuristic and label of a preset. */
export function presetHeuristic(p: Preset<HeuristicsScenario>): {
	h: Readonly<Record<string, number>>;
	label: string | undefined;
} {
	const spec = presetStructures.find((s) => s.preset === p)!.spec;
	return { h: spec.h ?? {}, label: spec.hLabel };
}
