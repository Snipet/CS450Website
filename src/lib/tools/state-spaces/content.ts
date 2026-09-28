/**
 * Text of the state spaces tool, in the words of Solving Problems by
 * Searching (slides 2–14): the two types of agents, the components of each
 * example search problem, and the state-space sizes of slides 8, 10, and 12.
 */
import type { Citation } from '$lib/lectures';
import { vacuumStateCount } from '$lib/theory/agents/vacuum-space';
import { REACHABLE_STATES } from '$lib/theory/puzzle';

export type ProblemId = 'romania' | 'vacuum' | 'puzzle' | 'robot';

/** Problems in slide order. */
export const PROBLEM_IDS: readonly ProblemId[] = ['romania', 'vacuum', 'puzzle', 'robot'];

// ---------------------------------------------------------------------------
// Types of agents (slide 2)
// ---------------------------------------------------------------------------

export interface AgentType {
	id: 'reflex' | 'planning';
	name: string;
	/** The first line of the slide, set apart there: how the agent sees the world. */
	lead: string;
	points: string[];
}

export const AGENT_TYPES: readonly AgentType[] = [
	{
		id: 'reflex',
		name: 'Reflex agent',
		lead: 'Consider how the world IS',
		points: [
			'Choose action based on current percept',
			'Do not consider the future consequences of actions'
		]
	},
	{
		id: 'planning',
		name: 'Planning agent',
		lead: 'Consider how the world WOULD BE',
		points: [
			'Decisions based on (hypothesized) consequences of actions',
			'Must have a model of how the world evolves in response to actions',
			'Must formulate a goal'
		]
	}
];

/** Search (slides 3–4): the setting of the chapter. */
export const SEARCH_SETTING: readonly string[] = [
	'Goal-based agents in fully observable, deterministic, discrete, known environments.',
	'The agent must find a sequence of actions that reaches the goal.',
	'The performance measure is defined by (a) reaching the goal and (b) how “expensive” the path to the goal is.',
	'While executing the solution, the agent can safely ignore its percepts (open-loop system).'
];

// ---------------------------------------------------------------------------
// Search problem components (slide 5) per example (slides 6–11)
// ---------------------------------------------------------------------------

export type ComponentId = 'states' | 'initial' | 'actions' | 'transition' | 'goal' | 'cost';

export const COMPONENT_NAMES: Record<ComponentId, string> = {
	states: 'States',
	initial: 'Initial state',
	actions: 'Actions',
	transition: 'Transition model',
	goal: 'Goal state',
	cost: 'Path cost'
};

export const COMPONENT_ORDER: readonly ComponentId[] = [
	'states',
	'initial',
	'actions',
	'transition',
	'goal',
	'cost'
];

/** Slide 5: the components, with the slide's notes on two of them. */
export const SLIDE_5_COMPONENTS: readonly { id: Exclude<ComponentId, 'states'>; note?: string }[] =
	[
		{ id: 'initial' },
		{ id: 'actions' },
		{
			id: 'transition',
			note: 'What state results from performing a given action in a given state? Called Successor.'
		},
		{ id: 'goal' },
		{ id: 'cost', note: 'Assume that it is a sum of nonnegative step costs.' }
	];

export const OPTIMAL_SOLUTION =
	'The optimal solution is the sequence of actions that gives the lowest path cost for reaching the goal.';

export interface ProblemComponent {
	id: ComponentId;
	text: string;
	/** False when the slide leaves the component out and the text fills it in. */
	onSlide: boolean;
}

export interface ProblemInfo {
	id: ProblemId;
	/** Tab label. */
	name: string;
	/** Title as on the slide. */
	title: string;
	cite: Citation;
	/** Setting lines from the slide, if any. */
	setting: string[];
	components: ProblemComponent[];
}

const c = (id: ComponentId, text: string, onSlide = true): ProblemComponent => ({
	id,
	text,
	onSlide
});

/** The vacuum world's components for `n` squares (slide 8 lists states, actions, transition model). */
function vacuumComponents(n: number): ProblemComponent[] {
	const all = n === 2 ? 'both squares' : `all ${n} squares`;
	return [
		c('states', 'Agent location and dirt location'),
		c('initial', `Any state; the search here starts with the agent in A and ${all} dirty`, false),
		c('actions', 'Left, right, suck'),
		c(
			'transition',
			'Left and Right move the agent one square (no effect at the end of the row); Suck removes the dirt in the agent’s square. The state-space graph shows every transition (slide 9).'
		),
		c('goal', `No dirt: ${all} clean, the agent anywhere`, false),
		c('cost', '1 per action', false)
	];
}

