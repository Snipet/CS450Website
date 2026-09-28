/**
 * Tidy tree layout: Reingold–Tilford as improved by Walker and by Buchheim,
 * Jünger and Leipert ("Improving Walker's algorithm to run in linear time").
 *
 * - Children are placed left to right in the order they appear in `nodes`.
 * - Each parent is centered over its first and last child.
 * - Subtrees are packed as closely as their contours allow: boxes on the same
 *   level never overlap, whatever their widths.
 * - Small subtrees between two larger ones are spread evenly.
 *
 * The walks are iterative, so very deep trees (a DFS path thousands of nodes
 * long) do not overflow the call stack. Linear in the number of nodes.
 */

export interface TreeLayoutNode {
	id: number;
	parent: number | null;
}

export interface TreeLayoutOptions {
	/** Width of a node's box (drawing units, e.g. px). */
	width: (id: number) => number;
	/** Gap between the boxes of neighboring siblings (default 12). */
	hGap?: number;
	/** Gap between neighboring boxes that are not siblings (default 1.5 × hGap). */
	cousinGap?: number;
	/** Gap between two rows (default 32). */
	vGap?: number;
	/** Height of a row of boxes (default 28). */
	levelHeight?: number;
}

export interface Point {
	x: number;
	y: number;
}

export interface TreeLayout {
	/**
	 * Center of each node's box, for the nodes reachable from the root. The
	 * drawing spans (0, 0)–(width, height): x from the leftmost box edge, y the
	 * middle of the node's row (row `depth` spans `depth · (levelHeight + vGap)`
	 * to that plus `levelHeight`).
	 */
	pos: Map<number, Point>;
	width: number;
	height: number;
	/** Depth of the deepest node (0 for a lone root; -1 when the root is missing). */
	depth: number;
}

export const DEFAULT_H_GAP = 12;
export const DEFAULT_V_GAP = 32;
export const DEFAULT_LEVEL_HEIGHT = 28;

/** Working record of one node (field names follow Buchheim et al.). */
interface W {
	id: number;
	parent: W | null;
	children: W[];
	/** Index among its siblings. */
	i: number;
	depth: number;
	/** Box width. */
	w: number;
	/** Preliminary x. */
	z: number;
	/** Modifier. */
	m: number;
	/** Change and shift (spreading of intermediate subtrees). */
	c: number;
	s: number;
	/** Thread. */
	t: W | null;
	/** Ancestor, and the default ancestor used while placing this node's children. */
	a: W;
	A: W | null;
	x: number;
}

function makeW(id: number, w: number): W {
	const node = {
		id,
		parent: null,
		children: [],
		i: 0,
		depth: 0,
		w,
		z: 0,
		m: 0,
		c: 0,
		s: 0,
		t: null,
		A: null,
		x: 0
	} as unknown as W;
	node.a = node;
	return node;
}

const nextLeft = (v: W): W | null => (v.children.length ? v.children[0] : v.t);
const nextRight = (v: W): W | null => (v.children.length ? v.children[v.children.length - 1] : v.t);

function moveSubtree(wm: W, wp: W, shift: number) {
	const change = shift / (wp.i - wm.i);
	wp.c -= change;
	wp.s += shift;
	wm.c += change;
	wp.z += shift;
	wp.m += shift;
}

function executeShifts(v: W) {
	let shift = 0;
	let change = 0;
	for (let i = v.children.length - 1; i >= 0; i--) {
		const w = v.children[i];
		w.z += shift;
		w.m += shift;
		change += w.c;
		shift += w.s + change;
	}
}

const nextAncestor = (vim: W, v: W, ancestor: W): W =>
	vim.a.parent === v.parent ? vim.a : ancestor;

