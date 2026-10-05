/**
 * Game tree practice: a random two-player tree (Games and Adversarial
 * Search, slides 9–23) with MAX at the root, its minimax value and decision,
 * and the leaves alpha-beta never looks up, computed with the games engine.
 * The drawings are the final states of the searches: every minimax value, or
 * what alpha-beta knows when it returns (exact values and ≥/≤ bounds, pruned
 * edges crossed out), as the minimax tool shows at its last step.
 */
import type { GameTreeDisplay, NodeStatus, ValueLabel } from '$lib/components/games/types';
import {
	alphaBeta,
	formatGameTree,
	minimax,
	playerAt,
	randomGameTree,
	type AlphaBetaResult,
	type GameTree,
	type MinimaxResult
} from '$lib/theory/games';

export type GameSize = 'b3d2' | 'b2d3' | 'b3d3' | 'b2d4';

export const GAME_SIZES: readonly {
	id: GameSize;
	label: string;
	branching: number;
	depth: number;
}[] = [
	{ id: 'b3d2', label: '2 ply, b = 3', branching: 3, depth: 2 },
	{ id: 'b2d3', label: '3 ply, b = 2', branching: 2, depth: 3 },
	{ id: 'b3d3', label: '3 ply, b = 3', branching: 3, depth: 3 },
	{ id: 'b2d4', label: '4 ply, b = 2', branching: 2, depth: 4 }
];

export interface LeafInfo {
	id: number;
	/** Action label of the edge into the leaf ("A121"). */
	action: string;
	utility: number;
	/** Alpha-beta never looks the leaf up. */
	pruned: boolean;
}

export interface GameDrill {
	seed: number;
	size: GameSize;
	tree: GameTree;
	/** The tree as text (formatGameTree), for a link to the minimax tool. */
	text: string;
	minimax: MinimaxResult;
	alphaBeta: AlphaBetaResult;
	value: number;
	/** Root actions, left to right. */
	moves: string[];
	/** The decision: the leftmost root move with the minimax value. */
	bestAction: string;
	/** Every root move with the minimax value (any of them is a right answer). */
	bestMoves: string[];
	leaves: LeafInfo[];
}

/** Trees tried per seed until alpha-beta prunes at least one leaf. */
const ATTEMPTS = 50;

/** A drill for a seed and size: utilities 0–20, at least one leaf pruned when some seed allows it. */
export function gameDrill(seed: number, size: GameSize): GameDrill {
	const shape = GAME_SIZES.find((s) => s.id === size) ?? GAME_SIZES[1];
	let tree: GameTree | null = null;
	let ab: AlphaBetaResult | null = null;
	for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
		tree = randomGameTree({
			branching: shape.branching,
			depth: shape.depth,
			seed: seed * 1009 + attempt,
			min: 0,
			max: 20
		});
		ab = alphaBeta(tree);
		if (ab.stats.prunedLeaves > 0) break;
	}
	const t = tree!;
	const a = ab!;
	const mm = minimax(t);
	const visited = new Set(a.returned.flatMap((v, id) => (v === null ? [] : [id])));
	const leaves = t.nodes
		.filter((n) => n.children.length === 0)
		.map((n) => ({
			id: n.id,
			action: n.action ?? '',
			utility: n.utility as number,
			pruned: !visited.has(n.id)
		}));
	const root = t.nodes[0];
	return {
		seed,
		size: shape.id,
		tree: t,
		text: formatGameTree(t),
		minimax: mm,
		alphaBeta: a,
		value: mm.value!,
		moves: root.children.map((c) => t.nodes[c].action ?? ''),
		bestAction: mm.bestAction ?? '',
		bestMoves: root.children
			.filter((c) => mm.values[c] === mm.value)
			.map((c) => t.nodes[c].action ?? ''),
		leaves
	};
}

const EMPTY: ReadonlySet<number> = new Set();

