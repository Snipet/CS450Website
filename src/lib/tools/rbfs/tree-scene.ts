/**
 * Geometry of the recursion tree (as Russell & Norvig draw Figure 3.27):
 * each node is a pill with its state name and its f value underneath, and
 * every open call carries its f_limit in a tag above the node. Laid out with
 * the shared tidy-tree layout; pure TS, `RecursionTree.svelte` only renders.
 */
import { formatNumber } from '$lib/components/search/describe';
import { textWidth } from '$lib/components/search/geometry';
import { layoutTree } from '$lib/components/search/tree-layout';
import type { TreeView, TreeViewNode } from './view';

export const PILL_HEIGHT = 26;
export const LABEL_FONT = 13;
export const NOTE_FONT = 11;
const TAG_HEIGHT = 16;
const TAG_GAP = 4;
const NOTE_LINE = 16;
const PAD = 18;
/** Space between the pill and its f value (room for the best/alternative ring). */
const NOTE_GAP = 4;
/** Content height of a row: tag, pill, f value. */
const ROW = TAG_HEIGHT + TAG_GAP + PILL_HEIGHT + NOTE_GAP + NOTE_LINE + 2;

/** Largest number of nodes drawn by default; deeper trees are cropped from the top. */
export const DEFAULT_MAX_TREE_NODES = 400;

export interface RecursionSceneNode {
	id: number;
	/** Center of the pill. */
	x: number;
	y: number;
	halfW: number;
	halfH: number;
	label: string;
	/** Current f ("417", "∞"). */
	fText: string;
	/** The f replaced at this step (drawn struck through before `fText`), else null. */
	oldText: string | null;
	fY: number;
	/** "f_limit 415" for an open call, else null. */
	limitText: string | null;
	limitY: number;
	limitHalfW: number;
	node: TreeViewNode;
}

export interface RecursionSceneEdge {
	parent: number;
	child: number;
	d: string;
}

