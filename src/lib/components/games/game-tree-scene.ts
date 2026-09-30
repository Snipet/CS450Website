/**
 * Geometry of a game tree drawing (Games and Adversarial Search, slides
 * 9–19): MAX nodes as up-pointing triangles, MIN nodes as down-pointing
 * triangles, terminal nodes as the triangles of their level with the utility
 * underneath, action labels on the edges, and MAX / MIN level labels on the
 * left. Multi-player trees (slide 13) draw internal nodes as squares in the
 * color of the player to move and terminal nodes as boxes holding their
 * utility tuple. Pure TS: `GameTree.svelte` only renders.
 *
 * Every internal node's layout box leaves room for a value label on its left
 * ("3", "≥3", "≤2", or a tuple) and, in two-player trees, α and β on its
 * right, so labels never overlap a neighbor.
 */
import { textWidth } from '$lib/components/search/geometry';
import { layoutTree } from '$lib/components/search/tree-layout';
import {
	formatTuple,
	formatValue,
	playerAt,
	playerAtDepth,
	type GameTree,
	type Utility
} from '$lib/theory/games';

export type NodeShape = 'max' | 'min' | 'square';

export interface SceneNode {
	id: number;
	x: number;
	y: number;
	shape: NodeShape;
	/** Multi-player trees: the player to move (numbered from 1). */
	player: number | null;
	terminal: boolean;
	/** Half the width and half the height of the node's shape. */
	halfW: number;
	halfH: number;
	/** Terminal utility text ("12", "4,3,2"), drawn under a triangle or inside a box. */
	utility: string | null;
	utilityY: number;
	/** Multi-player terminal nodes: the tuple box. */
	box: { x: number; y: number; width: number; height: number } | null;
	/** Anchor of the value label (text-anchor end) and of α/β (text-anchor start). */
	valueX: number;
	sideX: number;
}

export interface SceneEdge {
	parent: number;
	child: number;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	/** Action label beside the edge, or null when labels are hidden. */
	label: { x: number; y: number; text: string; anchor: 'start' | 'end' } | null;
	/** Middle of the edge (where a pruned edge is crossed). */
	mid: { x: number; y: number };
}

export interface SceneLevel {
	depth: number;
	y: number;
	text: string;
	/** Multi-player trees: the player of the level. */
	player: number | null;
}

export interface GameTreeScene {
	nodes: SceneNode[];
	byId: Map<number, SceneNode>;
	edges: SceneEdge[];
	levels: SceneLevel[];
	/** Size of the tree drawing (without the level labels). */
	width: number;
	height: number;
	/** Width of the column of level labels drawn left of the tree. */
	levelWidth: number;
	/** Whether nodes are drawn small (large trees). */
	compact: boolean;
}

export interface SceneOptions {
	/** Show action labels on the edges (default true). */
	actions?: boolean;
	/** Multi-player trees: the player order. */
	order?: readonly number[];
	/** Draw small nodes; default: when the tree has more than 40 terminal nodes. */
	compact?: boolean;
}

export const VALUE_FONT = 14;
export const SIDE_FONT = 11;
export const ACTION_FONT = 11;
export const LEVEL_FONT = 12;
const LABEL_GAP = 6;
const PAD = 16;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Text of a value label: a number, or a tuple as on slide 13 ("4,3,2"). */
export function utilityText(u: Utility): string {
	return typeof u === 'number' ? formatValue(u) : formatTuple(u);
}

/** Level labels: MAX / MIN, or Player 1, Player 3, … in multi-player trees. */
export function levelText(tree: GameTree, depth: number, order: readonly number[]): string {
	if (tree.tuples) return `Player ${playerAtDepth(order, depth)}`;
	return playerAt(tree, depth) === 'max' ? 'MAX' : 'MIN';
}

