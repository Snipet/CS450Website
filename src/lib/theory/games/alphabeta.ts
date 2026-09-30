/**
 * Alpha-beta pruning, exactly as the pseudocode of Games and Adversarial
 * Search, slides 21–22:
 *
 * ```
 * Function action = Alpha-Beta-Search(node)
 *   v = Max-Value(node, −∞, ∞)          (Min-Value when MIN is at the root)
 *   return the action from node with value v
 *
 * Function v = Max-Value(node, α, β)     Function v = Min-Value(node, α, β)
 *   if Terminal(node) return Utility(node) if Terminal(node) return Utility(node)
 *   v = −∞                                 v = +∞
 *   for each action from node              for each action from node
 *     v = Max(v, Min-Value(Succ, α, β))      v = Min(v, Max-Value(Succ, α, β))
 *     if v ≥ β return v                      if v ≤ α return v
 *     α = Max(α, v)                          β = Min(β, v)
 *   end for                                end for
 *   return v                               return v
 * ```
 *
 * α is the best alternative available to the MAX player, β the best
 * alternative available to the MIN player. With a depth cutoff (slide 24),
 * internal nodes at the cutoff depth return their evaluation value. The
 * children of every node can be searched in the given order, best first
 * (perfect ordering, slide 23), or worst first; the result's `tree` is the
 * tree as searched, with children in that order.
 *
 * The trace has a step for the start, every call of an internal node
 * (node, α, β), every terminal utility or evaluation value, every update of
 * v, every update of α or β, every prune (with the children skipped), every
 * return at the end of the loop, and the decision at the root.
 */
import type { Diagnostic } from '../diagnostics';
import { cutoffCheck, minimax, normalizeCutoff } from './minimax';
import { nodeName, playerAt, reorderTree, type GameNode, type GameTree } from './tree';

export type Ordering = 'given' | 'best-first' | 'worst-first';
export const ORDERINGS: readonly Ordering[] = ['given', 'best-first', 'worst-first'];

/** Max-Value or Min-Value. */
export type ValueFn = 'max' | 'min';

export interface AlphaBetaOptions {
	cutoff?: number | null;
	ordering?: Ordering;
}

/** α and β of the running call after the step. */
interface Window {
	alpha: number;
	beta: number;
}

export type AlphaBetaStep =
	| { kind: 'start'; node: number; fn: ValueFn }
	/** An internal node's call: `v = −∞` (Max-Value) or `v = +∞` (Min-Value). */
	| ({ kind: 'call'; node: number; fn: ValueFn } & Window)
	/** A terminal node's call: return Utility(node). */
	| ({ kind: 'leaf'; node: number; fn: ValueFn; value: number } & Window)
	/** A node at the cutoff depth: return Eval(node). */
	| ({ kind: 'eval'; node: number; fn: ValueFn; value: number } & Window)
	/** `v = Max(v, …)` or `v = Min(v, …)` after the child `child` returned `childValue`. */
	| ({
			kind: 'update';
			node: number;
			fn: ValueFn;
			child: number;
			childValue: number;
			before: number;
			v: number;
	  } & Window)
	/** `if v ≥ β return v` (or `v ≤ α`) fired; `skipped` are the children never searched. */
	| ({ kind: 'prune'; node: number; fn: ValueFn; v: number; skipped: number[] } & Window)
	/** `α = Max(α, v)` or `β = Min(β, v)`. */
	| ({
			kind: 'bound';
			node: number;
			fn: ValueFn;
			which: 'alpha' | 'beta';
			before: number;
			v: number;
	  } & Window)
	/** `return v` after the loop. */
	| ({ kind: 'return'; node: number; fn: ValueFn; v: number } & Window)
	/** Alpha-Beta-Search returns the action from the root with value v. */
	| { kind: 'decision'; node: number; value: number; best: number | null };

export interface AlphaBetaStats {
	/** Calls of Max-Value or Min-Value (nodes visited). */
	visited: number;
	/** Nodes a full minimax search visits (down to the cutoff). */
	total: number;
	/** Terminal utilities looked up. */
	leaves: number;
	/** Evaluation values used at the cutoff. */
	evals: number;
	/** Prunes that skipped at least one child. */
	prunes: number;
	/** Child subtrees skipped. */
	pruned: number;
	/** Nodes in the skipped subtrees (down to the cutoff). */
	prunedNodes: number;
	/** Terminal and cut-off nodes in the skipped subtrees. */
	prunedLeaves: number;
}

export interface AlphaBetaResult {
	/** The tree as searched (children reordered for 'best-first' and 'worst-first'). */
	tree: GameTree;
	/** For each node of `tree`, its id in the tree that was passed in. */
	source: number[];
	ordering: Ordering;
	cutoff: number | null;
	/** Value returned by each call (null for nodes never visited). */
	returned: (number | null)[];
	/** α and β each node was called with (null for nodes never visited). */
	window: ({ alpha: number; beta: number } | null)[];
	/** Value of the root: its minimax value. */
	value: number | null;
	best: number | null;
	bestAction: string | null;
	steps: AlphaBetaStep[];
	stats: AlphaBetaStats;
	diagnostics: Diagnostic[];
}

/** Leaves alpha-beta evaluates with perfect ordering on a uniform tree: b^⌈d/2⌉ + b^⌊d/2⌋ − 1. */
export function perfectOrderingLeaves(b: number, d: number): number {
	return b ** Math.ceil(d / 2) + b ** Math.floor(d / 2) - 1;
}

