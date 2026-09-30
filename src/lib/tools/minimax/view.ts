/**
 * The minimax tool's runs and what the tree shows at each step.
 *
 * Values beside nodes follow slides 15–19: a node whose value is known shows
 * it ("3"); while alpha-beta searches a node, or after it prunes, the node
 * shows the bound its searched children give on its minimax value: "≥3" at a
 * MAX node, "≤2" at a MIN node. A bound comes from the children whose values
 * have been taken into v so far; children not searched yet (or pruned) could
 * be anything. Once every child is in, the value is exact (the third MIN node
 * of slide 19 shows 2, the pruned second one keeps ≤2).
 */
import type { GameTreeDisplay, NodeStatus, ValueLabel } from '$lib/components/games/types';
import { utilityText } from '$lib/components/games/game-tree-scene';
import {
	alphaBeta,
	maxN,
	minimax,
	perfectOrderingLeaves,
	playerAt,
	treeFacts,
	type AlphaBetaResult,
	type AlphaBetaStats,
	type AlphaBetaStep,
	type GameTree,
	type MaxNResult,
	type MaxNStep,
	type MinimaxResult,
	type MinimaxStep,
	type Ordering,
	type ValueFn
} from '$lib/theory/games';

export type Algorithm = 'minimax' | 'alphabeta';

export interface RunSettings {
	algorithm: Algorithm;
	ordering: Ordering;
	cutoff: number | null;
}

export type GameRun =
	| { kind: 'minimax'; result: MinimaxResult }
	| { kind: 'alphabeta'; result: AlphaBetaResult }
	| { kind: 'maxn'; result: MaxNResult };

export type GameStep = MinimaxStep | AlphaBetaStep | MaxNStep;

/** Runs the search the settings ask for; trees with tuple utilities back up tuples (slide 13). */
export function runGame(tree: GameTree, settings: RunSettings): GameRun {
	const { cutoff, ordering } = settings;
	if (tree.tuples) return { kind: 'maxn', result: maxN(tree, { cutoff }) };
	if (settings.algorithm === 'alphabeta')
		return { kind: 'alphabeta', result: alphaBeta(tree, { cutoff, ordering }) };
	return { kind: 'minimax', result: minimax(tree, { cutoff }) };
}

export function stepsOf(run: GameRun): readonly GameStep[] {
	return run.result.steps;
}

/** An open Max-Value / Min-Value call after a step. */
export interface CallFrame {
	node: number;
	fn: ValueFn;
	alpha: number;
	beta: number;
	v: number;
}

/** How far the search has got after a step. */
export interface Progress {
	/** Nodes whose value has been computed or whose call has started. */
	visited: number;
	/** Terminal utilities and evaluation values looked up. */
	evaluated: number;
	/** Child subtrees pruned. */
	pruned: number;
}

export interface StepView {
	display: GameTreeDisplay;
	/** Alpha-beta: open calls, the root first. */
	stack: CallFrame[];
	progress: Progress;
}

/** Counts up to and including step `last`. */
function progressAt(steps: readonly GameStep[], last: number): Progress {
	const p: Progress = { visited: 0, evaluated: 0, pruned: 0 };
	for (let k = 0; k <= last && k < steps.length; k++) {
		const s = steps[k];
		if (s.kind === 'leaf' || s.kind === 'eval') {
			p.visited++;
			p.evaluated++;
		} else if (s.kind === 'call' || s.kind === 'backup') p.visited++;
		else if (s.kind === 'prune') p.pruned += s.skipped.length;
	}
	return p;
}

/** Nodes below a node evaluated at the cutoff (drawn as not searched at every step). */
function beyondCutoff(tree: GameTree, steps: readonly GameStep[]): boolean[] {
	const beyond = new Array<boolean>(tree.nodes.length).fill(false);
	for (const s of steps) {
		if (s.kind !== 'eval') continue;
		const stack = [...tree.nodes[s.node].children];
		while (stack.length) {
			const id = stack.pop()!;
			beyond[id] = true;
			stack.push(...tree.nodes[id].children);
		}
	}
	return beyond;
}

/**
 * The bound on a node's minimax value given by its first `count` children
 * (whose values are known), the others unknown: [lo, hi].
 */
function interval(
	tree: GameTree,
	id: number,
	count: number,
	lo: readonly number[],
	hi: readonly number[]
): [number, number] {
	const n = tree.nodes[id];
	const max = playerAt(tree, n.depth) === 'max';
	let l = max ? -Infinity : Infinity;
	let h = max ? -Infinity : Infinity;
	for (let k = 0; k < count; k++) {
		const c = n.children[k];
		l = max ? Math.max(l, lo[c]) : Math.min(l, lo[c]);
		h = max ? Math.max(h, hi[c]) : Math.min(h, hi[c]);
	}
	if (count < n.children.length) {
		// Unknown children: anything from −∞ to +∞.
		if (max) h = Infinity;
		else l = -Infinity;
	}
	return [l, h];
}

