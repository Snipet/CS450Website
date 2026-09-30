/**
 * Minimax (Games and Adversarial Search, slides 10–11):
 *
 * ```
 * Minimax(node) = Utility(node)                              if node is terminal
 *                 max_action Minimax(Succ(node, action))     if player = MAX
 *                 min_action Minimax(Succ(node, action))     if player = MIN
 * ```
 *
 * Nodes are visited depth first, left to right. With a depth cutoff d
 * (slide 24), internal nodes at depth d take their evaluation value instead
 * of their minimax value. The trace has a step for the start, each terminal
 * utility or evaluation value, each backed-up value, and the decision at the
 * root (the action with the best worst-case payoff; ties go to the leftmost
 * action).
 */
import type { Diagnostic } from '../diagnostics';
import { nodeName, playerAt, type GameTree, type Player } from './tree';

export interface MinimaxOptions {
	/** Depth at which internal nodes are evaluated instead of searched (≥ 1); null or left out: none. */
	cutoff?: number | null;
}

export type MinimaxStep =
	| { kind: 'start'; node: number; player: Player }
	/** A terminal node: Minimax = Utility. */
	| { kind: 'leaf'; node: number; value: number }
	/** A node at the cutoff depth: its evaluation value. */
	| { kind: 'eval'; node: number; value: number }
	/** An internal node's value backed up from its children; `best` is the child it comes from. */
	| { kind: 'backup'; node: number; player: Player; value: number; best: number }
	/** The minimax decision at the root. */
	| { kind: 'decision'; node: number; value: number; best: number | null };

export interface MinimaxStats {
	/** Nodes whose value was computed. */
	visited: number;
	/** Terminal utilities looked up. */
	leaves: number;
	/** Evaluation values used at the cutoff. */
	evals: number;
	/** Nodes in the tree down to the cutoff (minimax visits them all). */
	total: number;
}

export interface MinimaxResult {
	tree: GameTree;
	cutoff: number | null;
	/** Minimax value of each node (null below the cutoff). */
	values: (number | null)[];
	/** The child each internal node's value comes from (leftmost on ties; null for leaves and cut-off nodes). */
	choice: (number | null)[];
	/** Value of the root. */
	value: number | null;
	/** The root's best child and its action. */
	best: number | null;
	bestAction: string | null;
	steps: MinimaxStep[];
	stats: MinimaxStats;
	diagnostics: Diagnostic[];
}

/** A cutoff option made valid: a whole number ≥ 1, or null. Reports bad values. */
export function normalizeCutoff(
	cutoff: number | null | undefined,
	diagnostics: Diagnostic[]
): number | null {
	if (cutoff === null || cutoff === undefined) return null;
	if (!Number.isInteger(cutoff) || cutoff < 1) {
		diagnostics.push({
			severity: 'error',
			message: `The depth cutoff must be a whole number of at least 1 (got ${cutoff}); searching without one.`
		});
		return null;
	}
	return cutoff;
}

/**
 * Whether a node is evaluated at the cutoff rather than searched. Nodes at the
 * cutoff depth without an evaluation value are searched (and reported once).
 */
export function cutoffCheck(tree: GameTree, cutoff: number | null) {
	const missing: number[] = [];
	/** `track`: remember a missing evaluation value for the report (nodes that are searched). */
	const isCut = (id: number, track = true): boolean => {
		const n = tree.nodes[id];
		if (cutoff === null || n.depth !== cutoff || !n.children.length) return false;
		if (n.eval === null) {
			if (track) missing.push(id);
			return false;
		}
		return true;
	};
	const report = (diagnostics: Diagnostic[]) => {
		if (!missing.length) return;
		const names = missing.slice(0, 6).map((id) => nodeName(tree, id));
		const more = missing.length > 6 ? ` and ${missing.length - 6} more` : '';
		diagnostics.push({
			severity: 'warning',
			message: `No evaluation value at the cutoff depth ${cutoff} for ${names.join(', ')}${more}; ${
				missing.length === 1 ? 'that node is' : 'those nodes are'
			} searched to the end instead.`
		});
	};
	return { isCut, report };
}

export function minimax(tree: GameTree, options: MinimaxOptions = {}): MinimaxResult {
	const diagnostics: Diagnostic[] = [];
	const cutoff = normalizeCutoff(options.cutoff, diagnostics);
	const count = tree.nodes.length;
	const values: (number | null)[] = new Array(count).fill(null);
	const choice: (number | null)[] = new Array(count).fill(null);
	const steps: MinimaxStep[] = [];
	const stats: MinimaxStats = { visited: 0, leaves: 0, evals: 0, total: 0 };
	const empty = (): MinimaxResult => ({
		tree,
		cutoff,
		values,
		choice,
		value: null,
		best: null,
		bestAction: null,
		steps,
		stats,
		diagnostics
	});
	if (tree.tuples) {
		diagnostics.push({
			severity: 'error',
			message:
				'The utilities are tuples (a game with more than two players): back them up with maxN, not minimax.'
		});
		return empty();
	}
	if (!count) return empty();

	const { isCut, report } = cutoffCheck(tree, cutoff);
	steps.push({ kind: 'start', node: 0, player: tree.root });

	const visit = (id: number): number => {
		const n = tree.nodes[id];
		stats.visited++;
		if (!n.children.length) {
			const v = n.utility as number;
			stats.leaves++;
			steps.push({ kind: 'leaf', node: id, value: v });
			return (values[id] = v);
		}
		if (isCut(id)) {
			const v = n.eval as number;
			stats.evals++;
			steps.push({ kind: 'eval', node: id, value: v });
			return (values[id] = v);
		}
		const player = playerAt(tree, n.depth);
		let best = n.children[0];
		let v = player === 'max' ? -Infinity : Infinity;
		for (const c of n.children) {
			const cv = visit(c);
			if (player === 'max' ? cv > v : cv < v) {
				v = cv;
				best = c;
			}
		}
		choice[id] = best;
		steps.push({ kind: 'backup', node: id, player, value: v, best });
		return (values[id] = v);
	};

	const value = visit(0);
	const best = choice[0];
	steps.push({ kind: 'decision', node: 0, value, best });
	stats.total = stats.visited;
	report(diagnostics);
	return {
		tree,
		cutoff,
		values,
		choice,
		value,
		best,
		bestAction: best === null ? null : tree.nodes[best].action,
		steps,
		stats,
		diagnostics
	};
}

/** The children of `node` from best to worst for the player to move there (stable). */
export function rankChildren(
	tree: GameTree,
	values: readonly (number | null)[],
	node: number
): number[] {
	const n = tree.nodes[node];
	const sign = playerAt(tree, n.depth) === 'max' ? -1 : 1;
	return [...n.children].sort((a, b) => {
		const va = values[a];
		const vb = values[b];
		if (va === null || vb === null) return 0;
		return sign * (va - vb);
	});
}