/** The tree with each node's children sorted by their minimax value for the player to move. */
export function orderedTree(
	tree: GameTree,
	ordering: Ordering,
	cutoff: number | null = null
): { tree: GameTree; source: number[] } {
	if (ordering === 'given' || tree.tuples) return { tree, source: tree.nodes.map((n) => n.id) };
	const { values } = minimax(tree, { cutoff });
	const worst = ordering === 'worst-first';
	return reorderTree(tree, (n: GameNode) => {
		const best = playerAt(tree, n.depth) === 'max' ? -1 : 1;
		const sign = worst ? -best : best;
		// Array.prototype.sort is stable: ties keep the given order.
		return [...n.children].sort((a, b) => {
			const va = values[a];
			const vb = values[b];
			return va === null || vb === null ? 0 : sign * (va - vb);
		});
	});
}

export function alphaBeta(input: GameTree, options: AlphaBetaOptions = {}): AlphaBetaResult {
	const diagnostics: Diagnostic[] = [];
	const cutoff = normalizeCutoff(options.cutoff, diagnostics);
	const ordering = options.ordering ?? 'given';
	const { tree, source } = orderedTree(input, ordering, cutoff);
	const count = tree.nodes.length;
	const returned: (number | null)[] = new Array(count).fill(null);
	const window: ({ alpha: number; beta: number } | null)[] = new Array(count).fill(null);
	const steps: AlphaBetaStep[] = [];
	const stats: AlphaBetaStats = {
		visited: 0,
		total: 0,
		leaves: 0,
		evals: 0,
		prunes: 0,
		pruned: 0,
		prunedNodes: 0,
		prunedLeaves: 0
	};
	const result = (value: number | null, best: number | null): AlphaBetaResult => ({
		tree,
		source,
		ordering,
		cutoff,
		returned,
		window,
		value,
		best,
		bestAction: best === null ? null : tree.nodes[best].action,
		steps,
		stats,
		diagnostics
	});
	if (tree.tuples) {
		diagnostics.push({
			severity: 'error',
			message:
				'The utilities are tuples (a game with more than two players): alpha-beta pruning needs one utility for MAX per terminal node.'
		});
		return result(null, null);
	}
	if (!count) return result(null, null);

	const { isCut, report } = cutoffCheck(tree, cutoff);

	/** Counts the nodes of a skipped subtree, not going below the cutoff. */
	const countSkipped = (id: number) => {
		const stack = [id];
		while (stack.length) {
			const k = stack.pop()!;
			stats.prunedNodes++;
			const n = tree.nodes[k];
			if (!n.children.length || isCut(k, false)) stats.prunedLeaves++;
			else stack.push(...n.children);
		}
	};

	let rootBest: number | null = null;

	const call = (id: number, fn: ValueFn, alpha: number, beta: number): number => {
		const n = tree.nodes[id];
		stats.visited++;
		window[id] = { alpha, beta };
		if (!n.children.length) {
			const value = n.utility as number;
			stats.leaves++;
			steps.push({ kind: 'leaf', node: id, fn, value, alpha, beta });
			return (returned[id] = value);
		}
		if (isCut(id)) {
			const value = n.eval as number;
			stats.evals++;
			steps.push({ kind: 'eval', node: id, fn, value, alpha, beta });
			return (returned[id] = value);
		}
		const max = fn === 'max';
		let v = max ? -Infinity : Infinity;
		steps.push({ kind: 'call', node: id, fn, alpha, beta });
		for (let k = 0; k < n.children.length; k++) {
			const c = n.children[k];
			const cv = call(c, max ? 'min' : 'max', alpha, beta);
			const before = v;
			v = max ? Math.max(v, cv) : Math.min(v, cv);
			if (id === 0 && v !== before) rootBest = c;
			steps.push({
				kind: 'update',
				node: id,
				fn,
				child: c,
				childValue: cv,
				before,
				v,
				alpha,
				beta
			});
			if (max ? v >= beta : v <= alpha) {
				const skipped = n.children.slice(k + 1);
				if (skipped.length) {
					stats.prunes++;
					stats.pruned += skipped.length;
					for (const s of skipped) countSkipped(s);
				}
				steps.push({ kind: 'prune', node: id, fn, v, skipped, alpha, beta });
				return (returned[id] = v);
			}
			if (max) {
				const prev = alpha;
				alpha = Math.max(alpha, v);
				steps.push({ kind: 'bound', node: id, fn, which: 'alpha', before: prev, v, alpha, beta });
			} else {
				const prev = beta;
				beta = Math.min(beta, v);
				steps.push({ kind: 'bound', node: id, fn, which: 'beta', before: prev, v, alpha, beta });
			}
		}
		steps.push({ kind: 'return', node: id, fn, v, alpha, beta });
		return (returned[id] = v);
	};

	const rootFn: ValueFn = tree.root;
	steps.push({ kind: 'start', node: 0, fn: rootFn });
	const value = call(0, rootFn, -Infinity, Infinity);
	steps.push({ kind: 'decision', node: 0, value, best: rootBest });
	stats.total = stats.visited + stats.prunedNodes;
	report(diagnostics);
	return result(value, rootBest);
}

/** "Max-Value" or "Min-Value". */
export const fnName = (fn: ValueFn): string => (fn === 'max' ? 'Max-Value' : 'Min-Value');

/** Names of nodes, for messages: "A22 and A23". */
export function listNames(tree: GameTree, ids: readonly number[]): string {
	const names = ids.map((id) => nodeName(tree, id));
	if (names.length <= 1) return names.join('');
	if (names.length === 2) return `${names[0]} and ${names[1]}`;
	return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}
