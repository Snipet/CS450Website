/**
 * Game trees (Games and Adversarial Search, slides 9–13, 24): nodes with
 * their children in order (left to right), terminal utilities (numbers for
 * MAX in two-player games; tuples, one utility per player, in games with more
 * players), action labels on the edges, optional evaluation values on
 * internal nodes for depth cutoffs, and the player to move at the root.
 *
 * Nodes are stored in preorder (depth first, left to right), so the root is
 * node 0 and the subtree of node `n` is the id range `[n, n + size)`.
 * Two-player trees alternate MAX and MIN by level, starting with `root`.
 */

export type Player = 'max' | 'min';

/** A terminal utility or an evaluation value: a number, or a tuple (one entry per player). */
export type Utility = number | readonly number[];

export interface GameNode {
	/** Preorder index; the root is 0. */
	id: number;
	parent: number | null;
	/** Child ids, left to right. */
	children: readonly number[];
	/** Distance from the root (the root has depth 0). */
	depth: number;
	/** Label of the edge from the parent (A1, A12, …); null at the root. */
	action: string | null;
	/** Utility of a terminal node; null for internal nodes. */
	utility: Utility | null;
	/** Evaluation value of an internal node, used when search is cut off at its depth (slide 24). */
	eval: Utility | null;
}

export interface GameTree {
	/** Player to move at the root; players alternate by level (two-player trees). */
	root: Player;
	/** Nodes in preorder. */
	nodes: readonly GameNode[];
	/** Whether utilities are tuples (games with more than two players, slide 13). */
	tuples: boolean;
	/** Number of players: 2 for numeric utilities, else the tuple length. */
	players: number;
	/**
	 * Multi-player trees: the player to move at each level, cycling (players
	 * are numbered from 1, the tuple positions). null: 1, 2, …, players.
	 */
	order: readonly number[] | null;
}

/** Deepest tree accepted (levels below the root). */
export const MAX_DEPTH = 10;
/** Largest tree accepted (nodes). */
export const MAX_NODES = 2000;

/** Input to `buildGameTree`: a node with its children, a utility, or both left out. */
export interface NodeSpec {
	/** Edge label; left out: the default label (A1, A12, …). */
	action?: string | null;
	utility?: Utility | null;
	eval?: Utility | null;
	children?: readonly NodeSpec[];
}

export interface BuildOptions {
	root?: Player;
	order?: readonly number[] | null;
}

/** −0 becomes 0, so formatted and parsed values compare equal. */
const clean = (n: number): number => (n === 0 ? 0 : n);

function cleanUtility(u: Utility | null | undefined): Utility | null {
	if (u === null || u === undefined) return null;
	return typeof u === 'number' ? clean(u) : u.map(clean);
}

/**
 * Builds a tree from nested specs. Nodes without an action get the default
 * labels (`defaultActions`). Utilities of internal nodes and evaluation values
 * of terminal nodes are dropped. The input is not checked further: typed
 * trees go through `parseGameTree`, which reports problems as diagnostics.
 */
export function buildGameTree(spec: NodeSpec, options: BuildOptions = {}): GameTree {
	const nodes: GameNode[] = [];
	const explicit: (string | null)[] = [];
	// Iterative preorder so deep specs cannot overflow the stack.
	const stack: { spec: NodeSpec; parent: number | null; depth: number }[] = [
		{ spec, parent: null, depth: 0 }
	];
	while (stack.length) {
		const { spec: s, parent, depth } = stack.pop()!;
		const id = nodes.length;
		const kids = s.children ?? [];
		const leaf = kids.length === 0;
		nodes.push({
			id,
			parent,
			children: [],
			depth,
			action: null,
			utility: leaf ? cleanUtility(s.utility ?? 0) : null,
			eval: leaf ? null : cleanUtility(s.eval)
		});
		explicit.push(parent === null ? null : (s.action ?? null));
		if (parent !== null) (nodes[parent].children as number[]).push(id);
		for (let i = kids.length - 1; i >= 0; i--)
			stack.push({ spec: kids[i], parent: id, depth: depth + 1 });
	}
	const first = nodes.find((n) => n.utility !== null)?.utility ?? 0;
	const tuples = typeof first !== 'number';
	const tree: GameTree = {
		root: options.root ?? 'max',
		nodes,
		tuples,
		players: tuples ? (first as readonly number[]).length : 2,
		order: tuples && options.order ? [...options.order] : null
	};
	const defaults = defaultActions(tree);
	for (const n of nodes) n.action = n.parent === null ? null : (explicit[n.id] ?? defaults[n.id]);
	return tree;
}

