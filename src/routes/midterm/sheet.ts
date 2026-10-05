/**
 * The midterm review topics in sheet order: four sections, their items, and
 * for each item the facts from the lecture decks (with slides), links that
 * open the tools on the matching slide examples, slide questions with
 * answers, and which practice drill goes with it.
 */
import type { Citation } from '$lib/lectures';
import {
	BINARY_TREE_PROBLEM,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	ASTAR_WRONG_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	formatGraphText,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import { encodeGrid, gridPreset } from '$lib/theory/grid';
import { SLIDE_START } from '$lib/theory/puzzle';
import type { LinkSlug, LinkStates } from '$lib/tools/links';
import type { DrillStrategy } from './practice/search-drill';

/** A link into a tool, opened on `state`. */
export type ToolExample = {
	[S in LinkSlug]: { slug: S; state: LinkStates[S]; label: string; note?: string };
}[LinkSlug];

export interface SlideQuestion {
	question: string;
	answer: string;
	cite: Citation;
}

export interface Term {
	term: string;
	meaning: string;
	cite?: Citation;
}

export type Practice =
	| { kind: 'search'; strategy: DrillStrategy }
	| { kind: 'heuristic' }
	| { kind: 'game'; focus: 'minimax' | 'alphabeta' }
	| { kind: 'properties' };

export interface Fact {
	text: string;
	cite?: Citation;
}

export interface SheetItem {
	/** Stable id, also the checklist key and the element id ("search-bfs"). */
	id: string;
	letter: string;
	/** The topic as the sheet words it. */
	title: string;
	/** Short heading for the side navigation when the title is long. */
	short?: string;
	facts: Fact[];
	/** Extra content the page renders by id (tables and glossaries). */
	extra?:
		'environments' | 'algorithms' | 'pros-cons' | 'glossary' | 'lisp-basics' | 'lisp-patterns';
	examples: ToolExample[];
	questions?: SlideQuestion[];
	practice?: Practice;
	/** Shown when an item has no lecture material. */
	note?: string;
}

export interface SheetSection {
	id: string;
	number: number;
	title: string;
	items: SheetItem[];
}

export interface PointGroup {
	label: string;
	points: string;
	sections: string[];
}

/** Point split as on the sheet; sections 1 and 4 share one group. */
export const POINT_GROUPS: readonly PointGroup[] = [
	{ label: 'Intro and readings', points: '10–15', sections: ['intro', 'readings'] },
	{ label: 'Lisp', points: '10–15', sections: ['lisp'] },
	{ label: 'Search', points: '65–75', sections: ['search'] }
];

const graphText = (p: GraphProblemSpec) => formatGraphText(p, { positions: true });

const TINY = graphText(TINY_PROBLEM);
const ROMANIA = graphText(ROMANIA_PROBLEM);
const BINARY = graphText(BINARY_TREE_PROBLEM);

/** The two-ply game of Games and Adversarial Search, slide 9. */
const SLIDE_GAME = '[[3 12 8] [2 4 6] [14 5 2]]';
/** A three-ply tree; with best moves first alpha-beta prunes the most (slide 23). */
const ORDERING_GAME =
	'[[[13 0 11] [20 20 5] [12 15 8]] [[20 9 10] [2 8 5] [3 10 1]] [[8 16 6] [4 0 8] [12 16 6]]]';
/** A four-ply tree with evaluation values in braces, for depth cutoffs (slides 24–25). */
const CUTOFF_GAME = `[
  {5}[{6}[{2}[1 9] {1}[0 7]] {5}[{6}[8 6] {8}[7 9]]]
  {3}[{3}[{3}[3 5] {3}[2 8]] {4}[{4}[4 6] {5}[5 4]]]
]`;

const CONCAVE_GRID = encodeGrid(gridPreset('concave', 32, 22));
const OPEN_GRID = encodeGrid(gridPreset('open', 32, 22));

const intro = (slide: number | readonly [number, number]): Citation => ({ deck: 'intro', slide });
const agents = (slide: number | readonly [number, number]): Citation => ({ deck: 'agents', slide });
const searchDeck = (slide: number | readonly [number, number]): Citation => ({
	deck: 'search',
	slide
});
const uninformed = (slide: number | readonly [number, number]): Citation => ({
	deck: 'uninformed',
	slide
});
const informed = (slide: number | readonly [number, number]): Citation => ({
	deck: 'informed',
	slide
});
const games = (slide: number | readonly [number, number]): Citation => ({
	deck: 'adversarial',
	slide
});

export const SHEET: readonly SheetSection[] = [
	{
		id: 'intro',
		number: 1,
		title: 'Introductory lectures',
		items: [
			{
				id: 'intro-definitions',
				letter: 'a',
				title: 'Definitions of AI',
				facts: [
					{
						text: 'Definitions of AI vary along two dimensions: behavior or thought, measured against humans or against an ideal of rationality. That gives four approaches: acting humanly, thinking humanly, thinking rationally, acting rationally.',
						cite: intro(3)
					},
					{
						text: 'Acting humanly is the Turing test approach: a machine passes if a human interrogator cannot tell it from a human.',
						cite: intro(5)
					},
					{
						text: 'Thinking humanly is the cognitive modeling approach: it needs to know how humans think (introspection, psychological experiments, brain imaging); cognitive science brings AI models and experimental psychology together.',
						cite: intro(13)
					},
					{
						text: 'Thinking rationally is the “laws of thought” approach: Aristotle’s attempt to codify “right thinking” gave rise to logic. Logic assumes certainty; probability fills the gap for rigorous reasoning with uncertain information.',
						cite: intro(15)
					},
					{
						text: 'Acting rationally is the rational agent approach, the prevailing approach to AI: a rational agent acts to achieve the best outcome (or the best expected outcome).',
						cite: intro(17)
					},
					{
						text: 'For each possible percept sequence, a rational agent selects an action that is expected to maximize its performance measure, given the evidence provided by the percept sequence and its built-in knowledge.',
						cite: agents(4)
					},
					{
						text: '“Weak” AI: the computer is a tool for studying intelligence and developing useful technology. “Strong” AI: a computer could (in principle) be programmed to actually be a mind, with understanding, beliefs, and other cognitive states.',
						cite: intro(11)
					}
				],
				examples: [
					{
						slug: 'approaches',
						state: {},
						label: 'Approaches to AI',
						note: 'the 2 × 2 table of definitions and an application board'
					},
					{
						slug: 'vacuum',
						state: { program: 'reflex', measure: 'clean-minus-moves' },
						label: 'Vacuum-cleaner agent',
						note: 'the reflex agent scored by two performance measures'
					}
				],
				questions: [
					{
						question: 'Can a rational agent make mistakes?',
						answer:
							'Yes. Rationality means maximizing expected performance given the percepts so far and the agent’s built-in knowledge, not knowing every outcome in advance, so a rational action can still turn out badly.',
						cite: agents(4)
					},
					{
						question: 'Is the reflex vacuum agent rational?',
						answer: 'It depends on the performance measure and the environment’s properties.',
						cite: agents(5)
					}
				]
			},
			{
				id: 'intro-turing',
				letter: 'b',
				title: 'Turing test / Chinese Room',
				facts: [
					{
						text: 'The Turing test (Alan Turing, 1950): a machine “passes” if a human interrogator cannot tell machine from human. The original test with written questions and answers requires at least natural language processing, knowledge representation, automated reasoning, and machine learning.',
						cite: intro(5)
					},
					{
						text: 'The total Turing test adds interaction with people and objects, so the robot also needs computer vision, speech recognition and generation, and robotic manipulation.',
						cite: intro(6)
					},
					{
						text: 'Winograd schemas (Levesque, IJCAI 2013): multiple-choice questions people answer easily but computers cannot answer with “cheap tricks”. Unlike the Turing test they can be graded by machine, do not depend on human judgment, need no English generation, cannot be dodged verbally, and can be made “Google-proof”.',
						cite: intro([7, 10])
					},
					{
						text: 'John Searle’s Chinese Room (1980) is an argument against strong AI. A person who knows no Chinese sits in a room with a rule book for manipulating Chinese symbols; questions written in Chinese come in, the person follows the rules, and the answers passed out look fluent. The person (and so a computer running the same program) manipulates symbols by their form alone, without understanding them: running the right program is not enough for a mind.',
						cite: intro(11)
					}
				],
				examples: [
					{
						slug: 'approaches',
						state: { approach: 'acting-humanly' },
						label: 'Acting humanly',
						note: 'the Turing test, the total Turing test, and Winograd schemas to answer'
					},
					{
						slug: 'history',
						state: {},
						label: 'AI history',
						note: 'the timeline with the Turing test (1950) and the Chinese Room (1980)'
					}
				],
				questions: [
					{
						question:
							'The trophy would not fit in the brown suitcase because it was so large. What was so large?',
						answer: 'The trophy.',
						cite: intro(7)
					},
					{
						question: 'How did systems do at the 2016 Winograd schema challenge?',
						answer:
							'Six entries; the best system answered 58% of 60 questions correctly. Humans get 90% correct.',
						cite: intro(10)
					}
				]
			},
			{
				id: 'intro-environments',
				letter: 'c',
				title: 'Dimensions of complexity (types of environments and problems)',
				short: 'Dimensions of complexity',
				facts: [
					{
						text: 'A task environment is specified by PEAS: performance measure, environment, actuators, sensors.',
						cite: agents(6)
					},
					{
						text: 'Environment types: fully or partially observable, deterministic or stochastic, episodic or sequential, static or dynamic, discrete or continuous, single agent or multi-agent, known or unknown (the table below).',
						cite: agents([9, 16])
					},
					{
						text: 'The environment dictates the approach: deterministic environments use search, constraint satisfaction, and classical planning; multi-agent strategic ones minimax search and games; stochastic episodic ones Bayesian networks and pattern classifiers; stochastic sequential known ones Markov decision processes; unknown ones reinforcement learning.',
						cite: agents(18)
					},
					{
						text: 'The search lectures assume goal-based agents in fully observable, deterministic, discrete, known environments.',
						cite: searchDeck(3)
					},
					{
						text: 'Game environments: deterministic with perfect information (chess, checkers, go), stochastic with perfect information (backgammon, monopoly), deterministic with imperfect information (battleships), stochastic with imperfect information (Scrabble, poker, bridge).',
						cite: games(3)
					}
				],
				extra: 'environments',
				examples: [
					{
						slug: 'environments',
						state: {},
						label: 'Task environments',
						note: 'classify the slide 17 examples along each dimension'
					},
					{
						slug: 'environments',
						state: { preset: 'taxi' },
						label: 'Autonomous taxi',
						note: 'its PEAS description and environment type'
					}
				]
			}
		]
	},
	{
		id: 'lisp',
		number: 2,
		title: 'Lisp',
		items: [
			{
				id: 'lisp-interpret',
				letter: 'a',
				title: 'Be able to interpret functions',
				short: 'Interpret functions',
				facts: [
					{
						text: 'A program is made of s-expressions: atoms (numbers, symbols such as x, t, nil) and lists in parentheses. A list is evaluated as a call in prefix notation: (+ 1 (* 2 3)) is 7.'
					},
					{
						text: "To evaluate a call, Lisp evaluates the arguments left to right, then applies the function. Special forms are the exceptions: quote returns its argument unevaluated ('(a b) is the list (a b)), if and cond evaluate only the branch they pick, defun and let bind names."
					},
					{
						text: 'nil is both the empty list () and false; anything else counts as true, and t is the usual true value.'
					},
					{
						text: 'List functions: (car l) is the first element, (cdr l) the rest, (cons x l) puts x in front of l, (list a b c) builds a list, (append l1 l2) joins lists. Predicates: null, atom, listp, numberp, equal, eq, zerop, member.'
					},
					{
						text: 'To read a recursive function, trace the calls on a small input: write each call with its arguments, find the base case, then combine the returned values on the way back up.'
					}
				],
				extra: 'lisp-basics',
				examples: []
			},
			{
				id: 'lisp-write',
				letter: 'b',
				title: 'Be able to write (basic) functions',
				short: 'Write functions',
				facts: [
					{
						text: '(defun name (parameters) body) defines a function; the value of the last form in the body is returned.'
					},
					{
						text: 'Recursion over a list: test for the empty list first ((null l) → the base value), otherwise combine (car l) with a recursive call on (cdr l). Recursion over numbers: stop at 0 (zerop n), recurse on (- n 1).'
					},
					{
						text: 'Build results with cons (adds to the front), keep the order of the input by consing (car l) onto the recursive result, and use cond for more than two cases: (cond ((test1) result1) ((test2) result2) (t default)).'
					}
				],
				extra: 'lisp-patterns',
				examples: []
			}
		]
	},
	{
		id: 'search',
		number: 3,
		title: 'Search',
		items: [
			{
				id: 'search-formulation',
				letter: 'a',
				title: 'Problem formation (state space representation)',
				short: 'Problem formation',
				facts: [
					{
						text: 'A search problem has an initial state, actions, a transition model (the state that results from an action in a state, called the successor), a goal state, and a path cost (a sum of nonnegative step costs). The optimal solution is the action sequence with the lowest path cost to the goal.',
						cite: searchDeck(5)
					},
					{
						text: 'The initial state, actions, and transition model define the state space: the set of all states reachable from the initial state by any sequence of actions, a directed graph whose nodes are states and whose links are actions.',
						cite: searchDeck(7)
					},
					{
						text: 'Romania: initial state Arad, actions go from one city to another, going from A to B ends in B, goal Bucharest, path cost the total distance traveled.',
						cite: searchDeck(6)
					},
					{
						text: 'Vacuum world: a state is the agent location and the dirt locations; actions Left, Right, Suck. The 8-puzzle: a state is the tile locations (181,440 = 9!/2 reachable states); actions move the blank left, right, up, down at 1 per move. Robot motion planning: real-valued joint parameters and continuous motions.',
						cite: searchDeck([8, 11])
					},
					{
						text: 'The search tree is a “what if” tree of action sequences: the root is the start state and children come from the successor function. A node is not a state: one state can appear in many nodes.',
						cite: searchDeck(27)
					}
				],
				examples: [
					{
						slug: 'state-spaces',
						state: { problem: 'romania' },
						label: 'State spaces: Romania',
						note: 'the five components of the route-finding problem'
					},
					{
						slug: 'state-spaces',
						state: { problem: 'vacuum' },
						label: 'State spaces: vacuum world',
						note: 'the 8-state graph and its growth with n squares'
					},
					{
						slug: 'state-spaces',
						state: { problem: 'puzzle' },
						label: 'State spaces: 8-puzzle'
					},
					{
						slug: 'search',
						state: { graph: ROMANIA, strategy: 'astar', mode: 'tree' },
						label: 'Tree search on Romania',
						note: 'Arad reappears below Sibiu: nodes are not states'
					}
				],
				questions: [
					{
						question: 'What is the state space for the Romania problem?',
						answer:
							'The 20 cities are the states; a road between two cities gives an action each way, so the state space is the road map drawn as a graph.',
						cite: searchDeck(7)
					},
					{
						question:
							'Vacuum world: how many possible states? What if there are n possible locations?',
						answer:
							'2 locations × 2² dirt configurations = 8 states. With n locations, n · 2ⁿ: the size of the state space grows exponentially with the size of the world.',
						cite: searchDeck(8)
					}
				]
			},
			{
				id: 'search-blind-informed',
				letter: 'b',
				title: 'Blind vs. informed/heuristic',
				facts: [
					{
						text: 'A search strategy is defined by the order of node expansion. Uninformed (blind) strategies use only the information available in the problem definition: breadth-first, depth-first, iterative deepening, uniform-cost.',
						cite: uninformed(2)
					},
					{
						text: 'Informed strategies give the algorithm “hints” about the desirability of states: an evaluation function ranks the nodes and the most promising one is expanded. Greedy best-first search, A*, and RBFS.',
						cite: informed(4)
					},
					{
						text: 'A heuristic function h(n) estimates the cost of reaching the goal from node n, such as the straight-line distance to Bucharest.',
						cite: informed([5, 6])
					}
				],
				examples: [
					{
						slug: 'strategies',
						state: { graph: ROMANIA, mode: 'graph' },
						label: 'Comparing search strategies',
						note: 'every strategy on Romania side by side'
					},
					{
						slug: 'grid',
						state: { grid: CONCAVE_GRID, algorithm: 'ucs', compare: 'astar' },
						label: 'Uniform-cost search vs. A* on a grid',
						note: 'g(n) alone against g(n) + h(n)'
					}
				]
			},
			{
				id: 'search-bfs',
				letter: 'c',
				title: 'Breadth-first',
				facts: [
					{
						text: 'Expand the shallowest unexpanded node; the frontier is a FIFO queue.',
						cite: uninformed(3)
					},
					{
						text: 'Complete if the branching factor b is finite; optimal if every step costs the same; time and space O(bᵈ). Space is the bigger problem.',
						cite: uninformed(31)
					},
					{
						text: 'It finds the path with the fewest steps, which is not always the cheapest one.',
						cite: uninformed(39)
					}
				],
				examples: [
					{
						slug: 'search',
						state: { graph: TINY, strategy: 'bfs' },
						label: 'BFS expansion order',
						note: 'S, d, e, p, b, c, e, h, r, q, a, a, h, r, p, q, f, p, q, f, q, c, G'
					},
					{
						slug: 'grid',
						state: { grid: OPEN_GRID, algorithm: 'bfs', compare: 'ucs', heuristic: 'octile' },
						label: 'BFS vs. UCS with diagonal moves',
						note: 'diagonal steps cost √2: fewest steps is not cheapest'
					}
				],
				practice: { kind: 'search', strategy: 'bfs' }
			},
			{
				id: 'search-dfs',
				letter: 'd',
				title: 'Depth-first',
				facts: [
					{
						text: 'Expand the deepest unexpanded node; the frontier is a LIFO queue.',
						cite: uninformed(5)
					},
					{
						text: 'Not complete: it fails in infinite-depth spaces and spaces with loops (avoiding repeated states along the path makes it complete in finite spaces). Not optimal: it returns the first solution it finds.',
						cite: uninformed(32)
					},
					{
						text: 'Time O(bᵐ), terrible when m is much larger than d, but possibly much faster than BFS when there are many solutions. Space O(bm): linear.',
						cite: uninformed(32)
					}
				],
				examples: [
					{
						slug: 'search',
						state: { graph: TINY, strategy: 'dfs' },
						label: 'DFS expansion order',
						note: 'S, d, b, a, c, a, e, h, p, q, q, r, f, c, a, G'
					},
					{
						slug: 'search',
						state: { graph: ROMANIA, strategy: 'dfs', mode: 'path' },
						label: 'DFS with a path check',
						note: 'no more going back and forth between Arad and Sibiu'
					}
				],
				questions: [
					{
						question: 'How do you make DFS complete?',
						answer:
							'Avoid repeated states along the path: then DFS is complete in finite state spaces.',
						cite: uninformed(32)
					},
					{
						question: 'When is DFS better than BFS?',
						answer:
							'When there are lots of solutions, DFS may find one much faster; and its space is O(bm) instead of O(bᵈ).',
						cite: uninformed([31, 32])
					}
				],
				practice: { kind: 'search', strategy: 'dfs' }
			},
			{
				id: 'search-dls',
				letter: 'e',
				title: 'Depth-first fixed depth',
				facts: [
					{
						text: 'Depth-limited search is DFS with a fixed depth limit ℓ: a node at depth ℓ is goal-tested but not expanded. Iterative deepening uses it as a subroutine (“do a DFS searching for a path of length 1”, then 2, …).',
						cite: uninformed(33)
					},
					{
						text: 'The limit stops infinite descents, so it is never stuck on an infinite path, and memory stays linear: O(bℓ). It misses every goal deeper than ℓ, so it is not complete when ℓ < d, and like DFS it is not optimal. Time O(b^ℓ).'
					},
					{
						text: 'The result is a solution, or failure, or a cutoff: no goal within the limit but some node was cut off at depth ℓ, so a deeper search might still succeed.'
					}
				],
				examples: [
					{
						slug: 'search',
						state: { graph: BINARY, strategy: 'dls', depthLimit: 2 },
						label: 'Depth-limited search, limit 2',
						note: 'the binary tree of the iterative deepening slides: cutoff at D, E, F, G'
					}
				],
				practice: { kind: 'search', strategy: 'dls' }
			},
			{
				id: 'search-ids',
				letter: 'f',
				title: 'Iterative deepening',
				facts: [
					{
						text: 'Run depth-limited DFS with limits 0, 1, 2, … until a goal is found.',
						cite: uninformed(33)
					},
					{
						text: 'Complete; optimal if every step costs 1; time (d+1)b⁰ + d b¹ + (d−1)b² + … + bᵈ = O(bᵈ); space O(bd).',
						cite: uninformed(38)
					},
					{
						text: 'The shallow levels are generated again in every iteration, but most nodes of a tree are at the bottom level, so the repetition costs little: BFS’s completeness with DFS’s memory.',
						cite: uninformed(38)
					}
				],
				examples: [
					{
						slug: 'search',
						state: { graph: BINARY, strategy: 'ids', depthLimit: 10 },
						label: 'Iterative deepening',
						note: 'A | A B C | A B D E C F G | A B D H I E J K C F L M'
					},
					{
						slug: 'strategies',
						state: {},
						label: 'Node counts',
						note: 'IDS against BFS for a b-ary tree of depth d'
					}
				],
				practice: { kind: 'search', strategy: 'ids' }
			},
			{
				id: 'search-ucs',
				letter: 'g',
				title: 'Uniform Cost Search',
				facts: [
					{
						text: 'Expand the frontier node with the lowest path cost g(n); the frontier is a priority queue ordered by path cost. Equivalent to BFS if all step costs are equal, and to Dijkstra’s algorithm in general.',
						cite: uninformed(40)
					},
					{
						text: 'Complete if every step cost is greater than some positive constant ε. Optimal: nodes are expanded in increasing order of path cost (the goal test runs when a node comes off the frontier).',
						cite: uninformed([42, 44])
					},
					{
						text: 'Time and space: the number of nodes with path cost ≤ C*, O(b^(C*/ε)), which can be greater than O(bᵈ).',
						cite: uninformed(44)
					}
				],
				examples: [
					{
						slug: 'search',
						state: { graph: TINY, strategy: 'ucs' },
						label: 'Uniform-cost search example',
						note: 'S, p, d, b, e, a, r, f, e, G; path cost 10'
					},
					{
						slug: 'search',
						state: { graph: ROMANIA, strategy: 'ucs', mode: 'graph' },
						label: 'Uniform-cost graph search on Romania',
						note: 'cities in order of road distance from Arad'
					}
				],
				questions: [
					{
						question: 'When is UCS equivalent to BFS?',
						answer: 'When all step costs are equal.',
						cite: uninformed(40)
					},
					{
						question: 'Can the complexity of UCS exceed the complexity of BFS?',
						answer:
							'Yes. O(b^(C*/ε)) can be greater than O(bᵈ): UCS can explore long paths of small steps before shorter paths of larger steps.',
						cite: uninformed(44)
					}
				],
				practice: { kind: 'search', strategy: 'ucs' }
			},
			{
				id: 'search-astar',
				letter: 'h',
				title: 'A*',
				facts: [
					{
						text: 'Avoid expanding paths that are already expensive: order the frontier by f(n) = g(n) + h(n), the estimated total cost of the path through n to the goal (g: cost so far, h: estimated cost to the goal).',
						cite: informed(16)
					},
					{
						text: 'Optimal: tree search with an admissible heuristic, graph search with a consistent one. Optimally efficient: no other tree-based algorithm with the same heuristic expands fewer nodes and still guarantees the optimal solution.',
						cite: informed([29, 30])
					},
					{
						text: 'Complete unless there are infinitely many nodes with f(n) ≤ C*. Time and space: the nodes with f(n) ≤ C* (exponential).',
						cite: informed(31)
					},
					{
						text: 'Weighted A* inflates an admissible h by α > 1: fewer nodes tend to be expanded, and the solution costs at most α times the optimal cost.',
						cite: informed(38)
					}
				],
				examples: [
					{
						slug: 'search',
						state: { graph: ROMANIA, strategy: 'astar' },
						label: 'A* search example',
						note: 'f = g + h under every node, Arad to Bucharest (418)'
					},
					{
						slug: 'search',
						state: { graph: graphText(ASTAR_WRONG_PROBLEM), strategy: 'astar', mode: 'graph' },
						label: 'A* gone wrong',
						note: 'graph search with an admissible but inconsistent h'
					},
					{
						slug: 'search',
						state: { graph: ROMANIA, strategy: 'wastar', weight: 2 },
						label: 'Weighted A*',
						note: 'α = 2: fewer nodes, cost 450'
					},
					{
						slug: 'eight-puzzle',
						state: { start: SLIDE_START },
						label: '8-puzzle',
						note: 'A* with h1 and h2 on the slide’s start state'
					}
				],
				practice: { kind: 'search', strategy: 'astar' }
			},
			{
				id: 'search-best-first',
				letter: 'i',
				title: 'Best-first',
				facts: [
					{
						text: 'Best-first search expands the frontier node that an evaluation function ranks best. Greedy best-first search uses h(n) alone: it expands the node that looks closest to the goal.',
						cite: informed([4, 7])
					},
					{
						text: 'Greedy best-first is not complete (it can get stuck in loops) and not optimal; time and space are O(bᵐ) in the worst case and can be much better with a good heuristic.',
						cite: informed([12, 14])
					},
					{
						text: 'Keeping track of the distance already traveled as well as the distance remaining fixes the greedy problem: that is A*.',
						cite: informed(15)
					}
				],
				examples: [
					{
						slug: 'search',
						state: { graph: ROMANIA, strategy: 'greedy' },
						label: 'Greedy best-first search',
						note: 'Arad, Sibiu, Fagaras, Bucharest (cost 450, not 418)'
					},
					{
						slug: 'search',
						state: {
							graph: graphText(ROMANIA_IASI_FAGARAS),
							strategy: 'greedy',
							maxExpansions: 30
						},
						label: 'Greedy search loops',
						note: 'Iasi, Neamt, Iasi, Neamt, …'
					},
					{
						slug: 'search',
						state: { graph: graphText(GREEDY_TRAP_PROBLEM), strategy: 'greedy' },
						label: 'Greedy vs. A*',
						note: 'switch to A* for the short path'
					}
				],
				practice: { kind: 'search', strategy: 'greedy' }
			},
			{
				id: 'search-rbfs',
				letter: 'j',
				title: 'RBFS',
				facts: [
					{
						text: 'Recursive best-first search is listed with the informed strategies but is not on the slides; this summary follows the textbook.',
						cite: informed(4)
					},
					{
						text: 'RBFS imitates best-first search (with f = g + h, as A*) in linear space. It descends recursively into the best child while that child’s f-value stays within f_limit, the f-value of the best alternative path available from any ancestor of the current node.'
					},
					{
						text: 'When the best child’s f-value exceeds the limit, the recursion unwinds to the alternative, and each node on the way back replaces its f-value with the best f-value of its children (the backed-up value). A forgotten subtree can then be regenerated later if it becomes the best again.'
					},
					{
						text: 'Optimal with an admissible heuristic; space O(bd); its time is hard to characterize, because it may regenerate the same nodes many times as the best path changes.'
					}
				],
				examples: [
					{
						slug: 'rbfs',
						state: {},
						label: 'Recursive best-first search',
						note: 'the recursion with f-limits and backed-up values, step by step'
					}
				]
			},
			{
				id: 'search-minimax',
				letter: 'k',
				title: 'Minimax',
				facts: [
					{
						text: 'Alternating two-player zero-sum games: players take turns, and every terminal state has a utility for each player whose sum is constant. The solution is a strategy (a move for each state), not a fixed sequence of actions.',
						cite: games([4, 5])
					},
					{
						text: 'Minimax value of a node: the utility (for MAX) of being in that state, assuming perfect play on both sides. Minimax(node) is Utility(node) at a terminal node, the maximum over the actions at a MAX node, the minimum at a MIN node. The minimax strategy picks the move with the best worst-case payoff.',
						cite: games([10, 11])
					},
					{
						text: 'Optimal against an optimal opponent; against a suboptimal one, MAX’s utility can only be higher.',
						cite: games(12)
					},
					{
						text: 'Chess has b ≈ 35 and depth ≈ 100 (a tree of about 10¹⁵⁴ nodes), so search is cut off at a depth and an evaluation function scores the states there, often a weighted sum of features Eval(s) = w₁f₁(s) + … + wₙfₙ(s). The horizon effect: an event just beyond the depth limit is overlooked.',
						cite: games([5, 25])
					},
					{
						text: 'With more than two players, utilities are tuples and each player maximizes its own entry.',
						cite: games(13)
					}
				],
				examples: [
					{
						slug: 'minimax',
						state: { tree: SLIDE_GAME, algorithm: 'minimax' },
						label: 'A two-ply game',
						note: 'MAX’s value 3 at the root of the slide 9 tree'
					},
					{
						slug: 'minimax',
						state: { tree: CUTOFF_GAME, algorithm: 'minimax' },
						label: 'Cutting off search',
						note: 'evaluation values at a depth cutoff and the horizon effect'
					},
					{
						slug: 'tic-tac-toe',
						state: {},
						label: 'Tic-tac-toe',
						note: 'minimax values of every move from any position'
					}
				],
				questions: [
					{
						question: 'What if your opponent is suboptimal?',
						answer:
							'Your utility can only be higher than against an optimal opponent. A different strategy may do better against a suboptimal opponent, but it is necessarily worse against an optimal one.',
						cite: games(12)
					}
				],
				practice: { kind: 'game', focus: 'minimax' }
			},
			{
				id: 'search-alphabeta',
				letter: 'l',
				title: 'Alpha-beta pruning',
				facts: [
					{
						text: 'Alpha-beta computes the exact minimax decision without expanding every node. α is the best value for MAX found so far at any choice point above the node; β the lowest value found so far for MIN.',
						cite: games([14, 20])
					},
					{
						text: 'α and β start at −∞ and +∞. Min-Value returns as soon as v ≤ α, otherwise sets β = min(β, v); Max-Value returns as soon as v ≥ β, otherwise sets α = max(α, v).',
						cite: games([21, 22])
					},
					{
						text: 'Pruning does not change the result. How much is pruned depends on move ordering (best moves first); with perfect ordering the time drops from O(bᵐ) to O(b^(m/2)), effectively doubling the search depth.',
						cite: games(23)
					}
				],
				examples: [
					{
						slug: 'minimax',
						state: { tree: SLIDE_GAME, algorithm: 'alphabeta' },
						label: 'Alpha-beta on the two-ply game',
						note: 'the slide 14–19 walkthrough with α and β at each call'
					},
					{
						slug: 'minimax',
						state: { tree: ORDERING_GAME, algorithm: 'alphabeta' },
						label: 'Move ordering',
						note: 'switch the ordering to best first or worst first'
					}
				],
				practice: { kind: 'game', focus: 'alphabeta' }
			},
			{
				id: 'search-heuristics',
				letter: 'm',
				title:
					'Heuristics/evaluation (admissibility vs. consistency, what gives optimality or completeness)',
				short: 'Heuristics and evaluation',
				facts: [
					{
						text: 'Admissible: h(n) ≤ h*(n) for every node n, where h*(n) is the true cost to the goal; it never overestimates. Straight-line distance is admissible for road distance.',
						cite: informed(25)
					},
					{
						text: 'Consistent: h(n) ≤ c(n, n′) + h(n′) for every successor n′ (the heuristic “arc cost” never exceeds the real one). Consistency implies admissibility; most natural admissible heuristics are consistent.',
						cite: informed([28, 29])
					},
					{
						text: 'Optimality: A* tree search with an admissible (and non-negative) h; A* graph search with a consistent h. UCS is optimal (h = 0); greedy best-first is not, whatever the heuristic.',
						cite: informed(29)
					},
					{
						text: 'Completeness: BFS and IDS with finite b, UCS with step costs ≥ ε, A* unless infinitely many nodes have f(n) ≤ C*; DFS and greedy best-first are not complete.',
						cite: informed(42)
					},
					{
						text: '8-puzzle heuristics: h1 = misplaced tiles, h2 = total Manhattan distance. Both are optimal costs of relaxed problems, so both are admissible; h2 ≥ h1 everywhere, so h2 dominates h1 and A* with h2 expands fewer nodes. The maximum of admissible heuristics is admissible.',
						cite: informed([32, 37])
					},
					{
						text: 'In games, an evaluation function scores states at the depth cutoff, for example a weighted sum of features (chess material: pawn 1, knight 3, rook 5, queen 9).',
						cite: games(24)
					}
				],
				examples: [
					{
						slug: 'heuristics',
						state: { graph: ROMANIA },
						label: 'Heuristics: Romania',
						note: 'h against h* at every city, and the consistency check on every road'
					},
					{
						slug: 'heuristics',
						state: { graph: graphText(ASTAR_WRONG_PROBLEM) },
						label: 'Heuristics: A* gone wrong',
						note: 'admissible but not consistent at A → C'
					},
					{
						slug: 'eight-puzzle',
						state: { start: SLIDE_START },
						label: '8-puzzle: h1 and h2',
						note: 'h1(start) = 8, h2(start) = 18'
					}
				],
				questions: [
					{
						question: 'Are h1 and h2 admissible?',
						answer:
							'Yes. Every misplaced tile needs at least one move, and at least its Manhattan distance in moves. Each is the optimal cost of a relaxed 8-puzzle: tiles that move anywhere (h1) or to any adjacent square (h2).',
						cite: informed([32, 33])
					},
					{
						question: 'h2 dominates h1. Which one is better for search?',
						answer:
							'h2. A* expands every node with h(n) < C* − g(n), so with the smaller h1 it expands more nodes (at depth 12: 227 nodes with h1, 73 with h2).',
						cite: informed([35, 36])
					}
				],
				practice: { kind: 'heuristic' }
			},
			{
				id: 'search-pros-cons',
				letter: 'n',
				title: 'Be able to explain pros and cons of different methods',
				short: 'Pros and cons',
				facts: [
					{
						text: 'The strategy table of the slides (complete, optimal, time, space), and below it the trade-offs in a sentence each.',
						cite: informed(42)
					}
				],
				extra: 'pros-cons',
				examples: [
					{
						slug: 'strategies',
						state: { graph: ROMANIA, mode: 'graph' },
						label: 'Comparing search strategies',
						note: 'the properties table and the strategies run on one problem'
					}
				],
				practice: { kind: 'properties' }
			},
			{
				id: 'search-algorithms',
				letter: 'o',
				title: 'Know the individual algorithms and how they work',
				short: 'The algorithms',
				facts: [
					{
						text: 'Tree search: put the start state on the frontier; while the frontier is not empty, take a node off it as the strategy says, return the solution if it holds a goal state, else expand it and add its children to the frontier.',
						cite: searchDeck(28)
					},
					{
						text: 'Graph search adds two checks: every expanded state goes into the explored set and explored states never go back on the frontier; a child whose state is already on the frontier with a higher path cost replaces that node.',
						cite: searchDeck(36)
					},
					{
						text: 'The strategies differ only in which node comes off the frontier next (the table below).'
					}
				],
				extra: 'algorithms',
				examples: [
					{
						slug: 'search',
						state: { graph: ROMANIA, strategy: 'astar', mode: 'graph' },
						label: 'Tree and graph search',
						note: 'any strategy on Romania, the tiny problem, or a graph you type'
					}
				],
				practice: { kind: 'search', strategy: 'bfs' }
			},
			{
				id: 'search-definitions',
				letter: 'p',
				title: 'Definitions: admissible, complete, optimal, etc.',
				short: 'Definitions',
				facts: [],
				extra: 'glossary',
				examples: []
			}
		]
	},
	{
		id: 'readings',
		number: 4,
		title: 'Readings',
		items: [
			{
				id: 'readings-regulation',
				letter: 'a',
				title: 'AI regulation',
				facts: [],
				examples: [],
				note: 'Basic comprehension questions on the assigned reading. No lecture deck or tool covers it.'
			}
		]
	}
];

/** Every item id in sheet order (the checklist order). */
export const ITEM_ORDER: readonly string[] = SHEET.flatMap((s) => s.items.map((i) => i.id));

export const itemById = (id: string): SheetItem | undefined =>
	SHEET.flatMap((s) => s.items).find((i) => i.id === id);

export const sectionOf = (itemId: string): SheetSection | undefined =>
	SHEET.find((s) => s.items.some((i) => i.id === itemId));

/** Environment types (Rational Agents, slides 10–16): the question each one asks. */
export const ENVIRONMENT_TYPES: readonly Term[] = [
	{
		term: 'Fully vs. partially observable',
		meaning: 'Do the agent’s sensors give it access to the complete state of the environment?',
		cite: agents(10)
	},
	{
		term: 'Deterministic vs. stochastic',
		meaning:
			'Is the next state completely determined by the current state and the agent’s action? Strategic: deterministic except for the actions of other agents.',
		cite: agents(11)
	},
	{
		term: 'Episodic vs. sequential',
		meaning:
			'Is the agent’s experience divided into unconnected single decisions, or a coherent sequence of observations and actions in which the world evolves?',
		cite: agents(12)
	},
	{
		term: 'Static vs. dynamic',
		meaning:
			'Is the world changing while the agent is thinking? Semidynamic: the environment does not change with time, but the performance score does.',
		cite: agents(13)
	},
	{
		term: 'Discrete vs. continuous',
		meaning:
			'Are the values of the state variables discrete or continuous? Time can be either too.',
		cite: agents(14)
	},
	{
		term: 'Single agent vs. multi-agent',
		meaning: 'Is an agent operating by itself in the environment?',
		cite: agents(15)
	},
	{
		term: 'Known vs. unknown',
		meaning:
			'Are the rules of the environment (transition model and rewards) known to the agent? Strictly a property of the agent’s knowledge, not of the environment.',
		cite: agents(16)
	}
];

export interface AlgorithmRow {
	name: string;
	frontier: string;
	next: string;
	cite: Citation;
}

/** Which node each algorithm takes next. */
export const ALGORITHMS: readonly AlgorithmRow[] = [
	{
		name: 'Breadth-first',
		frontier: 'FIFO queue',
		next: 'The shallowest node',
		cite: uninformed(3)
	},
	{
		name: 'Depth-first',
		frontier: 'LIFO queue',
		next: 'The deepest node',
		cite: uninformed(5)
	},
	{
		name: 'Depth-limited',
		frontier: 'LIFO queue',
		next: 'The deepest node; nodes at depth ℓ are not expanded',
		cite: uninformed(33)
	},
	{
		name: 'Iterative deepening',
		frontier: 'LIFO queue',
		next: 'Depth-limited search with ℓ = 0, 1, 2, … until a goal is found',
		cite: uninformed(33)
	},
	{
		name: 'Uniform-cost',
		frontier: 'Priority queue by g(n)',
		next: 'The cheapest path so far',
		cite: uninformed(40)
	},
	{
		name: 'Greedy best-first',
		frontier: 'Priority queue by h(n)',
		next: 'The node that looks closest to the goal',
		cite: informed(7)
	},
	{
		name: 'A*',
		frontier: 'Priority queue by f(n) = g(n) + h(n)',
		next: 'The lowest estimated total cost',
		cite: informed(16)
	},
	{
		name: 'RBFS',
		frontier: 'Recursion stack (linear space)',
		next: 'The best child by f, while it stays within f_limit; otherwise back up its f-value',
		cite: informed(4)
	},
	{
		name: 'Minimax',
		frontier: 'Recursion (depth first)',
		next: 'Every child, left to right; back up max at MAX nodes and min at MIN nodes',
		cite: games(11)
	},
	{
		name: 'Alpha-beta',
		frontier: 'Recursion (depth first)',
		next: 'Children left to right until v ≥ β (MAX) or v ≤ α (MIN)',
		cite: games([21, 22])
	}
];

export interface ProsCons {
	name: string;
	pros: string;
	cons: string;
}

/** The trade-offs of each method, from the properties slides. */
export const PROS_CONS: readonly ProsCons[] = [
	{
		name: 'Breadth-first',
		pros: 'Complete (finite b); optimal when all step costs are equal.',
		cons: 'O(bᵈ) memory, the bigger problem; not optimal with varying step costs.'
	},
	{
		name: 'Depth-first',
		pros: 'Linear memory, O(bm); can be much faster than BFS when solutions are plentiful.',
		cons: 'Not complete (infinite depth, loops); not optimal; O(bᵐ) time when m ≫ d.'
	},
	{
		name: 'Depth-limited',
		pros: 'Cannot descend forever; linear memory, O(bℓ).',
		cons: 'Misses goals deeper than ℓ (incomplete when ℓ < d); not optimal.'
	},
	{
		name: 'Iterative deepening',
		pros: 'Complete and optimal for equal step costs, with O(bd) memory.',
		cons: 'Regenerates the shallow levels each iteration (a small overhead).'
	},
	{
		name: 'Uniform-cost',
		pros: 'Complete (step costs ≥ ε) and optimal for any step costs.',
		cons: 'Uses no information about the goal; O(b^(C*/ε)) can exceed O(bᵈ).'
	},
	{
		name: 'Greedy best-first',
		pros: 'Often reaches a goal quickly with a good heuristic.',
		cons: 'Not complete (loops); not optimal; O(bᵐ) in the worst case.'
	},
	{
		name: 'A*',
		pros: 'Complete; optimal with an admissible (tree) or consistent (graph) h; optimally efficient.',
		cons: 'Keeps every generated node: exponential memory.'
	},
	{
		name: 'RBFS',
		pros: 'Optimal with an admissible h, in linear memory.',
		cons: 'Regenerates nodes whenever the best path changes; time hard to predict.'
	},
	{
		name: 'Minimax',
		pros: 'Optimal against an optimal opponent.',
		cons: 'Searches the whole tree, O(bᵐ); real games need a depth cutoff and an evaluation function.'
	},
	{
		name: 'Alpha-beta',
		pros: 'The same decision as minimax with less search; O(b^(m/2)) with perfect ordering.',
		cons: 'The savings depend on move ordering.'
	}
];

/** Definitions for item 3p, grouped. */
export const GLOSSARY: readonly { group: string; terms: readonly Term[] }[] = [
	{
		group: 'Evaluating strategies',
		terms: [
			{
				term: 'Complete',
				meaning: 'Always finds a solution if one exists.',
				cite: uninformed(30)
			},
			{
				term: 'Optimal',
				meaning: 'Always finds a least-cost solution.',
				cite: uninformed(30)
			},
			{
				term: 'Time complexity',
				meaning: 'Number of nodes generated.',
				cite: uninformed(30)
			},
			{
				term: 'Space complexity',
				meaning: 'Maximum number of nodes in memory.',
				cite: uninformed(30)
			},
			{
				term: 'b, d, m',
				meaning:
					'Maximum branching factor of the search tree; depth of the optimal solution; maximum length of any path in the state space (may be infinite).',
				cite: uninformed(30)
			},
			{
				term: 'C*, ε',
				meaning: 'Cost of the optimal solution; a positive lower bound on step costs.',
				cite: uninformed(44)
			},
			{
				term: 'Optimally efficient',
				meaning:
					'No other algorithm of its kind using the same heuristic expands fewer nodes and is still guaranteed to find the optimal solution (A* among tree-based algorithms).',
				cite: informed(30)
			}
		]
	},
	{
		group: 'Heuristics',
		terms: [
			{
				term: 'Heuristic function h(n)',
				meaning: 'An estimate of the cost of reaching the goal from node n.',
				cite: informed(5)
			},
			{
				term: 'Evaluation function',
				meaning:
					'Ranks frontier nodes so the most promising is expanded (informed search); in games, scores a state at the depth cutoff instead of its minimax value.',
				cite: informed(4)
			},
			{
				term: 'Admissible',
				meaning: 'h(n) ≤ h*(n) for every node n: never overestimates the true cost to the goal.',
				cite: informed(25)
			},
			{
				term: 'Consistent',
				meaning:
					'h(n) ≤ c(n, n′) + h(n′) for every successor n′. Consistency implies admissibility.',
				cite: informed([28, 29])
			},
			{
				term: 'Dominates',
				meaning: 'h2 dominates h1 if both are admissible and h2(n) ≥ h1(n) for every n.',
				cite: informed(35)
			},
			{
				term: 'Relaxed problem',
				meaning:
					'The problem with fewer restrictions on the actions; its optimal solution cost is an admissible heuristic for the original.',
				cite: informed(33)
			}
		]
	},
	{
		group: 'Problems and trees',
		terms: [
			{
				term: 'State space',
				meaning: 'All states reachable from the initial state by any sequence of actions.',
				cite: searchDeck(7)
			},
			{
				term: 'Successor function',
				meaning: 'Captures the transition model: the states an action leads to from a state.',
				cite: searchDeck(14)
			},
			{
				term: 'Frontier',
				meaning: 'The list of unexpanded nodes.',
				cite: searchDeck(13)
			},
			{
				term: 'Node vs. state',
				meaning:
					'A state is a configuration of the world; a node is part of the search tree, with a parent and a path cost. Many nodes can hold the same state.',
				cite: searchDeck(27)
			},
			{
				term: 'Explored set',
				meaning: 'States already expanded, kept by graph search so they are not searched again.',
				cite: searchDeck(36)
			}
		]
	},
	{
		group: 'Games',
		terms: [
			{
				term: 'Zero-sum',
				meaning: 'The sum of the players’ utilities is the same constant in every outcome.',
				cite: games(4)
			},
			{
				term: 'Minimax value',
				meaning: 'The utility (for MAX) of a state, assuming perfect play on both sides.',
				cite: games(10)
			},
			{
				term: 'Ply',
				meaning: 'One move by one player; the slide 9 tree is a two-ply game.',
				cite: games(9)
			},
			{
				term: 'Horizon effect',
				meaning:
					'A state’s value is misjudged because an event just beyond the depth limit is overlooked.',
				cite: games(25)
			}
		]
	},
	{
		group: 'Agents',
		terms: [
			{
				term: 'Agent',
				meaning:
					'Anything that perceives its environment through sensors and acts on it through actuators.',
				cite: agents(2)
			},
			{
				term: 'Rational agent',
				meaning:
					'Selects the action expected to maximize its performance measure, given its percept sequence and built-in knowledge.',
				cite: agents(4)
			},
			{
				term: 'PEAS',
				meaning: 'Performance measure, environment, actuators, sensors.',
				cite: agents(6)
			}
		]
	}
];

/** Small Lisp forms with their values, for item 2a. */
export const LISP_FORMS: readonly { form: string; value: string }[] = [
	{ form: '(+ 1 (* 2 3))', value: '7' },
	{ form: "(car '(a b c))", value: 'A' },
	{ form: "(cdr '(a b c))", value: '(B C)' },
	{ form: "(cons 'a '(b c))", value: '(A B C)' },
	{ form: "(list 'a (+ 1 1) 'c)", value: '(A 2 C)' },
	{ form: "(append '(a b) '(c))", value: '(A B C)' },
	{ form: "(null '())", value: 'T' },
	{ form: "(if (> 3 2) 'yes 'no)", value: 'YES' },
	{ form: "(cond ((= 1 2) 'a) (t 'b))", value: 'B' },
	{ form: '(let ((x 2) (y 3)) (* x y))', value: '6' }
];

/** A recursive function traced call by call, for item 2a. */
export const LISP_TRACE = {
	code: `(defun my-length (l)
  (if (null l)
      0
      (+ 1 (my-length (cdr l)))))`,
	call: "(my-length '(a b c))",
	steps: [
		"(+ 1 (my-length '(b c)))",
		"(+ 1 (+ 1 (my-length '(c))))",
		"(+ 1 (+ 1 (+ 1 (my-length '()))))",
		'(+ 1 (+ 1 (+ 1 0)))',
		'3'
	]
} as const;

/** Basic recursive functions, for item 2b. */
export const LISP_PATTERNS: readonly {
	title: string;
	code: string;
	call: string;
	value: string;
}[] = [
	{
		title: 'Combine the first element with the rest',
		code: `(defun sum-list (l)
  (if (null l)
      0
      (+ (car l) (sum-list (cdr l)))))`,
		call: "(sum-list '(4 5 6))",
		value: '15'
	},
	{
		title: 'Build a new list',
		code: `(defun double-all (l)
  (if (null l)
      nil
      (cons (* 2 (car l)) (double-all (cdr l)))))`,
		call: "(double-all '(1 2 3))",
		value: '(2 4 6)'
	},
	{
		title: 'Keep some elements',
		code: `(defun evens (l)
  (cond ((null l) nil)
        ((evenp (car l)) (cons (car l) (evens (cdr l))))
        (t (evens (cdr l)))))`,
		call: "(evens '(1 2 3 4))",
		value: '(2 4)'
	},
	{
		title: 'Recurse into sublists',
		code: `(defun count-atoms (x)
  (cond ((null x) 0)
        ((atom x) 1)
        (t (+ (count-atoms (car x)) (count-atoms (cdr x))))))`,
		call: "(count-atoms '(a (b c) ((d))))",
		value: '4'
	}
];
