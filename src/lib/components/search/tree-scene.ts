/**
 * Geometry of a search-tree drawing (docs/ARCHITECTURE.md §3.2): one tidy
 * layout of every node of an IDS iteration (so positions stay put while
 * stepping), a rounded node per state name with its annotation underneath,
 * and parent–child edges. Pure TS; `SearchTree.svelte` only renders.
 */
import type { SearchNode, SearchResult } from '$lib/theory/search';
import { annotationText, formatNumber, type Annotation } from './describe';
import { textWidth } from './geometry';
import { layoutTree } from './tree-layout';
import { iterationNodes } from './tree-view';

export interface TreeSceneOptions {
	annotation: Annotation;
	/** Step costs on the edges. */
	showCosts?: boolean;
	/** Draw at most this many nodes (the first ones by id). */
	maxNodes?: number;
	/** Display name of a node's state (default: `node.label`). */
	label?: (node: SearchNode) => string;
}

export interface TreeSceneNode {
	id: number;
	/** Center of the node's pill. */
	x: number;
	y: number;
	halfW: number;
	halfH: number;
	label: string;
	/** Annotation under the pill ("393=140+253"), or "". */
	note: string;
	noteY: number;
}

export interface TreeSceneEdge {
	parent: number;
	child: number;
	d: string;
	cost: { x: number; y: number; text: string } | null;
}

export interface TreeScene {
	iteration: number;
	nodes: TreeSceneNode[];
	byId: Map<number, TreeSceneNode>;
	edges: TreeSceneEdge[];
	width: number;
	height: number;
	/** Nodes in the iteration, and how many are drawn (fewer when capped). */
	total: number;
	shown: number;
}

export const PILL_HEIGHT = 26;
export const LABEL_FONT = 13;
export const NOTE_FONT = 11;
const NOTE_LINE = 16;
const PAD = 18;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Lays out the tree of one iteration of a search. */
export function treeScene(
	result: SearchResult,
	iteration: number,
	opts: TreeSceneOptions
): TreeScene {
	const { nodes, total } = iterationNodes(result, iteration, opts.maxNodes ?? Infinity);
	const name = opts.label ?? ((n: SearchNode) => n.label);
	const weight = result.options.weight;
	const hasNotes = opts.annotation !== 'none';
	const levelHeight = PILL_HEIGHT + (hasNotes ? NOTE_LINE : 0);
	const vGap = opts.showCosts ? 34 : 26;

	const info = new Map<number, { label: string; note: string; pillW: number; box: number }>();
	for (const n of nodes) {
		const label = name(n);
		const note = hasNotes ? annotationText(n, opts.annotation, result.strategy, weight) : '';
		const pillW = Math.max(PILL_HEIGHT + 4, textWidth(label, LABEL_FONT, 'sans', 500) + 20);
		const noteW = note ? textWidth(note, NOTE_FONT, 'mono') + 4 : 0;
		info.set(n.id, { label, note, pillW, box: Math.max(pillW, noteW) });
	}

	const root = nodes.find((n) => n.parent === null);
	const empty: TreeScene = {
		iteration,
		nodes: [],
		byId: new Map(),
		edges: [],
		width: 0,
		height: 0,
		total,
		shown: nodes.length
	};
	if (!root) return empty;

	const layout = layoutTree(nodes, root.id, {
		width: (id) => info.get(id)!.box,
		hGap: 14,
		cousinGap: 22,
		vGap,
		levelHeight
	});

	const sceneNodes: TreeSceneNode[] = [];
	for (const n of nodes) {
		const p = layout.pos.get(n.id);
		if (!p) continue;
		const it = info.get(n.id)!;
		const top = p.y - levelHeight / 2 + PAD;
		sceneNodes.push({
			id: n.id,
			x: r2(p.x + PAD),
			y: r2(top + PILL_HEIGHT / 2),
			halfW: r2(it.pillW / 2),
			halfH: PILL_HEIGHT / 2,
			label: it.label,
			note: it.note,
			noteY: r2(top + PILL_HEIGHT + NOTE_LINE / 2 + 1)
		});
	}
	const byId = new Map(sceneNodes.map((s) => [s.id, s]));

	const edges: TreeSceneEdge[] = [];
	for (const n of nodes) {
		if (n.parent === null) continue;
		const a = byId.get(n.parent);
		const b = byId.get(n.id);
		if (!a || !b) continue;
		const y0 = a.y + a.halfH + (a.note ? NOTE_LINE + 1 : 1);
		const y1 = b.y - b.halfH - 1;
		const cost = opts.showCosts
			? {
					x: r2((a.x + b.x) / 2),
					y: r2((y0 + y1) / 2),
					text: formatNumber(n.g - result.nodes[n.parent].g)
				}
			: null;
		edges.push({ parent: n.parent, child: n.id, d: `M${a.x} ${r2(y0)}L${b.x} ${r2(y1)}`, cost });
	}

	return {
		iteration,
		nodes: sceneNodes,
		byId,
		edges,
		width: r2(layout.width + 2 * PAD),
		height: r2(layout.height + 2 * PAD),
		total,
		shown: nodes.length
	};
}