/** A two-player tree from nested arrays of numbers: `nestedTree([[3, 12, 8], [2, 4, 6]])`. */
export type Nested = number | readonly Nested[];

export function nestedSpec(value: Nested): NodeSpec {
	if (typeof value === 'number') return { utility: value };
	return { children: value.map(nestedSpec) };
}

export function nestedTree(value: Nested, root: Player = 'max'): GameTree {
	return buildGameTree(nestedSpec(value), { root });
}

/** The spec of a tree (every action written out), for rebuilding or reordering it. */
export function toSpec(tree: GameTree, id = 0): NodeSpec {
	const specs: NodeSpec[] = tree.nodes.map((n) => ({
		action: n.action,
		utility: n.utility,
		eval: n.eval
	}));
	for (let i = tree.nodes.length - 1; i >= 0; i--) {
		const n = tree.nodes[i];
		if (n.children.length) specs[i].children = n.children.map((c) => specs[c]);
	}
	return specs[id];
}

/**
 * The default action labels, as on the slides: A1, A2, A3 for the root's
 * children, A11, A12, … for theirs, A111, … one level down. When a node has
 * more than nine children the indices are separated by dots (A1.10) so labels
 * stay unambiguous. Index 0 (the root) is null.
 */
export function defaultActions(tree: Pick<GameTree, 'nodes'>): (string | null)[] {
	let wide = false;
	for (const n of tree.nodes) if (n.children.length > 9) wide = true;
	const sep = wide ? '.' : '';
	const out: (string | null)[] = new Array(tree.nodes.length).fill(null);
	const path: string[] = new Array(tree.nodes.length).fill('');
	for (const n of tree.nodes) {
		n.children.forEach((c, i) => {
			path[c] = n.parent === null ? String(i + 1) : `${path[n.id]}${sep}${i + 1}`;
			out[c] = `A${path[c]}`;
		});
	}
	return out;
}

export const isTerminal = (tree: GameTree, id: number): boolean =>
	tree.nodes[id].children.length === 0;

/** The player to move at a depth of a two-player tree (MAX and MIN alternate). */
export function playerAt(tree: Pick<GameTree, 'root'>, depth: number): Player {
	const flip = depth % 2 === 1;
	return tree.root === 'max' ? (flip ? 'min' : 'max') : flip ? 'max' : 'min';
}

/** The player order of a multi-player tree: its `order`, else 1, 2, …, players. */
export function playerOrder(tree: GameTree): number[] {
	if (tree.order?.length) return [...tree.order];
	return Array.from({ length: tree.players }, (_, i) => i + 1);
}

/** Multi-player trees: the player (numbered from 1) to move at a depth. */
export const playerAtDepth = (order: readonly number[], depth: number): number =>
	order.length ? order[depth % order.length] : 1;

/** How a node is named in step descriptions: "root", or the action that leads to it. */
export function nodeName(tree: GameTree, id: number): string {
	const n = tree.nodes[id];
	return n.parent === null ? 'root' : (n.action ?? `node ${id}`);
}

/** Number of nodes in each node's subtree (the node included). */
export function subtreeSizes(tree: GameTree): number[] {
	const size = new Array<number>(tree.nodes.length).fill(1);
	for (let i = tree.nodes.length - 1; i > 0; i--) size[tree.nodes[i].parent!] += size[i];
	return size;
}

export interface TreeFacts {
	nodes: number;
	leaves: number;
	/** Depth of the deepest node. */
	depth: number;
	/** Largest number of children. */
	branching: number;
	/** Set when every internal node has b children and every leaf is at depth d. */
	uniform: { b: number; d: number } | null;
	/**
	 * Depths from 1 below the deepest level at which every internal node has an
	 * evaluation value: the depths a search can be cut off at (slide 24).
	 */
	cutoffDepths: number[];
}