/** The tree before any search: terminal utilities only. */
export function blankDisplay(tree: GameTree): GameTreeDisplay {
	return {
		status: new Array<NodeStatus>(tree.nodes.length).fill('unvisited'),
		labels: new Array<ValueLabel | null>(tree.nodes.length).fill(null),
		current: null,
		bounds: null,
		emphasis: null,
		cut: EMPTY,
		best: null
	};
}

/** Every node with its minimax value and the root's decision. */
export function minimaxDisplay(result: MinimaxResult): GameTreeDisplay {
	const { tree, values } = result;
	return {
		status: tree.nodes.map(() => 'done' as const),
		labels: tree.nodes.map((n) =>
			n.children.length === 0 || values[n.id] === null
				? null
				: { text: String(values[n.id]), kind: 'exact' as const }
		),
		current: null,
		bounds: null,
		emphasis: null,
		cut: EMPTY,
		best: result.best
	};
}

/** "3" when exact; else "≥lo" at MAX nodes and "≤hi" at MIN nodes (the other bound if that one is open). */
function boundLabel(max: boolean, lo: number, hi: number): ValueLabel | null {
	if (lo === hi) return { text: String(lo), kind: 'exact' };
	const lower: ValueLabel | null = lo > -Infinity ? { text: `≥${lo}`, kind: 'lower' } : null;
	const upper: ValueLabel | null = hi < Infinity ? { text: `≤${hi}`, kind: 'upper' } : null;
	return max ? (lower ?? upper) : (upper ?? lower);
}

/**
 * What alpha-beta knows when it returns: searched nodes are done, skipped
 * subtrees pruned (their edges crossed out), and each searched node shows the
 * bound its searched children give on its minimax value (exact once every
 * child is in; slides 15–19).
 */
export function alphaBetaDisplay(result: AlphaBetaResult): GameTreeDisplay {
	const { tree, returned } = result;
	const count = tree.nodes.length;
	const status: NodeStatus[] = tree.nodes.map((n) => (returned[n.id] === null ? 'pruned' : 'done'));
	const lo = new Array<number>(count).fill(-Infinity);
	const hi = new Array<number>(count).fill(Infinity);
	const labels: (ValueLabel | null)[] = new Array(count).fill(null);
	const cut = new Set<number>();
	// Children come after their parent in preorder, so a reverse pass sees children first.
	for (let id = count - 1; id >= 0; id--) {
		const n = tree.nodes[id];
		if (returned[id] === null) continue;
		if (n.children.length === 0) {
			lo[id] = hi[id] = n.utility as number;
			continue;
		}
		const max = playerAt(tree, n.depth) === 'max';
		let l = max ? -Infinity : Infinity;
		let h = l;
		let searched = 0;
		for (const c of n.children) {
			if (returned[c] === null) {
				cut.add(c);
				continue;
			}
			searched++;
			l = max ? Math.max(l, lo[c]) : Math.min(l, lo[c]);
			h = max ? Math.max(h, hi[c]) : Math.min(h, hi[c]);
		}
		if (searched < n.children.length) {
			if (max) h = Infinity;
			else l = -Infinity;
		}
		lo[id] = l;
		hi[id] = h;
		labels[id] = boundLabel(max, l, h);
	}
	return { status, labels, current: null, bounds: null, emphasis: null, cut, best: result.best };
}

export interface GameAnswer {
	value: number | null;
	move: string | null;
	/** Leaf ids marked as never looked up. */
	pruned: ReadonlySet<number>;
}

export interface GameGrade {
	value: boolean | null;
	move: boolean | null;
	/** Leaves marked that alpha-beta does look up, and pruned leaves left unmarked. */
	wrongLeaves: number[];
	leaves: boolean;
}

export function gradeGame(drill: GameDrill, answer: GameAnswer): GameGrade {
	const wrongLeaves = drill.leaves
		.filter((leaf) => leaf.pruned !== answer.pruned.has(leaf.id))
		.map((leaf) => leaf.id);
	return {
		value: answer.value === null ? null : answer.value === drill.value,
		move: answer.move === null ? null : drill.bestMoves.includes(answer.move),
		wrongLeaves,
		leaves: wrongLeaves.length === 0
	};
}