export function problemInfo(id: ProblemId, squares = 2): ProblemInfo {
	switch (id) {
		case 'romania':
			return {
				id,
				name: 'Romania',
				title: 'Example: Romania',
				cite: { deck: 'search', slide: 6 },
				setting: [
					'On vacation in Romania; currently in Arad.',
					'Flight leaves tomorrow from Bucharest.'
				],
				components: [
					c('states', 'The city the agent is in', false),
					c('initial', 'Arad'),
					c('actions', 'Go from one city to another'),
					c('transition', 'If you go from city A to city B, you end up in city B'),
					c('goal', 'Bucharest'),
					c('cost', 'Sum of edge costs (total distance traveled)')
				]
			};
		case 'vacuum':
			return {
				id,
				name: 'Vacuum world',
				title: 'Example: Vacuum world',
				cite: { deck: 'search', slide: [8, 9] },
				setting: [],
				components: vacuumComponents(squares)
			};
		case 'puzzle':
			return {
				id,
				name: '8-puzzle',
				title: 'Example: The 8-puzzle',
				cite: { deck: 'search', slide: 10 },
				setting: [],
				components: [
					c('states', `Locations of tiles: ${formatCount(REACHABLE_STATES)} states (9!/2)`),
					c('initial', 'The start state on the slide: 7 2 4 / 5 _ 6 / 8 3 1', false),
					c('actions', 'Move blank left, right, up, down'),
					c(
						'transition',
						'The blank swaps places with the tile next to it in the direction of the move',
						false
					),
					c('goal', 'The goal state on the slide: _ 1 2 / 3 4 5 / 6 7 8', false),
					c('cost', '1 per move')
				]
			};
		case 'robot':
			return {
				id,
				name: 'Robot motion planning',
				title: 'Example: Robot motion planning',
				cite: { deck: 'search', slide: 11 },
				setting: [],
				components: [
					c('states', 'Real-valued joint parameters (angles, displacements)'),
					c('initial', 'The arm’s current joint configuration', false),
					c('actions', 'Continuous motions of robot joints'),
					c('transition', 'The configuration the joints reach at the end of a motion', false),
					c('goal', 'Configuration in which object is grasped'),
					c('cost', 'Time to execute, smoothness of path, etc.')
				]
			};
	}
}

// ---------------------------------------------------------------------------
// State space (slide 7), successor function (slide 14), basic idea (slide 13)
// ---------------------------------------------------------------------------

export const STATE_SPACE_DEFINITION = [
	'The initial state, actions, and transition model define the state space of the problem: the set of all states reachable from the initial state by any sequence of actions.',
	'It can be represented as a directed graph where the nodes are states and the links between nodes are actions.'
];

export const SUCCESSOR_DEFINITION = [
	'We usually don’t have a full representation of the state space.',
	'Instead, a successor function captures the transition model: given a state, apply all applicable actions and generate a list of the resulting (successor) states.'
];

export const BASIC_IDEA: readonly string[] = [
	'Begin at the start state and expand it by making a list of all possible successor states (with the successor function).',
	'Maintain a frontier: a list of unexpanded states.',
	'At each step, pick a state from the frontier to expand.',
	'Keep going until you reach a goal state.',
	'Try to expand as few states as possible.'
];

// ---------------------------------------------------------------------------
// State-space sizes (slides 8, 10, 12)
// ---------------------------------------------------------------------------

/** 8-puzzle, 15-puzzle, and 24-puzzle state counts as on slide 10. */
export const PUZZLE_SIZES: readonly { name: string; states: number; text: string }[] = [
	{ name: '8-puzzle', states: REACHABLE_STATES, text: '181,440 (9!/2)' },
	{ name: '15-puzzle', states: 1.3e12, text: '~1.3 trillion' },
	{ name: '24-puzzle', states: 1e25, text: '~10²⁵' }
];