/** "3" when exact; else "≥lo" at MAX nodes and "≤hi" at MIN nodes (the other bound if that one is open). */
export function boundLabel(max: boolean, lo: number, hi: number): ValueLabel | null {
	if (lo === hi) return { text: utilityText(lo), kind: 'exact' };
	const lower: ValueLabel | null =
		lo > -Infinity ? { text: `≥${utilityText(lo)}`, kind: 'lower' } : null;
	const upper: ValueLabel | null =
		hi < Infinity ? { text: `≤${utilityText(hi)}`, kind: 'upper' } : null;
	return max ? (lower ?? upper) : (upper ?? lower);
}

const EMPTY_CUT: ReadonlySet<number> = new Set();

/** The drawing and the call stack after step `index`. */
export function viewAt(run: GameRun, index: number): StepView {
	const tree = run.result.tree;
	const steps = stepsOf(run);
	const count = tree.nodes.length;
	const status: NodeStatus[] = new Array(count).fill('unvisited');
	const labels: (ValueLabel | null)[] = new Array(count).fill(null);
	const beyond = beyondCutoff(tree, steps);
	for (let i = 0; i < count; i++) if (beyond[i]) status[i] = 'beyond';
	const display: GameTreeDisplay & {
		status: NodeStatus[];
		labels: (ValueLabel | null)[];
	} = {
		status,
		labels,
		current: null,
		bounds: null,
		emphasis: null,
		cut: EMPTY_CUT,
		best: null
	};
	if (!steps.length) return { display, stack: [], progress: progressAt(steps, -1) };
	const last = Math.max(0, Math.min(Math.trunc(index), steps.length - 1));
	const step = steps[last];
	const progress = progressAt(steps, last);
	display.current = step.node;

	if (run.kind === 'alphabeta') {
		const stack = replayAlphaBeta(tree, steps as readonly AlphaBetaStep[], last, display);
		return { display, stack, progress };
	}

	for (let k = 0; k <= last; k++) {
		const s = steps[k] as MinimaxStep | MaxNStep;
		if (s.kind === 'leaf') status[s.node] = 'done';
		else if (s.kind === 'eval' || s.kind === 'backup') {
			status[s.node] = 'done';
			const value = s.value;
			labels[s.node] = {
				text: utilityText(value),
				kind: s.kind === 'eval' ? 'eval' : 'exact',
				...(typeof value === 'number' ? {} : { tuple: value })
			};
		}
	}
	// The recursion is inside every ancestor of the current node that is not done.
	for (let p: number | null = step.node; p !== null; p = tree.nodes[p].parent) {
		if (status[p] === 'unvisited') status[p] = 'open';
	}
	if (step.kind === 'backup') display.emphasis = { child: step.best, kind: 'chosen' };
	if (step.kind === 'decision') display.best = step.best;
	return { display, stack: [], progress };
}