/** Lays out the tree rooted at `rootId`. Nodes not reachable from it are left out. */
export function layoutTree(
	nodes: readonly TreeLayoutNode[],
	rootId: number,
	opts: TreeLayoutOptions
): TreeLayout {
	const hGap = Math.max(0, opts.hGap ?? DEFAULT_H_GAP);
	const cousinGap = Math.max(0, opts.cousinGap ?? hGap * 1.5);
	const vGap = Math.max(0, opts.vGap ?? DEFAULT_V_GAP);
	const levelHeight = Math.max(0, opts.levelHeight ?? DEFAULT_LEVEL_HEIGHT);
	const widthOf = (id: number) => {
		const w = opts.width(id);
		return Number.isFinite(w) && w > 0 ? w : 0;
	};

	const pos = new Map<number, Point>();
	if (!nodes.some((n) => n.id === rootId)) return { pos, width: 0, height: 0, depth: -1 };

	// Children lists in input order (first occurrence of an id wins).
	const kids = new Map<number, number[]>();
	const seen = new Set<number>();
	for (const n of nodes) {
		if (seen.has(n.id)) continue;
		seen.add(n.id);
		if (n.parent === null || n.id === rootId) continue;
		const list = kids.get(n.parent);
		if (list) list.push(n.id);
		else kids.set(n.parent, [n.id]);
	}

	// Build the working tree breadth first from the root (so unreachable nodes drop out).
	const root = makeW(rootId, widthOf(rootId));
	const virtual = makeW(-1, 0);
	virtual.children = [root];
	root.parent = virtual;
	const order: W[] = [root]; // breadth-first: parents before children
	for (let k = 0; k < order.length; k++) {
		const v = order[k];
		const list = kids.get(v.id);
		if (!list) continue;
		v.children = list.map((id, i) => {
			const c = makeW(id, widthOf(id));
			c.parent = v;
			c.i = i;
			c.depth = v.depth + 1;
			return c;
		});
		for (const c of v.children) order.push(c);
	}

	const separation = (a: W, b: W) => (a.w + b.w) / 2 + (a.parent === b.parent ? hGap : cousinGap);

	function apportion(v: W, w: W | null, ancestor: W): W {
		if (!w) return ancestor;
		let vip: W | null = v;
		let vop: W = v;
		let vim: W | null = w;
		let vom: W = v.parent!.children[0];
		let sip = vip.m;
		let sop = vop.m;
		let sim = vim.m;
		let som = vom.m;
		for (;;) {
			vim = nextRight(vim);
			vip = nextLeft(vip);
			if (!vim || !vip) break;
			vom = nextLeft(vom)!;
			vop = nextRight(vop)!;
			vop.a = v;
			const shift = vim.z + sim - vip.z - sip + separation(vim, vip);
			if (shift > 0) {
				moveSubtree(nextAncestor(vim, v, ancestor), v, shift);
				sip += shift;
				sop += shift;
			}
			sim += vim.m;
			sip += vip.m;
			som += vom.m;
			sop += vop.m;
		}
		if (vim && !nextRight(vop)) {
			vop.t = vim;
			vop.m += sim - sop;
		}
		if (vip && !nextLeft(vom)) {
			vom.t = vip;
			vom.m += sip - som;
			ancestor = v;
		}
		return ancestor;
	}

	function firstWalk(v: W) {
		const siblings = v.parent!.children;
		const w = v.i ? siblings[v.i - 1] : null;
		if (v.children.length) {
			executeShifts(v);
			const mid = (v.children[0].z + v.children[v.children.length - 1].z) / 2;
			if (w) {
				v.z = w.z + separation(v, w);
				v.m = v.z - mid;
			} else {
				v.z = mid;
			}
		} else if (w) {
			v.z = w.z + separation(v, w);
		}
		v.parent!.A = apportion(v, w, v.parent!.A ?? siblings[0]);
	}

	// Post-order with left subtrees first: reverse of a pre-order that visits right subtrees first.
	const stack: W[] = [root];
	const pre: W[] = [];
	while (stack.length) {
		const v = stack.pop()!;
		pre.push(v);
		for (const c of v.children) stack.push(c);
	}
	for (let k = pre.length - 1; k >= 0; k--) firstWalk(pre[k]);

	// Second walk: absolute x from the accumulated modifiers (parents first).
	virtual.m = -root.z;
	for (const v of order) {
		v.x = v.z + v.parent!.m;
		v.m += v.parent!.m;
	}

	let minX = Infinity;
	let maxX = -Infinity;
	let depth = 0;
	for (const v of order) {
		minX = Math.min(minX, v.x - v.w / 2);
		maxX = Math.max(maxX, v.x + v.w / 2);
		depth = Math.max(depth, v.depth);
	}
	const row = levelHeight + vGap;
	for (const v of order) {
		pos.set(v.id, { x: v.x - minX, y: v.depth * row + levelHeight / 2 });
	}
	return {
		pos,
		width: maxX - minX,
		height: (depth + 1) * levelHeight + depth * vGap,
		depth
	};
}