export function treeFacts(tree: GameTree): TreeFacts {
	let leaves = 0;
	let depth = 0;
	let branching = 0;
	const internalAt = new Map<number, number>();
	const evalAt = new Map<number, number>();
	for (const n of tree.nodes) {
		depth = Math.max(depth, n.depth);
		branching = Math.max(branching, n.children.length);
		if (!n.children.length) {
			leaves++;
			continue;
		}
		internalAt.set(n.depth, (internalAt.get(n.depth) ?? 0) + 1);
		if (n.eval !== null) evalAt.set(n.depth, (evalAt.get(n.depth) ?? 0) + 1);
	}
	let uniform: TreeFacts['uniform'] = null;
	if (tree.nodes.length > 1) {
		const ok = tree.nodes.every((n) =>
			n.children.length ? n.children.length === branching : n.depth === depth
		);
		if (ok) uniform = { b: branching, d: depth };
	}
	const cutoffDepths: number[] = [];
	for (let d = 1; d < depth; d++) {
		const internal = internalAt.get(d) ?? 0;
		if (internal > 0 && evalAt.get(d) === internal) cutoffDepths.push(d);
	}
	return { nodes: tree.nodes.length, leaves, depth, branching, uniform, cutoffDepths };
}

/**
 * The tree with each node's children put in a new order: `order(node)` returns
 * the node's child ids in the order wanted. Actions stay with their subtrees
 * (A13 may come first). Returns the new tree and, for each new id, the id of
 * the same node in `tree`.
 */
export function reorderTree(
	tree: GameTree,
	order: (node: GameNode) => readonly number[]
): { tree: GameTree; source: number[] } {
	const spec = (id: number): NodeSpec & { source: number } => {
		const n = tree.nodes[id];
		return {
			source: id,
			action: n.action,
			utility: n.utility,
			eval: n.eval,
			children: n.children.length ? order(n).map(spec) : undefined
		};
	};
	const root = spec(0);
	const rebuilt = buildGameTree(root, { root: tree.root, order: tree.order });
	// Preorder of the new tree matches a preorder walk of the specs.
	const source: number[] = [];
	const walk: (NodeSpec & { source: number })[] = [root];
	while (walk.length) {
		const s = walk.pop()!;
		source.push(s.source);
		const kids = (s.children ?? []) as (NodeSpec & { source: number })[];
		for (let i = kids.length - 1; i >= 0; i--) walk.push(kids[i]);
	}
	return { tree: rebuilt, source };
}

// ---------------------------------------------------------------------------
// Random trees
// ---------------------------------------------------------------------------

/** mulberry32: a small seeded generator with values in [0, 1). */
export function seededRandom(seed: number): () => number {
	let a = Math.trunc(seed) >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Nodes in a uniform tree: 1 + b + b² + … + bᵈ. */
export function uniformTreeSize(b: number, d: number): number {
	let total = 0;
	let level = 1;
	for (let i = 0; i <= d; i++) {
		total += level;
		level *= b;
	}
	return total;
}

/** Deepest uniform tree with branching b within MAX_NODES and MAX_DEPTH. */
export function maxRandomDepth(b: number): number {
	let d = 1;
	while (d < MAX_DEPTH && uniformTreeSize(b, d + 1) <= MAX_NODES) d++;
	return d;
}

export interface RandomTreeOptions {
	/** Children per internal node (≥ 1). */
	branching: number;
	/** Depth of the leaves (≥ 1); reduced to `maxRandomDepth(branching)` if larger. */
	depth: number;
	seed: number;
	/** Utility range, whole numbers (default 0–20). */
	min?: number;
	max?: number;
	root?: Player;
	/** Distinct utilities 1, 2, …, bᵈ in random order instead of values in [min, max]. */
	distinct?: boolean;
}

/** A uniform two-player tree with seeded random utilities; the same options give the same tree. */
export function randomGameTree(options: RandomTreeOptions): GameTree {
	const b = Math.max(1, Math.trunc(options.branching));
	const d = Math.max(1, Math.min(Math.trunc(options.depth), maxRandomDepth(b)));
	const lo = Math.trunc(Math.min(options.min ?? 0, options.max ?? 20));
	const hi = Math.trunc(Math.max(options.min ?? 0, options.max ?? 20));
	const rand = seededRandom(options.seed);
	const leafCount = b ** d;
	let values: number[];
	if (options.distinct) {
		values = Array.from({ length: leafCount }, (_, i) => i + 1);
		for (let i = values.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			[values[i], values[j]] = [values[j], values[i]];
		}
	} else {
		values = Array.from({ length: leafCount }, () => lo + Math.floor(rand() * (hi - lo + 1)));
	}
	let next = 0;
	const make = (depth: number): NodeSpec =>
		depth === d
			? { utility: values[next++] }
			: { children: Array.from({ length: b }, () => make(depth + 1)) };
	return buildGameTree(make(0), { root: options.root ?? 'max' });
}
