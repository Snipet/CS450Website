/**
 * Backing up utility tuples in games with more than two players (Games and
 * Adversarial Search, slide 13): utilities are tuples, one entry per player;
 * the player to move at each level picks the child whose tuple is largest in
 * its own entry (ties go to the leftmost child), and that tuple is propagated
 * (backed up) to the parent. Players move one level each, cycling through
 * `order`; on the slide the root is player 1, the next level player 3, the
 * level above the terminal nodes player 2 (order 1, 3, 2).
 */
import type { Diagnostic } from '../diagnostics';
import { cutoffCheck, normalizeCutoff } from './minimax';
import { playerAtDepth, playerOrder, type GameTree } from './tree';

export type Tuple = readonly number[];

export interface MaxNOptions {
	/** Player (numbered from 1) to move at depth 0, 1, 2, …, cycling. Default: the tree's order. */
	order?: readonly number[];
	cutoff?: number | null;
}

export type MaxNStep =
	| { kind: 'start'; node: number; player: number }
	| { kind: 'leaf'; node: number; value: Tuple }
	| { kind: 'eval'; node: number; value: Tuple }
	/** `player` picked `best`, whose tuple has the largest entry for that player. */
	| { kind: 'backup'; node: number; player: number; value: Tuple; best: number }
	| { kind: 'decision'; node: number; player: number; value: Tuple; best: number | null };

export interface MaxNResult {
	tree: GameTree;
	order: number[];
	cutoff: number | null;
	/** Backed-up tuple of each node (null below the cutoff). */
	values: (Tuple | null)[];
	choice: (number | null)[];
	value: Tuple | null;
	best: number | null;
	bestAction: string | null;
	steps: MaxNStep[];
	stats: { visited: number; leaves: number; evals: number; total: number };
	diagnostics: Diagnostic[];
}

/** Checks a player order against the number of players; null when it is unusable. */
export function checkOrder(
	order: readonly number[],
	players: number,
	diagnostics: Diagnostic[]
): number[] | null {
	if (!order.length) {
		diagnostics.push({ severity: 'error', message: 'The player order is empty.' });
		return null;
	}
	const bad = order.find((p) => !Number.isInteger(p) || p < 1 || p > players);
	if (bad !== undefined) {
		diagnostics.push({
			severity: 'error',
			message: `Player ${bad} does not exist: players are numbered 1 to ${players}.`
		});
		return null;
	}
	return [...order];
}

export function maxN(tree: GameTree, options: MaxNOptions = {}): MaxNResult {
	const diagnostics: Diagnostic[] = [];
	const cutoff = normalizeCutoff(options.cutoff, diagnostics);
	const count = tree.nodes.length;
	const values: (Tuple | null)[] = new Array(count).fill(null);
	const choice: (number | null)[] = new Array(count).fill(null);
	const steps: MaxNStep[] = [];
	const stats = { visited: 0, leaves: 0, evals: 0, total: 0 };
	const fallback = playerOrder(tree);
	const empty = (order: number[]): MaxNResult => ({
		tree,
		order,
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
	if (!tree.tuples) {
		diagnostics.push({
			severity: 'error',
			message:
				'The utilities are numbers (a two-player zero-sum game): use minimax or alpha-beta pruning.'
		});
		return empty(fallback);
	}
	const order = checkOrder(options.order ?? fallback, tree.players, diagnostics);
	if (!order || !count) return empty(order ?? fallback);

	const { isCut, report } = cutoffCheck(tree, cutoff);
	steps.push({ kind: 'start', node: 0, player: playerAtDepth(order, 0) });

	const visit = (id: number): Tuple => {
		const n = tree.nodes[id];
		stats.visited++;
		if (!n.children.length) {
			const v = n.utility as Tuple;
			stats.leaves++;
			steps.push({ kind: 'leaf', node: id, value: v });
			return (values[id] = v);
		}
		if (isCut(id)) {
			const v = n.eval as Tuple;
			stats.evals++;
			steps.push({ kind: 'eval', node: id, value: v });
			return (values[id] = v);
		}
		const player = playerAtDepth(order, n.depth);
		const k = player - 1;
		let best = n.children[0];
		let v: Tuple | null = null;
		for (const c of n.children) {
			const cv = visit(c);
			if (v === null || cv[k] > v[k]) {
				v = cv;
				best = c;
			}
		}
		choice[id] = best;
		steps.push({ kind: 'backup', node: id, player, value: v!, best });
		return (values[id] = v!);
	};

	const value = visit(0);
	const best = choice[0];
	steps.push({ kind: 'decision', node: 0, player: playerAtDepth(order, 0), value, best });
	stats.total = stats.visited;
	report(diagnostics);
	return {
		tree,
		order,
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