function replayAlphaBeta(
	tree: GameTree,
	steps: readonly AlphaBetaStep[],
	last: number,
	display: GameTreeDisplay & { status: NodeStatus[]; labels: (ValueLabel | null)[] }
): CallFrame[] {
	const { status, labels } = display;
	const count = tree.nodes.length;
	const lo = new Array<number>(count).fill(-Infinity);
	const hi = new Array<number>(count).fill(Infinity);
	/** Children taken into v so far, per node. */
	const taken = new Array<number>(count).fill(0);
	const cut = new Set<number>();
	const stack: CallFrame[] = [];

	const prune = (id: number) => {
		const todo = [id];
		while (todo.length) {
			const k = todo.pop()!;
			if (status[k] !== 'beyond') status[k] = 'pruned';
			todo.push(...tree.nodes[k].children);
		}
	};

	for (let k = 0; k <= last; k++) {
		const s = steps[k];
		switch (s.kind) {
			case 'call':
				status[s.node] = 'open';
				stack.push({
					node: s.node,
					fn: s.fn,
					alpha: s.alpha,
					beta: s.beta,
					v: s.fn === 'max' ? -Infinity : Infinity
				});
				break;
			case 'leaf':
			case 'eval':
				status[s.node] = 'done';
				lo[s.node] = hi[s.node] = s.value;
				if (s.kind === 'eval') labels[s.node] = { text: utilityText(s.value), kind: 'eval' };
				break;
			case 'update': {
				taken[s.node]++;
				const top = stack[stack.length - 1];
				if (top?.node === s.node) top.v = s.v;
				break;
			}
			case 'bound': {
				const top = stack[stack.length - 1];
				if (top?.node === s.node) {
					top.alpha = s.alpha;
					top.beta = s.beta;
				}
				break;
			}
			case 'prune':
			case 'return': {
				if (s.kind === 'prune')
					for (const c of s.skipped) {
						cut.add(c);
						prune(c);
					}
				status[s.node] = 'done';
				const [l, h] = interval(tree, s.node, taken[s.node], lo, hi);
				lo[s.node] = l;
				hi[s.node] = h;
				if (stack[stack.length - 1]?.node === s.node) stack.pop();
				break;
			}
			default:
				break;
		}
	}

	// Value labels: finished internal nodes from their final bound, open ones from the
	// children taken into v so far.
	for (const n of tree.nodes) {
		if (!n.children.length || labels[n.id]) continue;
		const max = playerAt(tree, n.depth) === 'max';
		if (status[n.id] === 'done') labels[n.id] = boundLabel(max, lo[n.id], hi[n.id]);
		else if (status[n.id] === 'open') {
			const [l, h] = interval(tree, n.id, taken[n.id], lo, hi);
			labels[n.id] = boundLabel(max, l, h);
		}
	}

	const step = steps[last];
	display.cut = cut;
	switch (step.kind) {
		case 'call':
		case 'update':
		case 'bound':
		case 'prune':
		case 'return':
			display.bounds = { node: step.node, alpha: step.alpha, beta: step.beta };
			break;
		case 'leaf':
		case 'eval': {
			const parent = tree.nodes[step.node].parent;
			if (parent !== null) display.bounds = { node: parent, alpha: step.alpha, beta: step.beta };
			break;
		}
		default:
			break;
	}
	if (step.kind === 'update') display.emphasis = { child: step.child, kind: 'returned' };
	if (step.kind === 'decision') display.best = step.best;
	return stack.map((f) => ({ ...f }));
}

// ---------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------

export interface SearchCounts {
	/** Nodes whose value was computed (calls). */
	visited: number;
	/** Nodes a full minimax search visits. */
	total: number;
	/** Terminal utilities plus evaluation values used. */
	evaluated: number;
	/** Terminal and cut-off nodes a full minimax search evaluates. */
	positions: number;
	/** Child subtrees pruned. */
	pruned: number;
}

export interface CountsTable {
	minimax: SearchCounts;
	orderings: { ordering: Ordering; counts: SearchCounts }[];
	/** Uniform trees (to the cutoff): b, d, and the leaf counts bᵈ and b^⌈d/2⌉ + b^⌊d/2⌋ − 1. */
	uniform: { b: number; d: number; all: number; perfect: number } | null;
}

const abCounts = (s: AlphaBetaStats): SearchCounts => ({
	visited: s.visited,
	total: s.total,
	evaluated: s.leaves + s.evals,
	positions: s.leaves + s.evals + s.prunedLeaves,
	pruned: s.pruned
});

/** Plain minimax next to alpha-beta with each move ordering (two-player trees). */
export function countsTable(tree: GameTree, cutoff: number | null): CountsTable | null {
	if (tree.tuples) return null;
	const mm = minimax(tree, { cutoff });
	const orderings = (['given', 'best-first', 'worst-first'] as const).map((ordering) => ({
		ordering,
		counts: abCounts(alphaBeta(tree, { cutoff, ordering }).stats)
	}));
	const facts = treeFacts(tree);
	let uniform: CountsTable['uniform'] = null;
	if (facts.uniform) {
		const b = facts.uniform.b;
		const d =
			cutoff !== null && mm.stats.evals > 0 ? Math.min(cutoff, facts.uniform.d) : facts.uniform.d;
		uniform = { b, d, all: b ** d, perfect: perfectOrderingLeaves(b, d) };
	}
	return {
		minimax: {
			visited: mm.stats.visited,
			total: mm.stats.total,
			evaluated: mm.stats.leaves + mm.stats.evals,
			positions: mm.stats.leaves + mm.stats.evals,
			pruned: 0
		},
		orderings,
		uniform
	};
}

/** Counts of one run, for the stats panel. */
export function runCounts(run: GameRun): SearchCounts {
	if (run.kind === 'alphabeta') return abCounts(run.result.stats);
	const s = run.result.stats;
	const evaluated = s.leaves + s.evals;
	return { visited: s.visited, total: s.total, evaluated, positions: evaluated, pruned: 0 };
}
