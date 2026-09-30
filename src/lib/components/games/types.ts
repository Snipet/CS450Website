/**
 * What a game tree drawing shows at one step of a search. Tools compute it
 * from their traces; `GameTree.svelte` renders it.
 */

/**
 * - `unvisited`: not reached yet.
 * - `open`: being searched (its call has not returned).
 * - `done`: its value is known (terminal utility, evaluation, or backed up).
 * - `pruned`: in a subtree alpha-beta skipped.
 * - `beyond`: below a node evaluated at the depth cutoff.
 */
export type NodeStatus = 'unvisited' | 'open' | 'done' | 'pruned' | 'beyond';

export interface ValueLabel {
	/** "3", "≥3", "≤2", or a tuple "4,3,2". */
	text: string;
	/** Exact value, lower bound (≥), upper bound (≤), or an evaluation value at the cutoff. */
	kind: 'exact' | 'lower' | 'upper' | 'eval';
	/** Multi-player trees: the tuple, drawn one color per player. */
	tuple?: readonly number[];
}

export interface GameTreeDisplay {
	status: readonly NodeStatus[];
	/** Value beside each node (null: nothing shown). Terminal utilities are always drawn. */
	labels: readonly (ValueLabel | null)[];
	/** The node of the current step. */
	current: number | null;
	/** α and β of the call being processed, drawn beside its node. */
	bounds: { node: number; alpha: number; beta: number } | null;
	/** An edge to emphasize, by its child: a value just returned, or the child a value came from. */
	emphasis: { child: number; kind: 'returned' | 'chosen' } | null;
	/** Children whose edges were pruned (crossed out). */
	cut: ReadonlySet<number>;
	/** The root's best child, once the search has decided. */
	best: number | null;
}

/** "+∞", "−∞", or the number. */
export function formatBound(n: number): string {
	if (n === Infinity) return '+∞';
	if (n === -Infinity) return '−∞';
	return String(n === 0 ? 0 : n);
}