/** Rows of the n·2ⁿ table for n = 1 … `max` (slide 8). */
export function vacuumCountRows(max = 10): { n: number; states: number }[] {
	return Array.from({ length: max }, (_, i) => ({ n: i + 1, states: vacuumStateCount(i + 1) }));
}

export interface SizeRow {
	problem: string;
	/** V: number of states (Infinity for continuous state spaces). */
	states: number;
	/** How the slides write the number of states. */
	statesText: string;
	/** E: number of actions (directed edges), self-loops included. */
	edges: number;
	edgesText: string;
	/** E + V log₂ V, the work of Dijkstra’s algorithm up to a constant factor. */
	work: number;
	cite: Citation;
}

/** E + V log₂ V (Infinity for an infinite state space). */
export function dijkstraWork(states: number, edges: number): number {
	if (!Number.isFinite(states) || !Number.isFinite(edges)) return Infinity;
	return edges + (states > 1 ? states * Math.log2(states) : 0);
}

const row = (
	problem: string,
	states: number,
	statesText: string,
	edges: number,
	edgesText: string,
	cite: Citation
): SizeRow => ({
	problem,
	states,
	statesText,
	edges,
	edgesText,
	work: dijkstraWork(states, edges),
	cite
});

/**
 * State-space sizes of the example problems, smallest first. Edges: Romania's 23 roads in both
 * directions; three actions per vacuum state; the blank has 2, 3, or 4 moves
 * (on average 24/9 on the 3 × 3 board, 3 on 4 × 4, 3.2 on 5 × 5).
 */
export function sizeRows(): SizeRow[] {
	const v2 = vacuumStateCount(2);
	const v10 = vacuumStateCount(10);
	return [
		row('Vacuum world, 2 squares', v2, formatCount(v2), 3 * v2, formatCount(3 * v2), {
			deck: 'search',
			slide: 9
		}),
		row('Romania', 20, '20', 46, '46 (23 roads, both ways)', { deck: 'search', slide: 6 }),
		row('Vacuum world, 10 squares', v10, formatCount(v10), 3 * v10, formatCount(3 * v10), {
			deck: 'search',
			slide: 8
		}),
		row(
			'8-puzzle',
			REACHABLE_STATES,
			'181,440',
			(REACHABLE_STATES * 24) / 9,
			formatCount((REACHABLE_STATES * 24) / 9),
			{ deck: 'search', slide: 10 }
		),
		row('15-puzzle', 1.3e12, '~1.3 trillion', 3 * 1.3e12, formatBig(3 * 1.3e12), {
			deck: 'search',
			slide: 10
		}),
		row('24-puzzle', 1e25, '~10²⁵', 3.2e25, formatBig(3.2e25), { deck: 'search', slide: 10 }),
		row('Robot motion planning', Infinity, 'Infinite (continuous)', Infinity, 'Infinite', {
			deck: 'search',
			slide: 11
		})
	];
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Digits as superscripts: 25 → "²⁵". */
export function superscript(n: number): string {
	return [...String(n)].map((ch) => (ch === '-' ? '⁻' : (SUPERSCRIPT[Number(ch)] ?? ch))).join('');
}

/** 181440 → "181,440". */
export const formatCount = (n: number): string => Math.round(n).toLocaleString('en-US');

/**
 * Large counts in words or powers of ten: "3.7 million", "1.3 trillion",
 * "5.6 × 10¹³"; below a million with separators; "∞" for Infinity.
 */
export function formatBig(n: number): string {
	if (!Number.isFinite(n)) return '∞';
	if (Math.abs(n) < 1e6) return formatCount(n);
	const words: [number, string][] = [
		[1e12, 'trillion'],
		[1e9, 'billion'],
		[1e6, 'million']
	];
	if (Math.abs(n) < 1e15) {
		const [unit, word] = words.find(([u]) => Math.abs(n) >= u)!;
		return `${trim(n / unit)} ${word}`;
	}
	const exp = Math.floor(Math.log10(Math.abs(n)));
	const mantissa = n / 10 ** exp;
	return `${trim(mantissa)} × 10${superscript(exp)}`;
}

/** One decimal, without a trailing ".0". */
function trim(x: number): string {
	const s = (Math.round(x * 10) / 10).toFixed(1);
	return s.endsWith('.0') ? s.slice(0, -2) : s;
}