export interface RecursionScene {
	nodes: RecursionSceneNode[];
	byId: Map<number, RecursionSceneNode>;
	edges: RecursionSceneEdge[];
	width: number;
	height: number;
	/** Depth of the top row drawn (0 unless the tree was cropped). */
	fromDepth: number;
	/** Nodes above the top row that are not drawn. */
	hidden: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** "f_limit 415". */
export const limitLabel = (limit: number): string => `f_limit ${formatNumber(limit)}`;

/** The subtree of `rootId` within `nodes` (parents before children, input order kept). */
function subtree(nodes: readonly TreeViewNode[], rootId: number): TreeViewNode[] {
	const keep = new Set([rootId]);
	const out: TreeViewNode[] = [];
	for (const n of nodes) {
		if (n.id === rootId || (n.parent !== null && keep.has(n.parent))) {
			keep.add(n.id);
			out.push(n);
		}
	}
	return out;
}

/**
 * Lays out the tree of a step. When it has more than `maxNodes` nodes, the
 * drawing starts at the shallowest open call whose subtree fits.
 */
export function recursionScene(view: TreeView, opts: { maxNodes?: number } = {}): RecursionScene {
	const maxNodes = opts.maxNodes ?? DEFAULT_MAX_TREE_NODES;
	const empty: RecursionScene = {
		nodes: [],
		byId: new Map(),
		edges: [],
		width: 0,
		height: 0,
		fromDepth: 0,
		hidden: 0
	};
	const root = view.nodes.find((n) => n.parent === null);
	if (!root) return empty;

	// Depth of each node from the parent links (the list is root first).
	const depthOf = new Map<number, number>();
	for (const n of view.nodes)
		depthOf.set(n.id, n.parent === null ? 0 : (depthOf.get(n.parent) ?? 0) + 1);

	let top = root.id;
	let nodes: TreeViewNode[] = view.nodes as TreeViewNode[];
	if (nodes.length > maxNodes) {
		// Open calls (and a returning call) from the root down: the chain of nodes with a limit.
		const chain = view.nodes.filter((n) => n.limit !== null && n.status !== 'forgotten');
		for (const c of chain) {
			const sub = subtree(view.nodes, c.id);
			top = c.id;
			nodes = sub;
			if (sub.length <= maxNodes) break;
		}
	}
	const fromDepth = depthOf.get(top) ?? 0;

	const info = new Map<
		number,
		{ fText: string; oldText: string | null; pillW: number; tagW: number; box: number }
	>();
	for (const n of nodes) {
		const fText = formatNumber(n.f);
		const oldText = n.previousF !== null && n.previousF !== n.f ? formatNumber(n.previousF) : null;
		const pillW = Math.max(PILL_HEIGHT + 4, textWidth(n.label, LABEL_FONT, 'sans', 500) + 20);
		const fW =
			textWidth(fText, NOTE_FONT, 'mono') +
			(oldText ? textWidth(oldText, NOTE_FONT, 'mono') + 8 : 0) +
			(n.backedUp || n.inherited ? 10 : 0);
		const tagW = n.limit !== null ? textWidth(limitLabel(n.limit), NOTE_FONT, 'mono') + 12 : 0;
		info.set(n.id, { fText, oldText, pillW, tagW, box: Math.max(pillW, fW + 4, tagW) });
	}

	const layout = layoutTree(nodes, top, {
		width: (id) => info.get(id)!.box,
		hGap: 14,
		cousinGap: 22,
		vGap: 22,
		levelHeight: ROW
	});

	const sceneNodes: RecursionSceneNode[] = [];
	for (const n of nodes) {
		const p = layout.pos.get(n.id);
		if (!p) continue;
		const it = info.get(n.id)!;
		const rowTop = p.y - ROW / 2 + PAD;
		const pillTop = rowTop + TAG_HEIGHT + TAG_GAP;
		sceneNodes.push({
			id: n.id,
			x: r2(p.x + PAD),
			y: r2(pillTop + PILL_HEIGHT / 2),
			halfW: r2(it.pillW / 2),
			halfH: PILL_HEIGHT / 2,
			label: n.label,
			fText: it.fText,
			oldText: it.oldText,
			fY: r2(pillTop + PILL_HEIGHT + NOTE_GAP + NOTE_LINE / 2),
			limitText: n.limit !== null ? limitLabel(n.limit) : null,
			limitY: r2(rowTop + TAG_HEIGHT / 2),
			limitHalfW: r2(it.tagW / 2),
			node: n
		});
	}
	const byId = new Map(sceneNodes.map((s) => [s.id, s]));

	const edges: RecursionSceneEdge[] = [];
	for (const s of sceneNodes) {
		const parent = s.node.parent === null ? undefined : byId.get(s.node.parent);
		if (!parent) continue;
		const y0 = parent.fY + NOTE_LINE / 2;
		const y1 = s.limitText ? s.limitY - TAG_HEIGHT / 2 : s.y - s.halfH - 1;
		edges.push({ parent: parent.id, child: s.id, d: `M${parent.x} ${r2(y0)}L${s.x} ${r2(y1)}` });
	}

	return {
		nodes: sceneNodes,
		byId,
		edges,
		width: r2(layout.width + 2 * PAD),
		height: r2(layout.height + 2 * PAD),
		fromDepth,
		hidden: view.nodes.length - nodes.length
	};
}

/** One sentence describing the drawn tree for assistive technology. */
export function sceneSummary(view: TreeView, scene: RecursionScene): string {
	const drawn = scene.nodes.map((s) => s.node);
	const path = view.path.filter((id) => scene.byId.has(id)).map((id) => scene.byId.get(id)!.node);
	const parts: string[] = [];
	if (path.length)
		parts.push(
			`Open calls: ${path.map((n) => `${n.label} (f = ${formatNumber(n.f)}, f_limit = ${formatNumber(n.limit ?? Infinity)})`).join(', ')}`
		);
	const stored = drawn.filter((n) => n.status === 'stored');
	if (stored.length)
		parts.push(
			`stored successors: ${stored.map((n) => `${n.label} ${formatNumber(n.f)}`).join(', ')}`
		);
	const forgotten = drawn.filter((n) => n.status === 'forgotten');
	if (forgotten.length) parts.push(`forgotten: ${forgotten.map((n) => n.label).join(', ')}`);
	const current = view.current === null ? undefined : scene.byId.get(view.current)?.node;
	if (current) parts.push(`current call: ${current.label}`);
	if (scene.hidden) parts.push(`${scene.hidden} nodes above depth ${scene.fromDepth} not drawn`);
	return `Recursion tree. ${parts.join('; ')}.`;
}

/** Legend entries of the recursion tree, in a fixed order. */
export type TreeLegendKey =
	| 'current'
	| 'open'
	| 'stored'
	| 'best'
	| 'alternative'
	| 'exceeds'
	| 'forgotten'
	| 'goal'
	| 'limit'
	| 'backed'
	| 'inherited';

export const LEGEND_TEXT: Record<TreeLegendKey, string> = {
	current: 'Current call',
	open: 'Open call',
	stored: 'Stored successor',
	best: 'Best successor',
	alternative: 'Alternative',
	exceeds: 'Best f exceeds f_limit',
	forgotten: 'Forgotten',
	goal: 'Goal and solution path',
	limit: 'f_limit of the call',
	backed: 'Backed-up f',
	inherited: 'f raised to the parent’s f'
};

/** The legend entries a step's tree uses. */
export function legendKeys(view: TreeView): TreeLegendKey[] {
	const keys = new Set<TreeLegendKey>();
	const solved = view.nodes.some((n) => n.status === 'goal');
	for (const n of view.nodes) {
		// At a goal step the open calls are drawn as the solution path.
		if (n.status === 'goal') keys.add('goal');
		else if (!(solved && n.status === 'open')) keys.add(n.status);
		if (n.role) keys.add(n.role);
		if (n.backedUp) keys.add('backed');
		else if (n.inherited) keys.add('inherited');
		if (n.limit !== null) keys.add('limit');
	}
	return (Object.keys(LEGEND_TEXT) as TreeLegendKey[]).filter((k) => keys.has(k));
}
