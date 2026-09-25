/**
 * Data for the notation page (docs/ARCHITECTURE.md §3): sections and their
 * slides, the reference tables, and examples computed with the same engine
 * and wording helpers the tools use, so the page cannot drift from them.
 */
import { decks, deckOrder, formatCitation, type Citation, type DeckId } from '$lib/lectures';
import {
	annotationText,
	describeResult,
	describeStep,
	queueName,
	strategyName,
	strategyShort
} from '$lib/components/search/describe';
import {
	BINARY_TREE_PROBLEM,
	ROMANIA_PROBLEM,
	TINY_GRAPH,
	TINY_PROBLEM,
	ASTAR_WRONG_PROBLEM,
	formatGraphText,
	graphProblem,
	highlightGraphText,
	parseGraphText,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import {
	DEFAULT_WEIGHT,
	search,
	type ChildOutcome,
	type SearchNode,
	type SearchOptions,
	type SearchResult,
	type SearchStep,
	type StrategyId
} from '$lib/theory/search';
import type { Diagnostic } from '$lib/theory/diagnostics';
import {
	GRID_HEURISTICS,
	gridMoves,
	heuristicDistance,
	isAdmissible,
	type GridHeuristic
} from '$lib/theory/grid';
import {
	SLIDE_GOAL,
	SLIDE_START,
	misplacedTiles,
	manhattanDistance,
	tileDistances
} from '$lib/theory/puzzle';

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export type SectionId =
	| 'agents'
	| 'problems'
	| 'symbols'
	| 'strategies'
	| 'diagrams'
	| 'steps'
	| 'defaults'
	| 'graph-text'
	| 'puzzle'
	| 'grid'
	| 'citations';

export interface Section {
	id: SectionId;
	title: string;
	/** Slides the section follows. */
	cites: readonly Citation[];
	/** Slugs of tools that use this notation (shown only when registered). */
	tools: readonly string[];
}

/** Sections in page order (lecture order: agents, then search). */
export const SECTIONS: readonly Section[] = [
	{
		id: 'agents',
		title: 'Rational agents',
		cites: [
			{ deck: 'agents', slide: [2, 6] },
			{ deck: 'agents', slide: [9, 17] }
		],
		tools: ['vacuum', 'environments']
	},
	{
		id: 'problems',
		title: 'Search problems',
		cites: [
			{ deck: 'search', slide: [5, 14] },
			{ deck: 'search', slide: [27, 43] }
		],
		tools: ['state-spaces', 'search']
	},
	{
		id: 'symbols',
		title: 'Symbols',
		cites: [
			{ deck: 'uninformed', slide: 30 },
			{ deck: 'uninformed', slide: 45 },
			{ deck: 'informed', slide: 5 },
			{ deck: 'informed', slide: 16 },
			{ deck: 'informed', slide: 25 }
		],
		tools: ['strategies', 'heuristics']
	},
	{
		id: 'strategies',
		title: 'Search strategies',
		cites: [
			{ deck: 'uninformed', slide: 45 },
			{ deck: 'informed', slide: 42 }
		],
		tools: ['strategies', 'search']
	},
	{
		id: 'diagrams',
		title: 'Diagram legend',
		cites: [
			{ deck: 'search', slide: 27 },
			{ deck: 'search', slide: 41 },
			{ deck: 'informed', slide: 22 }
		],
		tools: ['search', 'state-spaces']
	},
	{
		id: 'steps',
		title: 'Step descriptions',
		cites: [
			{ deck: 'search', slide: 28 },
			{ deck: 'search', slide: 36 }
		],
		tools: ['search']
	},
	{
		id: 'defaults',
		title: 'Conventions beyond the slides',
		cites: [],
		tools: ['search', 'strategies']
	},
	{
		id: 'graph-text',
		title: 'Graph text format',
		cites: [],
		tools: ['search', 'heuristics', 'strategies']
	},
	{
		id: 'puzzle',
		title: '8-puzzle',
		cites: [
			{ deck: 'search', slide: 10 },
			{ deck: 'informed', slide: [32, 37] }
		],
		tools: ['eight-puzzle']
	},
	{
		id: 'grid',
		title: 'Grid path finding',
		cites: [
			{ deck: 'informed', slide: [23, 24] },
			{ deck: 'informed', slide: [38, 40] }
		],
		tools: ['grid']
	},
	{
		id: 'citations',
		title: 'Slide citations',
		cites: [],
		tools: []
	}
];

// ---------------------------------------------------------------------------
// Search problems
// ---------------------------------------------------------------------------

export interface Term {
	term: string;
	meaning: string;
	cite: Citation;
}

export interface Component {
	name: string;
	meaning: string;
	/** The Romania example of slide 6. */
	romania: string;
}

/** Search problem components (Solving Problems by Searching, slides 5–6). */
export const COMPONENTS: readonly Component[] = [
	{ name: 'Initial state', meaning: 'The state the agent starts in', romania: 'Arad' },
	{ name: 'Actions', meaning: 'What the agent can do', romania: 'Go from one city to another' },
	{
		name: 'Transition model',
		meaning:
			'The state that results from performing a given action in a given state, called its successor',
		romania: 'If you go from city A to city B, you end up in city B'
	},
	{ name: 'Goal state', meaning: 'The state to reach', romania: 'Bucharest' },
	{
		name: 'Path cost',
		meaning: 'Assumed to be a sum of nonnegative step costs',
		romania: 'Sum of edge costs (total distance traveled)'
	}
];

/** Search-problem vocabulary (docs/ARCHITECTURE.md §3.1), in the words of the slides. */
export const TERMS: readonly Term[] = [
	{
		term: 'State space',
		meaning:
			'The set of all states reachable from the initial state by any sequence of actions: a directed graph whose nodes are states and whose links are actions.',
		cite: { deck: 'search', slide: 7 }
	},
	{
		term: 'Successor function',
		meaning:
			'Given a state, applies all applicable actions and lists the resulting (successor) states. It captures the transition model without a full representation of the state space.',
		cite: { deck: 'search', slide: 14 }
	},
	{
		term: 'Frontier',
		meaning:
			'The list of unexpanded nodes; the strategy picks the next one to take off. Always called the frontier here.',
		cite: { deck: 'search', slide: 13 }
	},
	{
		term: 'Expand',
		meaning: 'Generate the children of a node by applying the successor function to its state.',
		cite: { deck: 'search', slide: 13 }
	},
	{
		term: 'Search tree',
		meaning:
			'A “what if” tree of action sequences. The root node corresponds to the starting state, a node’s children come from the successor function, and a path is a sequence of actions. A solution is a path ending in the goal state.',
		cite: { deck: 'search', slide: 27 }
	},
	{
		term: 'Node vs. state',
		meaning:
			'A state is a representation of the world; a node is a data structure in the search tree that keeps a pointer to its parent and its path cost. One state can appear in many nodes.',
		cite: { deck: 'search', slide: 27 }
	},
	{
		term: 'Tree search',
		meaning:
			'The algorithm outline below, with no repeated-state handling: the same state can be expanded again.',
		cite: { deck: 'search', slide: 28 }
	},
	{
		term: 'Explored set',
		meaning:
			'The states already expanded. Graph search adds a node’s state when it expands the node and does not put explored states on the frontier again.',
		cite: { deck: 'search', slide: 36 }
	},
	{
		term: 'Graph search',
		meaning:
			'Tree search plus the explored set and the frontier check of “Handling repeated states”. The slides show it as “Search without repeated states”.',
		cite: { deck: 'search', slide: [36, 43] }
	},
	{
		term: 'Step cost, path cost',
		meaning:
			'Each action has a nonnegative step cost; the path cost g(n) of a node is the sum of the step costs from the initial state.',
		cite: { deck: 'search', slide: 5 }
	},
	{
		term: 'Optimal solution',
		meaning: 'The sequence of actions that reaches the goal with the lowest path cost.',
		cite: { deck: 'search', slide: 5 }
	},
	{
		term: 'Search strategy',
		meaning:
			'Defined by the order of node expansion. Uninformed strategies use only the problem definition; informed strategies also use a heuristic function h(n).',
		cite: { deck: 'uninformed', slide: 2 }
	}
];

/** Tree Search Algorithm Outline (Solving Problems by Searching, slide 28), verbatim. */
export const TREE_SEARCH_OUTLINE: readonly { text: string; indent: number }[] = [
	{ text: 'Initialize the frontier using the starting state', indent: 0 },
	{ text: 'While the frontier is not empty', indent: 0 },
	{
		text: 'Choose a frontier node according to search strategy and take it off the frontier',
		indent: 1
	},
	{ text: 'If the node contains the goal state, return solution', indent: 1 },
	{
		text: 'Else expand the node by applying the successor function and add its children to the frontier',
		indent: 1
	}
];

/** "To handle repeated states" (slide 36), verbatim. */
export const REPEATED_STATE_RULES: readonly string[] = [
	'Every time you expand a node, add that state to the explored set; do not put explored states on the frontier again',
	'Every time you add a node to the frontier, check whether it already exists in the frontier with a higher path cost, and if yes, replace that node with the new one'
];

/** Size of the Romania state space (slide 7 asks for it). */
export const ROMANIA_SIZE = {
	states: ROMANIA_PROBLEM.graph.nodes.length,
	roads: ROMANIA_PROBLEM.graph.edges.length
};

// ---------------------------------------------------------------------------
// Symbols
// ---------------------------------------------------------------------------

export interface MathPart {
	text: string;
	/** Draw as a subscript (the 1 of h1). */
	sub?: boolean;
}

/** Splits "h1(n) ≤ h2(n)" into parts so the page can write h₁ and h₂ as subscripts (also hm). */
export function mathParts(text: string): MathPart[] {
	const out: MathPart[] = [];
	let last = 0;
	for (const m of text.matchAll(/\bh(\d|m)(?=\()/g)) {
		const at = m.index + 1;
		if (at > last) out.push({ text: text.slice(last, at) });
		out.push({ text: m[1], sub: true });
		last = at + 1;
	}
	if (last < text.length) out.push({ text: text.slice(last) });
	return out;
}

export interface SymbolRow {
	/** Plain text; the page renders sub- and superscripts. */
	symbol: string;
	meaning: string;
	cite: Citation | null;
}

export const SYMBOLS: readonly SymbolRow[] = [
	{
		symbol: 'b',
		meaning: 'Maximum branching factor of the search tree',
		cite: { deck: 'uninformed', slide: 30 }
	},
	{
		symbol: 'd',
		meaning: 'Depth of the optimal solution',
		cite: { deck: 'uninformed', slide: 30 }
	},
	{
		symbol: 'm',
		meaning: 'Maximum length of any path in the state space (may be infinite)',
		cite: { deck: 'uninformed', slide: 30 }
	},
	{
		symbol: 'C*',
		meaning: 'Cost of the optimal solution',
		cite: { deck: 'uninformed', slide: 45 }
	},
	{
		symbol: 'ε',
		meaning: 'A positive constant that every step cost is greater than (UCS is complete then)',
		cite: { deck: 'uninformed', slide: 44 }
	},
	{
		symbol: 'n',
		meaning: 'A node of the search tree',
		cite: { deck: 'informed', slide: 5 }
	},
	{
		symbol: 'g(n)',
		meaning: 'Cost of the path from the start state to node n: the path cost, or cost so far',
		cite: { deck: 'informed', slide: 16 }
	},
	{
		symbol: 'h(n)',
		meaning: 'Heuristic function: estimated cost of reaching the goal from node n',
		cite: { deck: 'informed', slide: 5 }
	},
	{
		symbol: 'h*(n)',
		meaning: 'True cost to reach the goal state from n',
		cite: { deck: 'informed', slide: 25 }
	},
	{
		symbol: 'f(n) = g(n) + h(n)',
		meaning: 'A* evaluation function: estimated total cost of the path through n to the goal',
		cite: { deck: 'informed', slide: 16 }
	},
	{
		symbol: 'α',
		meaning: `Weighted A* inflation factor, α > 1: the frontier is ordered by g(n) + α·h(n), and the solution costs at most α·C* (default α = ${DEFAULT_WEIGHT})`,
		cite: { deck: 'informed', slide: 38 }
	},
	{
		symbol: 'h1(n), h2(n)',
		meaning: '8-puzzle heuristics: number of misplaced tiles, total Manhattan distance',
		cite: { deck: 'informed', slide: 32 }
	},
	{
		symbol: 'c(n, n′)',
		meaning: 'Step cost of the action from n to its successor n′ (the slides write cost(A to C))',
		cite: { deck: 'informed', slide: 28 }
	}
];

export interface Formula {
	name: string;
	/** Plain text; the page renders sub- and superscripts. */
	formula: string;
	meaning: string;
	cite: Citation;
}

/** Properties of heuristics, as the heuristics tool checks them. */
export const HEURISTIC_PROPERTIES: readonly Formula[] = [
	{
		name: 'Admissible',
		formula: 'h(n) ≤ h*(n) for every node n',
		meaning: 'Never overestimates the cost to reach the goal. With it, A* tree search is optimal.',
		cite: { deck: 'informed', slide: 25 }
	},
	{
		name: 'Consistent',
		formula: 'h(n) ≤ c(n, n′) + h(n′) for every action from n to n′',
		meaning:
			'Slide form: cost(A to C) + h(C) ≥ h(A). Implies admissibility; with it, A* graph search is optimal.',
		cite: { deck: 'informed', slide: 28 }
	},
	{
		name: 'Dominance',
		formula: 'h2(n) ≥ h1(n) for all n',
		meaning: 'With both admissible, h2 dominates h1, and A* with h1 expands more nodes.',
		cite: { deck: 'informed', slide: 35 }
	},
	{
		name: 'Combining',
		formula: 'h(n) = max{h1(n), h2(n), …, hm(n)}',
		meaning: 'The maximum of admissible heuristics is admissible.',
		cite: { deck: 'informed', slide: 37 }
	}
];

export interface ComplexityRow {
	/** As written in the tools, with Unicode superscripts where they exist. */
	written: string;
	/** Base and exponent inside O( ), for rendering a superscript. */
	base: string;
	exponent: string | null;
	meaning: string;
	cite: readonly Citation[];
}

/** Complexity classes of the strategy tables (Uninformed Search slide 45, Informed Search slide 42). */
export const COMPLEXITIES: readonly ComplexityRow[] = [
	{
		written: 'O(bᵈ)',
		base: 'b',
		exponent: 'd',
		meaning: 'Nodes in a b-ary tree of depth d: time and space of BFS, time of IDS',
		cite: [
			{ deck: 'uninformed', slide: 31 },
			{ deck: 'uninformed', slide: 38 }
		]
	},
	{
		written: 'O(bᵐ)',
		base: 'b',
		exponent: 'm',
		meaning: 'Time of DFS; worst-case time and space of greedy best-first search',
		cite: [
			{ deck: 'uninformed', slide: 32 },
			{ deck: 'informed', slide: 14 }
		]
	},
	{
		written: 'O(bd)',
		base: 'bd',
		exponent: null,
		meaning: 'b times d, linear: space of IDS; best-case time and space of greedy',
		cite: [
			{ deck: 'uninformed', slide: 38 },
			{ deck: 'informed', slide: 42 }
		]
	},
	{
		written: 'O(bm)',
		base: 'bm',
		exponent: null,
		meaning: 'b times m, linear: space of DFS',
		cite: [{ deck: 'uninformed', slide: 32 }]
	},
	{
		written: 'O(b^(C*/ε))',
		base: 'b',
		exponent: 'C*/ε',
		meaning:
			'Time and space of UCS: nodes with path cost ≤ C*. Can exceed O(bᵈ) when there are many small steps.',
		cite: [{ deck: 'uninformed', slide: 44 }]
	}
];

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

export const STRATEGY_ORDER: readonly StrategyId[] = [
	'bfs',
	'dfs',
	'dls',
	'ids',
	'ucs',
	'greedy',
	'astar',
	'wastar'
];

/** What each strategy expands, in the slides' words where they give it. */
const EXPANDS: Record<StrategyId, { text: string; cite: Citation | null }> = {
	bfs: { text: 'Expand shallowest unexpanded node', cite: { deck: 'uninformed', slide: 3 } },
	dfs: { text: 'Expand deepest unexpanded node', cite: { deck: 'uninformed', slide: 5 } },
	dls: {
		text: 'DFS that does not expand nodes at the depth limit',
		cite: { deck: 'uninformed', slide: 33 }
	},
	ids: {
		text: 'DLS with depth limits 0, 1, 2, … until a solution is found',
		cite: { deck: 'uninformed', slide: 33 }
	},
	ucs: {
		text: 'Expand the frontier node with the lowest path cost',
		cite: { deck: 'uninformed', slide: 40 }
	},
	greedy: {
		text: 'Expand the node that has the lowest value of the heuristic function h(n)',
		cite: { deck: 'informed', slide: 7 }
	},
	astar: {
		text: 'Expand the node with the lowest f(n) = g(n) + h(n)',
		cite: { deck: 'informed', slide: 16 }
	},
	wastar: {
		text: 'A* with an admissible heuristic inflated by α > 1',
		cite: { deck: 'informed', slide: 38 }
	}
};

/** A* on Romania, the run the annotation examples come from (Informed Search, slides 17–22). */
const ASTAR_ROMANIA = search(graphProblem(ROMANIA_PROBLEM), { strategy: 'astar' });

/** The Sibiu node under Arad (g = 140, h = 253). */
export const SIBIU: SearchNode = ASTAR_ROMANIA.nodes.find(
	(n) => n.label === 'Sibiu' && n.depth === 1
)!;

export interface StrategyRow {
	id: StrategyId;
	name: string;
	short: string;
	frontier: string;
	expands: string;
	cite: Citation | null;
	/** What the search tree shows under the Sibiu node of the Romania example ("" for nothing). */
	annotation: string;
}

/** The note the slides draw under tree nodes for each strategy, from the Sibiu node. */
function annotationFor(s: StrategyId): string {
	switch (s) {
		case 'ucs':
			return annotationText(SIBIU, 'g', s);
		case 'greedy':
			return annotationText(SIBIU, 'h', s);
		case 'astar':
		case 'wastar':
			return annotationText(SIBIU, 'fgh', s, DEFAULT_WEIGHT);
		default:
			return '';
	}
}

export const STRATEGY_ROWS: readonly StrategyRow[] = STRATEGY_ORDER.map((id) => ({
	id,
	name: strategyName(id),
	short: strategyShort(id),
	frontier: queueName(id),
	expands: EXPANDS[id].text,
	cite: EXPANDS[id].cite,
	annotation: annotationFor(id)
}));

// ---------------------------------------------------------------------------
// Runs on the lecture graphs
// ---------------------------------------------------------------------------

export type ProblemId = 'romania' | 'tiny' | 'binary' | 'tiny-from-h';

export const PROBLEMS: Record<ProblemId, { name: string; spec: GraphProblemSpec }> = {
	romania: { name: 'Romania', spec: ROMANIA_PROBLEM },
	tiny: { name: 'the tiny search problem', spec: TINY_PROBLEM },
	binary: { name: 'the binary tree', spec: BINARY_TREE_PROBLEM },
	'tiny-from-h': {
		name: 'the tiny search problem, starting from h',
		spec: { graph: TINY_GRAPH, start: 'h', goals: ['G'] }
	}
};

export interface Run {
	problem: ProblemId;
	options: SearchOptions;
}

const runCache = new Map<string, SearchResult>();

/** The search result of a run (memoized). */
export function runSearch(run: Run): SearchResult {
	const key = `${run.problem}:${JSON.stringify(run.options)}`;
	let result = runCache.get(key);
	if (!result) {
		result = search(graphProblem(PROBLEMS[run.problem].spec), run.options);
		runCache.set(key, result);
	}
	return result;
}

const MODE_WORDS = { tree: 'tree search', graph: 'graph search', path: 'with the path check' };

/** "A* tree search on Romania", "DFS with the path check on Romania", "IDS on the binary tree". */
export function runTitle(run: Run): string {
	const o = run.options;
	const mode = o.mode ?? 'tree';
	const parts = [strategyShort(o.strategy)];
	if (o.strategy === 'dls') parts.push(`(limit ${o.depthLimit ?? 3})`);
	if (o.strategy !== 'ids' && o.strategy !== 'dls') parts.push(MODE_WORDS[mode]);
	else if (mode !== 'tree') parts.push(MODE_WORDS[mode]);
	if (o.goalTest === 'generate') parts.push('(goal test at generation)');
	return `${parts.join(' ')} on ${PROBLEMS[run.problem].name}`;
}

/** Whether a run can be reproduced from a search-tool link (graph, strategy, mode only). */
export function linkable(run: Run): boolean {
	const o = run.options;
	return o.goalTest === undefined && o.depthLimit === undefined && o.weight === undefined;
}

// ---------------------------------------------------------------------------
// Step sentences
// ---------------------------------------------------------------------------

type StepPick = (step: SearchStep, result: SearchResult, index: number) => boolean;

export interface StepExampleDef {
	id: string;
	group: string;
	/** What the sentence reports. */
	what: string;
	run: Run;
	pick: StepPick;
}

const hasChild =
	(outcome: ChildOutcome): StepPick =>
	(step, result) =>
		step.kind === 'expand' && step.children.some((id) => result.nodes[id].outcome === outcome);

const ASTAR_TREE: Run = { problem: 'romania', options: { strategy: 'astar' } };
const UCS_GRAPH: Run = { problem: 'romania', options: { strategy: 'ucs', mode: 'graph' } };
const IDS_TREE: Run = { problem: 'binary', options: { strategy: 'ids' } };

export const STEP_EXAMPLE_DEFS: readonly StepExampleDef[] = [
	{
		id: 'init',
		group: 'Start',
		what: 'The frontier starts with the root',
		run: ASTAR_TREE,
		pick: (s) => s.kind === 'init'
	},
	{
		id: 'ids-init',
		group: 'Start',
		what: 'An IDS iteration starts',
		run: IDS_TREE,
		pick: (s) => s.kind === 'init' && s.iteration === 1
	},
	{
		id: 'expand',
		group: 'Expansions',
		what: 'A node is expanded (no priority)',
		run: { problem: 'tiny', options: { strategy: 'bfs' } },
		pick: (s) => s.kind === 'expand'
	},
	{
		id: 'expand-f',
		group: 'Expansions',
		what: 'A node is expanded, with its priority',
		run: ASTAR_TREE,
		pick: (s, r) => s.kind === 'expand' && r.nodes[s.node!].label === 'Sibiu'
	},
	{
		id: 'leaf',
		group: 'Expansions',
		what: 'A node has no successors',
		run: { problem: 'tiny', options: { strategy: 'dfs' } },
		pick: (s) => s.kind === 'expand' && s.children.length === 0
	},
	{
		id: 'explored',
		group: 'Children not added',
		what: 'Its state is in the explored set (graph search)',
		run: UCS_GRAPH,
		pick: hasChild('explored')
	},
	{
		id: 'frontier',
		group: 'Children not added',
		what: 'Its state is on the frontier at a lower path cost (graph search)',
		run: UCS_GRAPH,
		pick: hasChild('frontier')
	},
	{
		id: 'replaced',
		group: 'Children not added',
		what: 'A cheaper path replaces the frontier node (graph search)',
		run: UCS_GRAPH,
		pick: hasChild('replaced')
	},
	{
		id: 'on-path',
		group: 'Children not added',
		what: 'Its state is already on the path (path check)',
		run: { problem: 'romania', options: { strategy: 'dfs', mode: 'path' } },
		pick: hasChild('on-path')
	},
	{
		id: 'cutoff',
		group: 'Depth limits',
		what: 'A node at the depth limit is cut off',
		run: IDS_TREE,
		pick: (s) => s.kind === 'cutoff' && s.iteration === 1
	},
	{
		id: 'ids-next',
		group: 'Depth limits',
		what: 'IDS moves on to the next limit',
		run: IDS_TREE,
		pick: (s) => s.kind === 'fail' && s.iteration === 1
	},
	{
		id: 'dls-fail',
		group: 'Depth limits',
		what: 'DLS finds no solution within its limit',
		run: { problem: 'binary', options: { strategy: 'dls', depthLimit: 1 } },
		pick: (s) => s.kind === 'fail'
	},
	{
		id: 'goal',
		group: 'End',
		what: 'The goal node is taken off the frontier',
		run: ASTAR_TREE,
		pick: (s) => s.kind === 'goal'
	},
	{
		id: 'goal-generate',
		group: 'End',
		what: 'The goal test passes at generation (option)',
		run: { problem: 'tiny', options: { strategy: 'bfs', mode: 'graph', goalTest: 'generate' } },
		pick: (s) => s.kind === 'goal'
	},
	{
		id: 'exhausted',
		group: 'End',
		what: 'The frontier runs out',
		run: { problem: 'tiny-from-h', options: { strategy: 'bfs', mode: 'graph' } },
		pick: (s) => s.kind === 'fail'
	}
];

export interface StepExample {
	id: string;
	group: string;
	what: string;
	run: Run;
	title: string;
	/** Index of the step in the run's trace (-1 if no step matched). */
	step: number;
	sentence: string;
}

/** Sentences produced by `describeStep` for each example (first matching step). */
export function stepExamples(defs: readonly StepExampleDef[] = STEP_EXAMPLE_DEFS): StepExample[] {
	return defs.map((d) => {
		const result = runSearch(d.run);
		const step = result.steps.findIndex((s, i) => d.pick(s, result, i));
		return {
			id: d.id,
			group: d.group,
			what: d.what,
			run: d.run,
			title: runTitle(d.run),
			step,
			sentence: step >= 0 ? describeStep(result, step) : ''
		};
	});
}

/** The summary line of a finished search (`describeResult`), for A* on Romania. */
export const RESULT_EXAMPLE = { run: ASTAR_TREE, text: describeResult(ASTAR_ROMANIA) };

// ---------------------------------------------------------------------------
// Diagram snapshots
// ---------------------------------------------------------------------------

export interface Snapshot {
	id: string;
	label: string;
	run: Run;
	pick: StepPick;
}

/** Search states drawn live in the diagram section. */
export const SNAPSHOTS: readonly Snapshot[] = [
	{
		id: 'astar',
		label: 'A* tree search',
		run: ASTAR_TREE,
		pick: (s) => s.kind === 'goal'
	},
	{
		id: 'ucs-graph',
		label: 'UCS graph search',
		run: UCS_GRAPH,
		pick: hasChild('replaced')
	},
	{
		id: 'ids',
		label: 'IDS',
		run: IDS_TREE,
		pick: (s, r) => s.kind === 'cutoff' && s.iteration === 2 && r.nodes[s.node!].label === 'F'
	}
];

/** Index of a snapshot's step (-1 if none matches). */
export function snapshotStep(snapshot: Snapshot): number {
	const result = runSearch(snapshot.run);
	return result.steps.findIndex((s, i) => snapshot.pick(s, result, i));
}

// ---------------------------------------------------------------------------
// Defaults (§3.4): the slide traces the conventions reproduce
// ---------------------------------------------------------------------------

export interface TraceDef {
	id: string;
	label: string;
	run: Run;
	/** The trace as printed on the slide. */
	slide: string;
	/** What the engine must produce for it to match the slide. */
	expected: string;
	/** How the produced trace is read off the result. */
	read: (result: SearchResult) => string;
	note?: string;
	cite: Citation;
}

const joinOrder = (sep: string) => (r: SearchResult) => r.order.join(sep);

export const TRACE_DEFS: readonly TraceDef[] = [
	{
		id: 'bfs',
		label: 'BFS expansion order',
		run: { problem: 'tiny', options: { strategy: 'bfs' } },
		slide: '(S,d,e,p,b,c,e,h,r,q,a,a, h,r,p,q,f,p,q,f,q,c,G)',
		expected: 'S,d,e,p,b,c,e,h,r,q,a,a,h,r,p,q,f,p,q,f,q,c,G',
		read: joinOrder(','),
		cite: { deck: 'uninformed', slide: 4 }
	},
	{
		id: 'dfs',
		label: 'DFS expansion order',
		run: { problem: 'tiny', options: { strategy: 'dfs' } },
		slide: '(d,b,a,c,a,e,h,p,q,q, r,f,c,a,G)',
		expected: 'S,d,b,a,c,a,e,h,p,q,q,r,f,c,a,G',
		read: joinOrder(','),
		note: 'The slide leaves out the root S.',
		cite: { deck: 'uninformed', slide: 6 }
	},
	{
		id: 'ucs',
		label: 'UCS expansion order',
		run: { problem: 'tiny', options: { strategy: 'ucs' } },
		slide: '(S,p,d,b,e,a,r,f,e,G)',
		expected: 'S,p,d,b,e,a,r,f,e,G',
		read: joinOrder(','),
		cite: { deck: 'uninformed', slide: 41 }
	},
	{
		id: 'ids',
		label: 'IDS, one iteration per limit',
		run: IDS_TREE,
		slide: 'A | ABC | ABDECFG | ABDHIEJKCFLM',
		expected: 'A | ABC | ABDECFG | ABDHIEJKCFLM',
		read: (r) => r.iterations.map((it) => it.order.join('')).join(' | '),
		cite: { deck: 'uninformed', slide: [34, 37] }
	},
	{
		id: 'romania',
		label: 'Children of Arad',
		run: ASTAR_TREE,
		slide: 'Sibiu, Timisoara, Zerind',
		expected: 'Sibiu, Timisoara, Zerind',
		read: (r) => r.steps[1].children.map((id) => r.nodes[id].label).join(', '),
		cite: { deck: 'search', slide: 30 }
	}
];

export interface TraceCheck {
	id: string;
	label: string;
	title: string;
	produced: string;
	slide: string;
	matches: boolean;
	note?: string;
	cite: Citation;
}

export function traceChecks(defs: readonly TraceDef[] = TRACE_DEFS): TraceCheck[] {
	return defs.map((d) => {
		const produced = d.read(runSearch(d.run));
		return {
			id: d.id,
			label: d.label,
			title: runTitle(d.run),
			produced,
			slide: d.slide,
			matches: produced === d.expected,
			note: d.note,
			cite: d.cite
		};
	});
}

// ---------------------------------------------------------------------------
// Graph text format
// ---------------------------------------------------------------------------

export interface SyntaxRow {
	syntax: string;
	meaning: string;
}

/** The graph text format as `parseGraphText` reads it (docs/ARCHITECTURE.md §4.2.1). */
export const GRAPH_SYNTAX: readonly SyntaxRow[] = [
	{
		syntax: 'undirected',
		meaning:
			'The graph is undirected. Without a direction line it is undirected unless some edge uses `->`.'
	},
	{ syntax: 'directed', meaning: 'The graph is directed.' },
	{ syntax: 'start: Arad', meaning: 'The start state (exactly one).' },
	{
		syntax: 'goal: Bucharest',
		meaning: 'Goal states; several as `goal: G1, G2` (`goals:` works too).'
	},
	{
		syntax: 'Arad - Sibiu 140',
		meaning:
			'An edge both ways with its step cost (default 1); `--` works too. In a directed graph it adds both directions.'
	},
	{
		syntax: 'S -> d 3',
		meaning:
			'A directed edge (`→` works too). The graph becomes directed; an error if it is declared `undirected`.'
	},
	{ syntax: 'Arad Sibiu 140', meaning: 'No arrow: an edge in the graph’s direction.' },
	{ syntax: 'Arad - Sibiu: 140', meaning: 'The cost may follow a colon.' },
	{
		syntax: 'h: Arad=366, Sibiu=253',
		meaning: 'Heuristic values; several `h:` lines are allowed. States without a value have h = 0.'
	},
	{ syntax: 'at: Arad 26 233', meaning: 'A drawing position (optional; y grows downward).' },
	{
		syntax: 'node: Lonely',
		meaning:
			'States with no edges (a list; `nodes:` works too). Also fixes the order of the states.'
	},
	{ syntax: '# comment', meaning: 'Everything after `#` on a line is ignored.' },
	{
		syntax: '# h: Straight-line distance',
		meaning: 'On the first line: the name of the heuristic.'
	},
	{
		syntax: '"Rimnicu Vilcea"',
		meaning:
			'Names are words of letters, digits, `_`, `\'`, and `.`; any other name, such as one with a space, needs double quotes (escapes `\\"` and `\\\\`).'
	}
];

export interface CodePart {
	text: string;
	/** Set in monospace: text written between backticks. */
	code: boolean;
}

/** Splits "uses `->` here" into plain and code parts. */
export function codeParts(text: string): CodePart[] {
	return text
		.split('`')
		.map((part, i) => ({ text: part, code: i % 2 === 1 }))
		.filter((p) => p.text !== '');
}

export interface TextSegment {
	text: string;
	/** An hl-* class from highlightGraphText, or null for plain text. */
	className: string | null;
}

/** Graph text cut into highlighted and plain segments, colored as in the tools' editor. */
export function highlightSegments(text: string): TextSegment[] {
	const out: TextSegment[] = [];
	let at = 0;
	for (const t of highlightGraphText(text)) {
		if (t.from > at) out.push({ text: text.slice(at, t.from), className: null });
		out.push({ text: text.slice(t.from, t.to), className: t.className });
		at = t.to;
	}
	if (at < text.length) out.push({ text: text.slice(at), className: null });
	return out;
}

/** The tiny search problem as the tools write it (formatGraphText). */
export const TINY_TEXT = formatGraphText(TINY_PROBLEM);

/** The "A* gone wrong" graph with its heuristic (Informed Search, slides 27–28). */
export const ASTAR_WRONG_TEXT = formatGraphText(ASTAR_WRONG_PROBLEM);

export interface DiagnosticExample {
	/** The line the message is about, as typed. */
	line: string;
	/** The whole text parsed. */
	text: string;
	diagnostic: Diagnostic | null;
}

const BASE = 'start: A\ngoal: B\n';

/** Inputs whose diagnostics the page shows (messages come from parseGraphText). */
export const DIAGNOSTIC_INPUTS: readonly { line: string; text: string }[] = [
	{ line: 'strat: A', text: 'strat: A\ngoal: B\nA - B 5' },
	{ line: 'A - B -3', text: `${BASE}A - B -3` },
	{ line: 'Rimnicu Vilcea - B 5', text: `${BASE}Rimnicu Vilcea - B 5` },
	{ line: 'A -> B 5', text: `undirected\n${BASE}A -> B 5` },
	{ line: 'h: A=-1', text: `${BASE}A - B 5\nh: A=-1` },
	{ line: 'h: C=2', text: `${BASE}A - B 5\nh: C=2` },
	{ line: 'A - B 7', text: `${BASE}A - B 5\nA - B 7` },
	{ line: 'B - B 1', text: `${BASE}A - B 5\nB - B 1` },
	{ line: 'start: A', text: 'start: A\nA - B 5' }
];

/** The first diagnostic of each input. */
export function diagnosticExamples(
	inputs: readonly { line: string; text: string }[] = DIAGNOSTIC_INPUTS
): DiagnosticExample[] {
	return inputs.map(({ line, text }) => {
		const { diagnostics } = parseGraphText(text);
		// The message about the line shown: the first diagnostic whose span lies on it.
		const from = text.lastIndexOf(line);
		const to = from + line.length;
		const onLine = diagnostics.find(
			(d) => from >= 0 && d.span !== undefined && d.span.start >= from && d.span.start < to
		);
		return { line, text, diagnostic: onLine ?? diagnostics[0] ?? null };
	});
}

// ---------------------------------------------------------------------------
// 8-puzzle
// ---------------------------------------------------------------------------

/** h1 and h2 of the slide start state (Informed Search, slide 32). */
export const PUZZLE_VALUES = {
	h1: misplacedTiles(SLIDE_START, SLIDE_GOAL),
	h2: manhattanDistance(SLIDE_START, SLIDE_GOAL),
	/** "3+1+2+2+2+3+3+2": the tile distances of tiles 1–8 in order. */
	h2Terms: tileDistances(SLIDE_START, SLIDE_GOAL)
		.map((t) => t.distance)
		.join('+')
};

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export interface GridHeuristicRow {
	id: GridHeuristic;
	name: string;
	formula: string;
	/** h for a cell 3 columns and 2 rows from the goal, formatted. */
	example: string;
	/** Admissible with 4-connected and with 8-connected moves. */
	admissible4: boolean;
	admissible8: boolean;
}

const GRID_NAMES: Record<GridHeuristic, { name: string; formula: string }> = {
	manhattan: { name: 'Manhattan', formula: '|dx| + |dy|' },
	euclidean: { name: 'Euclidean', formula: '√(dx² + dy²)' },
	octile: { name: 'Octile', formula: 'max(|dx|, |dy|) + (√2 − 1)·min(|dx|, |dy|)' },
	chebyshev: { name: 'Chebyshev', formula: 'max(|dx|, |dy|)' },
	zero: { name: 'Zero', formula: '0' }
};

/** Offsets of the example cell from the goal. */
export const GRID_EXAMPLE = { dx: 3, dy: 2 };

const round2 = (n: number) => String(Math.round(n * 100) / 100);

export const GRID_HEURISTIC_ROWS: readonly GridHeuristicRow[] = GRID_HEURISTICS.map((id) => ({
	id,
	...GRID_NAMES[id],
	example: round2(heuristicDistance(id, GRID_EXAMPLE.dx, GRID_EXAMPLE.dy)),
	admissible4: isAdmissible(id, false),
	admissible8: isAdmissible(id, true)
}));

export const GRID_MOVES_4 = gridMoves(false);
export const GRID_MOVES_8 = gridMoves(true);

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

export interface DeckRow {
	id: DeckId;
	title: string;
	chapter: string;
	slides: number;
	example: string;
}

export const DECK_ROWS: readonly DeckRow[] = deckOrder.map((id) => ({
	id,
	title: decks[id].title,
	chapter: decks[id].chapter,
	slides: decks[id].slides,
	example: formatCitation({ deck: id, slide: 2 })
}));

/** Every citation on the page's data, for validation. */
export function allCitations(): Citation[] {
	const out: Citation[] = [];
	for (const s of SECTIONS) out.push(...s.cites);
	for (const t of TERMS) out.push(t.cite);
	for (const s of SYMBOLS) if (s.cite) out.push(s.cite);
	for (const f of HEURISTIC_PROPERTIES) out.push(f.cite);
	for (const c of COMPLEXITIES) out.push(...c.cite);
	for (const r of STRATEGY_ROWS) if (r.cite) out.push(r.cite);
	for (const t of TRACE_DEFS) out.push(t.cite);
	return out;
}

/** Whether a citation names slides that exist in its deck. */
export function citationExists(c: Citation): boolean {
	const deck = decks[c.deck];
	if (!deck) return false;
	if (c.slide === undefined) return true;
	const [a, b] = typeof c.slide === 'number' ? [c.slide, c.slide] : c.slide;
	return Number.isInteger(a) && Number.isInteger(b) && a >= 1 && a <= b && b <= deck.slides;
}
