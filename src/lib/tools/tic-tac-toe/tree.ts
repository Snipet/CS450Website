/**
 * The game tree view (Games and Adversarial Search, slide 6): the current
 * board at the top, its children one level down in square order, and
 * optionally the children of one child, with the player to move at each
 * level and every board's minimax value backed up from the terminal states.
 * Coordinates are in drawing units; the component scales the drawing.
 */
import {
	isTerminal,
	legalMoves,
	playerOf,
	result,
	toMove,
	type Board
} from '$lib/theory/games/tictactoe';
import { minimax, minimaxValue } from '$lib/theory/games/tictactoe-search';

/** Side of a small board. */
export const TREE_BOARD = 46;
/** Space between boards in a row. */
export const TREE_GAP = 10;
/** Width of the level labels at the left. */
export const TREE_LABEL = 64;
/** Room under a board for its value. */
export const TREE_VALUE = 20;
/** Vertical space for the edges between levels. */
export const TREE_LEVEL_GAP = 34;

export interface TreeNode {
	/** "root", "c5" (the child where square 5 was played), "g5-7" (then square 7). */
	id: string;
	board: Board;
	level: 0 | 1 | 2;
	/** Square played from the parent; null at the root. */
	square: number | null;
	parent: string | null;
	/** Top-left corner. */
	x: number;
	y: number;
	/** Minimax value for MAX. */
	value: number;
	terminal: boolean;
	/**
	 * One of its parent's best children. False at the root and when every
	 * child of the parent has the same value (nothing to single out).
	 */
	best: boolean;
	/** A level-1 board whose children are drawn. */
	expanded: boolean;
}

export interface TreeEdge {
	from: string;
	to: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	best: boolean;
}

export interface TreeLevel {
	level: number;
	/** Top of the level's boards. */
	y: number;
	/** "MAX (X)", "MIN (O)", or "TERMINAL" when every board on the level is terminal. */
	label: string;
}

export interface TreeLayout {
	nodes: TreeNode[];
	edges: TreeEdge[];
	levels: TreeLevel[];
	width: number;
	height: number;
	/** The level-1 child whose children are drawn, if any. */
	expanded: number | null;
}

const rowWidth = (n: number) => (n <= 0 ? 0 : n * TREE_BOARD + (n - 1) * TREE_GAP);
const levelY = (level: number) => 4 + level * (TREE_BOARD + TREE_VALUE + TREE_LEVEL_GAP);

function levelLabel(boards: readonly Board[]): string {
	const live = boards.find((b) => !isTerminal(b));
	if (live === undefined) return 'TERMINAL';
	const mark = toMove(live);
	return `${playerOf(mark)} (${mark})`;
}

/**
 * Layout of the tree below `board`: `levels` 1 draws the children, 2 also the
 * children of `expand` (a square; null or an illegal square: the move
 * minimax returns).
 */
export function treeLayout(
	board: Board,
	{ levels = 1, expand = null }: { levels?: 1 | 2; expand?: number | null } = {}
): TreeLayout {
	const rootSearch = minimax(board);
	const children = legalMoves(board);
	const expanded =
		levels === 2 && children.length
			? expand !== null && children.includes(expand)
				? expand
				: rootSearch.move
			: null;
	const expandedBoard = expanded === null ? null : result(board, expanded);
	const grandchildren = expandedBoard ? legalMoves(expandedBoard) : [];
	const grandSearch = expandedBoard ? minimax(expandedBoard) : null;

	const content = Math.max(TREE_BOARD, rowWidth(children.length), rowWidth(grandchildren.length));
	const width = TREE_LABEL + content + 4;
	const drawn = expandedBoard && grandchildren.length ? 3 : children.length ? 2 : 1;
	const height = levelY(drawn - 1) + TREE_BOARD + TREE_VALUE;

	const nodes: TreeNode[] = [];
	const edges: TreeEdge[] = [];
	const root: TreeNode = {
		id: 'root',
		board,
		level: 0,
		square: null,
		parent: null,
		x: TREE_LABEL + (content - TREE_BOARD) / 2,
		y: levelY(0),
		value: rootSearch.value,
		terminal: isTerminal(board),
		best: false,
		expanded: false
	};
	nodes.push(root);

	const connect = (from: TreeNode, to: TreeNode) =>
		edges.push({
			from: from.id,
			to: to.id,
			x1: from.x + TREE_BOARD / 2,
			// Below the parent's value.
			y1: from.y + TREE_BOARD + TREE_VALUE,
			x2: to.x + TREE_BOARD / 2,
			y2: to.y,
			best: to.best
		});

	const start1 = TREE_LABEL + (content - rowWidth(children.length)) / 2;
	let expandedNode: TreeNode | null = null;
	children.forEach((square, i) => {
		const child = result(board, square);
		const node: TreeNode = {
			id: `c${square + 1}`,
			board: child,
			level: 1,
			square,
			parent: 'root',
			x: start1 + i * (TREE_BOARD + TREE_GAP),
			y: levelY(1),
			value: minimaxValue(child),
			terminal: isTerminal(child),
			best: rootSearch.best.includes(square) && rootSearch.best.length < children.length,
			expanded: square === expanded
		};
		nodes.push(node);
		connect(root, node);
		if (node.expanded) expandedNode = node;
	});

	if (expandedNode && expandedBoard && grandSearch) {
		const parent: TreeNode = expandedNode;
		const w2 = rowWidth(grandchildren.length);
		const centered = parent.x + TREE_BOARD / 2 - w2 / 2;
		const start2 = Math.min(Math.max(centered, TREE_LABEL), TREE_LABEL + content - w2);
		grandchildren.forEach((square, i) => {
			const g = result(expandedBoard, square);
			const node: TreeNode = {
				id: `g${expanded! + 1}-${square + 1}`,
				board: g,
				level: 2,
				square,
				parent: parent.id,
				x: start2 + i * (TREE_BOARD + TREE_GAP),
				y: levelY(2),
				value: minimaxValue(g),
				terminal: isTerminal(g),
				best: grandSearch.best.includes(square) && grandSearch.best.length < grandchildren.length,
				expanded: false
			};
			nodes.push(node);
			connect(parent, node);
		});
	}

	const levelsOut: TreeLevel[] = [{ level: 0, y: levelY(0), label: levelLabel([board]) }];
	if (children.length) {
		levelsOut.push({
			level: 1,
			y: levelY(1),
			label: levelLabel(children.map((s) => result(board, s)))
		});
	}
	if (expandedBoard && grandchildren.length) {
		levelsOut.push({
			level: 2,
			y: levelY(2),
			label: levelLabel(grandchildren.map((s) => result(expandedBoard, s)))
		});
	}

	return { nodes, edges, levels: levelsOut, width, height, expanded };
}