export function gameTreeScene(tree: GameTree, options: SceneOptions = {}): GameTreeScene {
	const showActions = options.actions ?? true;
	const order = options.order ?? [];
	const leaves = tree.nodes.filter((n) => !n.children.length).length;
	const compact = options.compact ?? leaves > 40;
	const multi = tree.tuples;

	const triW = compact ? 18 : 30;
	const triH = compact ? 15 : 24;
	const square = compact ? 14 : 22;
	const utilFont = compact ? 11 : 14;
	const boxH = compact ? 18 : 24;

	// Widest value label over the whole tree, so every internal node gets the same room.
	let widestValue = 0;
	let widestUtility = 0;
	for (const n of tree.nodes) {
		const u = n.utility ?? n.eval;
		if (u === null) continue;
		const text = utilityText(u);
		widestValue = Math.max(widestValue, textWidth(`≥${text}`, VALUE_FONT, 'sans', 700));
		if (n.utility !== null)
			widestUtility = Math.max(widestUtility, textWidth(text, utilFont, 'sans', 700));
	}
	// Trees with more than 16 terminal nodes do not reserve room for α and β; they are
	// drawn over the gap to the next node, with a halo.
	const sideW = multi || leaves > 16 ? 0 : textWidth('β = +∞', SIDE_FONT, 'sans', 500);
	const actionW = (id: number) =>
		showActions && tree.nodes[id].action
			? textWidth(tree.nodes[id].action!, ACTION_FONT, 'sans', 500)
			: 0;

	const shapeW = (terminal: boolean) => (multi ? (terminal ? widestUtility + 14 : square) : triW);
	const boxWidth = (id: number): number => {
		const n = tree.nodes[id];
		const terminal = n.children.length === 0;
		let w = shapeW(terminal);
		if (!multi && terminal) w = Math.max(w, widestUtility + 4);
		if (!terminal) w += 2 * (Math.max(widestValue, sideW) + LABEL_GAP);
		// An action label sits beside the edge just above the node.
		const a = actionW(id);
		if (a) w = Math.max(w, a + 14);
		return w;
	};

	const underHeight = multi ? 0 : utilFont + 6;
	const levelHeight = (multi ? Math.max(square, boxH) : triH) + underHeight;
	const vGap = compact ? 26 : showActions ? 42 : 34;
	const layout = layoutTree(
		tree.nodes.map((n) => ({ id: n.id, parent: n.parent })),
		0,
		{ width: boxWidth, hGap: compact ? 4 : 10, cousinGap: compact ? 8 : 18, vGap, levelHeight }
	);

	const levelW = tree.nodes.length
		? Math.max(
				...Array.from({ length: layout.depth + 1 }, (_, d) =>
					textWidth(levelText(tree, d, order), LEVEL_FONT, 'sans', 600)
				)
			) + 8
		: 0;
	const left = PAD;

	const nodes: SceneNode[] = [];
	for (const n of tree.nodes) {
		const p = layout.pos.get(n.id);
		if (!p) continue;
		const terminal = n.children.length === 0;
		const x = r2(p.x + left);
		const top = p.y - levelHeight / 2 + PAD;
		const shapeH = multi ? (terminal ? boxH : square) : triH;
		const y = r2(top + shapeH / 2);
		const player = multi ? playerAtDepth(order, n.depth) : null;
		const shape: NodeShape = multi ? 'square' : playerAt(tree, n.depth);
		const utility = n.utility === null ? null : utilityText(n.utility);
		const halfW = multi ? (terminal ? r2((widestUtility + 14) / 2) : square / 2) : triW / 2;
		nodes.push({
			id: n.id,
			x,
			y,
			shape,
			player,
			terminal,
			halfW,
			halfH: shapeH / 2,
			utility,
			utilityY: multi ? y : r2(y + triH / 2 + utilFont * 0.5 + 5),
			box:
				multi && terminal
					? { x: r2(x - halfW), y: r2(y - boxH / 2), width: r2(2 * halfW), height: boxH }
					: null,
			valueX: r2(x - halfW - LABEL_GAP),
			sideX: r2(x + halfW + LABEL_GAP)
		});
	}
	const byId = new Map(nodes.map((s) => [s.id, s]));

	const edges: SceneEdge[] = [];
	for (const n of tree.nodes) {
		if (n.parent === null) continue;
		const a = byId.get(n.parent);
		const b = byId.get(n.id);
		if (!a || !b) continue;
		const x1 = a.x;
		const y1 = r2(a.y + a.halfH);
		const x2 = b.x;
		const y2 = r2(b.y - b.halfH);
		const t = 0.64;
		const lx = x1 + (x2 - x1) * t;
		const ly = y1 + (y2 - y1) * t;
		const goesLeft = x2 < x1 - 0.5;
		const label =
			showActions && n.action
				? {
						x: r2(goesLeft ? lx - 5 : lx + 5),
						y: r2(ly),
						text: n.action,
						anchor: (goesLeft ? 'end' : 'start') as 'start' | 'end'
					}
				: null;
		edges.push({
			parent: n.parent,
			child: n.id,
			x1,
			y1,
			x2,
			y2,
			label,
			mid: { x: r2((x1 + x2) / 2), y: r2((y1 + y2) / 2) }
		});
	}

	const levels: SceneLevel[] = [];
	for (let d = 0; d <= layout.depth; d++) {
		// Label the levels where some node moves (not a level of terminal nodes only).
		const any = tree.nodes.find((n) => n.depth === d);
		const moves = tree.nodes.some((n) => n.depth === d && n.children.length);
		if (!any || !moves) continue;
		const s = byId.get(any.id)!;
		levels.push({
			depth: d,
			y: s.y,
			text: levelText(tree, d, order),
			player: multi ? playerAtDepth(order, d) : null
		});
	}

	return {
		nodes,
		byId,
		edges,
		levels,
		width: r2(layout.width + 2 * PAD),
		levelWidth: r2(levelW + PAD),
		height: r2(layout.height + 2 * PAD),
		compact
	};
}

/** Largest zoom a small tree grows to when it opens. */
export const MAX_FIT_ZOOM = 1.4;

/**
 * The zoom a drawing opens at in a view `viewW` wide and at most `maxH` tall:
 * small trees grow to fill it (up to MAX_FIT_ZOOM), trees a little too big
 * shrink to fit (down to 0.6), and large trees stay at 1 and scroll.
 */
export function initialZoom(sceneW: number, sceneH: number, viewW: number, maxH: number): number {
	if (!(sceneW > 0 && sceneH > 0 && viewW > 0 && maxH > 0)) return 1;
	const fit = Math.min((viewW - 4) / sceneW, (maxH - 4) / sceneH);
	if (fit >= 1) return Math.min(MAX_FIT_ZOOM, fit);
	return fit >= 0.6 ? fit : 1;
}

/** SVG points of a node's triangle (MAX up, MIN down). */
export function trianglePoints(
	n: Pick<SceneNode, 'x' | 'y' | 'halfW' | 'halfH' | 'shape'>
): string {
	const { x, y, halfW: w, halfH: h } = n;
	const pts =
		n.shape === 'min'
			? [
					[x - w, y - h],
					[x + w, y - h],
					[x, y + h]
				]
			: [
					[x, y - h],
					[x + w, y + h],
					[x - w, y + h]
				];
	return pts.map(([px, py]) => `${r2(px)},${r2(py)}`).join(' ');
}

/** A small × centered on a point (a pruned edge). */
export function crossPath(x: number, y: number, r = 5): string {
	return `M${r2(x - r)} ${r2(y - r)}L${r2(x + r)} ${r2(y + r)}M${r2(x + r)} ${r2(y - r)}L${r2(x - r)} ${r2(y + r)}`;
}
