/**
 * Game-tree search on tic-tac-toe (Games and Adversarial Search, slides
 * 10–11 and 21–25): minimax, alpha-beta pruning, depth-limited search with a
 * weighted evaluation function, and counts of the whole game tree.
 *
 * Conventions:
 * - Values are for MAX (X). Full searches use the slide 6 utilities (+1, 0,
 *   −1). Depth-limited searches score terminal states ±`WIN_SCORE` (0 for a
 *   draw) so a win always outranks an evaluation: each of the 8 lines counts
 *   toward at most one feature, so |Eval(s)| ≤ 8 · max |wᵢ| ≤ 80 < 100 when
 *   every weight is between −`MAX_WEIGHT` and `MAX_WEIGHT`.
 * - Successors in square order (1–9 row by row) unless an alpha-beta
 *   ordering says otherwise.
 * - Ties: the move returned is the first child in search order whose value
 *   equals the root's value ("return the action from node with value v",
 *   slides 21–22). In square order this is the first best square, and
 *   minimax and alpha-beta return the same move.
 * - Counts follow the plain recursion: `nodes` counts every call of
 *   Max-Value/Min-Value (Minimax), root included. Minimax results are
 *   memoized by board (5,478 positions), but the counts are those of the
 *   recursion without a table. Alpha-beta runs the slide pseudocode as is,
 *   with α = −∞ and β = +∞ at the root.
 * - Depth limit: the cutoff depth counts plies below the searched position;
 *   a non-terminal state at that depth is scored with Eval instead of being
 *   expanded. Terminal states are always scored with their utility.
 */
import {
	CELLS,
	EMPTY,
	EMPTY_BOARD,
	LINES,
	isFull,
	isTerminal,
	playerOf,
	toMove,
	utility,
	winner,
	type Board,
	type GamePlayer,
	type Mark
} from './tictactoe';

// ---------------------------------------------------------------------------
// Evaluation function (slide 24)
// ---------------------------------------------------------------------------

export type FeatureId = 'X2' | 'X1' | 'O2' | 'O1';

export interface Feature {
	id: FeatureId;
	/** Symbol as written in the weighted sum, e.g. "X₂(s)". */
	symbol: string;
	description: string;
}

/** The features, in the order of their weights w1…w4. */
export const FEATURES: readonly Feature[] = [
	{ id: 'X2', symbol: 'X₂(s)', description: 'lines with two X and no O' },
	{ id: 'X1', symbol: 'X₁(s)', description: 'lines with one X and no O' },
	{ id: 'O2', symbol: 'O₂(s)', description: 'lines with two O and no X' },
	{ id: 'O1', symbol: 'O₁(s)', description: 'lines with one O and no X' }
];

/** Weights w1…w4 of X₂, X₁, O₂, O₁. */
export type Weights = readonly [number, number, number, number];

/** Eval(s) = 3·X₂(s) + X₁(s) − 3·O₂(s) − O₁(s), the textbook's tic-tac-toe evaluation. */
export const DEFAULT_WEIGHTS: Weights = [3, 1, -3, -1];
/** Weights are whole numbers from −MAX_WEIGHT to MAX_WEIGHT. */
export const MAX_WEIGHT = 10;
/** Terminal score in depth-limited search: +WIN_SCORE when X wins, −WIN_SCORE when O wins. */
export const WIN_SCORE = 100;
export const MIN_DEPTH = 1;
export const MAX_DEPTH = 9;

export function isWeights(value: unknown): value is Weights {
	return (
		Array.isArray(value) &&
		value.length === 4 &&
		value.every((w) => typeof w === 'number' && Number.isInteger(w) && Math.abs(w) <= MAX_WEIGHT)
	);
}

/** Feature values [X₂, X₁, O₂, O₁] of a board. */
export function features(board: Board): [number, number, number, number] {
	const f: [number, number, number, number] = [0, 0, 0, 0];
	for (const [a, b, c] of LINES) {
		let x = 0;
		let o = 0;
		for (const s of [a, b, c]) {
			if (board[s] === 'X') x++;
			else if (board[s] === 'O') o++;
		}
		if (o === 0 && x === 2) f[0]++;
		else if (o === 0 && x === 1) f[1]++;
		else if (x === 0 && o === 2) f[2]++;
		else if (x === 0 && o === 1) f[3]++;
	}
	return f;
}

/** Eval(s) = w1·X₂(s) + w2·X₁(s) + w3·O₂(s) + w4·O₁(s). */
export function evaluate(board: Board, weights: Weights = DEFAULT_WEIGHTS): number {
	const f = features(board);
	return weights[0] * f[0] + weights[1] * f[1] + weights[2] * f[2] + weights[3] * f[3];
}

// ---------------------------------------------------------------------------
// Move ordering (slide 23)
// ---------------------------------------------------------------------------

export type MoveOrdering = 'squares' | 'center' | 'best';

export const MOVE_ORDERINGS: readonly MoveOrdering[] = ['squares', 'center', 'best'];

export const ORDERING_INFO: Record<MoveOrdering, { label: string; description: string }> = {
	squares: { label: 'Square order', description: 'squares 1–9 row by row' },
	center: {
		label: 'Center, corners, edges',
		description: 'square 5, then the corners 1, 3, 7, 9, then the edges 2, 4, 6, 8'
	},
	best: {
		label: 'Best move first',
		description:
			'perfect ordering: children sorted by their backed-up value, best for the player to move first'
	}
};

/** Square indices in center, corners, edges order. */
export const CENTER_CORNERS_EDGES: readonly number[] = [4, 0, 2, 6, 8, 1, 3, 5, 7];

export function isMoveOrdering(value: unknown): value is MoveOrdering {
	return MOVE_ORDERINGS.includes(value as MoveOrdering);
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface SearchCounts {
	/** Calls of Max-Value/Min-Value (Minimax), the root included. */
	nodes: number;
	/** Terminal states scored with their utility. */
	terminals: number;
	/** Non-terminal states at the cutoff depth scored with Eval. */
	evaluations: number;
	/** Early returns (v ≥ β in Max-Value, v ≤ α in Min-Value) that left children unsearched. */
	cutoffs: number;
	/** Children skipped by those returns, each with its whole subtree. */
	pruned: number;
}

/**
 * How a returned value relates to the child's true (backed-up) value:
 * `exact`, `upper` (the true value is at most this; alpha-beta at a MAX
 * root), or `lower` (at least this; at a MIN root). Minimax values are exact.
 */
export type Bound = 'exact' | 'upper' | 'lower';

export interface MoveValue {
	square: number;
	value: number;
	bound: Bound;
	/** Nodes visited in the child's subtree. */
	nodes: number;
}

export interface GameSearch {
	algorithm: 'minimax' | 'alphabeta';
	board: Board;
	/** The player to move at the root; null when the board is terminal. */
	player: GamePlayer | null;
	/** Cutoff depth, or null for a search to the end of the game. */
	depth: number | null;
	ordering: MoveOrdering;
	/** Backed-up value of the position for MAX. */
	value: number;
	/** The move returned: the first child in search order whose value equals `value`. */
	move: number | null;
	/** Squares whose exact value equals `value`, in square order. */
	best: number[];
	/** The root's children in search order. */
	moves: MoveValue[];
	counts: SearchCounts;
}

export interface SearchOptions {
	/** Cutoff depth in plies below the position (1–9); null or omitted: to the end of the game. */
	depth?: number | null;
	/** Evaluation weights for the cutoff (default `DEFAULT_WEIGHTS`). */
	weights?: Weights;
}

export interface AlphaBetaOptions extends SearchOptions {
	/** Order in which children are searched (default square order). */
	ordering?: MoveOrdering;
}

const zeroCounts = (): SearchCounts => ({
	nodes: 0,
	terminals: 0,
	evaluations: 0,
	cutoffs: 0,
	pruned: 0
});

function checkDepth(depth: number | null | undefined): number | null {
	if (depth === null || depth === undefined) return null;
	if (!Number.isInteger(depth) || depth < MIN_DEPTH) {
		throw new Error(`Cutoff depth must be a whole number ≥ ${MIN_DEPTH}: ${depth}`);
	}
	return depth;
}

const place = (board: Board, square: number, mark: Mark): Board =>
	board.slice(0, square) + mark + board.slice(square + 1);

function emptySquares(board: Board): number[] {
	const out: number[] = [];
	for (let i = 0; i < CELLS; i++) if (board[i] === EMPTY) out.push(i);
	return out;
}

function terminalSearch(
	algorithm: GameSearch['algorithm'],
	board: Board,
	depth: number | null,
	ordering: MoveOrdering
): GameSearch {
	return {
		algorithm,
		board,
		player: null,
		depth,
		ordering,
		value: utility(board) * (depth === null ? 1 : WIN_SCORE),
		move: null,
		best: [],
		moves: [],
		counts: { ...zeroCounts(), nodes: 1, terminals: 1 }
	};
}

// ---------------------------------------------------------------------------
// Minimax (slides 10–11), memoized by board
// ---------------------------------------------------------------------------

interface Entry {
	value: number;
	nodes: number;
	terminals: number;
	evaluations: number;
}

interface Table {
	/** Depth-limited: keys carry the remaining depth. */
	limited: boolean;
	weights: Weights;
	scale: number;
	entries: Map<string, Entry>;
}

const fullTable: Table = {
	limited: false,
	weights: DEFAULT_WEIGHTS,
	scale: 1,
	entries: new Map()
};
/** Depth-limited tables by weights ("3,1,-3,-1"); the oldest is dropped past `MAX_TABLES`. */
const limitedTables = new Map<string, Table>();
const MAX_TABLES = 12;

function tableFor(depth: number | null, weights: Weights): Table {
	if (depth === null) return fullTable;
	const key = weights.join(',');
	let t = limitedTables.get(key);
	if (t) {
		limitedTables.delete(key);
	} else {
		t = {
			limited: true,
			weights: [weights[0], weights[1], weights[2], weights[3]],
			scale: WIN_SCORE,
			entries: new Map()
		};
		if (limitedTables.size >= MAX_TABLES) {
			const oldest = limitedTables.keys().next().value as string;
			limitedTables.delete(oldest);
		}
	}
	limitedTables.set(key, t);
	return t;
}

/** Value and subtree counts of `board` with `remaining` plies before the cutoff (Infinity: none). */
function node(board: Board, remaining: number, t: Table): Entry {
	const key = t.limited ? board + remaining : board;
	const hit = t.entries.get(key);
	if (hit) return hit;
	let entry: Entry;
	const w = winner(board);
	if (w !== null || isFull(board)) {
		const u = w === 'X' ? 1 : w === 'O' ? -1 : 0;
		entry = { value: u * t.scale, nodes: 1, terminals: 1, evaluations: 0 };
	} else if (remaining === 0) {
		entry = { value: evaluate(board, t.weights), nodes: 1, terminals: 0, evaluations: 1 };
	} else {
		const mark = toMove(board);
		const max = mark === 'X';
		let v = max ? -Infinity : Infinity;
		let nodes = 1;
		let terminals = 0;
		let evaluations = 0;
		for (let i = 0; i < CELLS; i++) {
			if (board[i] !== EMPTY) continue;
			const c = node(place(board, i, mark), remaining - 1, t);
			v = max ? Math.max(v, c.value) : Math.min(v, c.value);
			nodes += c.nodes;
			terminals += c.terminals;
			evaluations += c.evaluations;
		}
		entry = { value: v, nodes, terminals, evaluations };
	}
	t.entries.set(key, entry);
	return entry;
}

/** Minimax value of `board` for MAX (full search: +1, 0, −1). Memoized. */
export function minimaxValue(board: Board, options: SearchOptions = {}): number {
	const depth = checkDepth(options.depth);
	const t = tableFor(depth, options.weights ?? DEFAULT_WEIGHTS);
	return node(board, depth ?? Infinity, t).value;
}

/**
 * Minimax (slide 11) from `board`: the value, the move, the value of every
 * legal move, and the counts of the plain recursion. With `depth`, a
 * depth-limited search that scores cut-off states with Eval.
 */
export function minimax(board: Board, options: SearchOptions = {}): GameSearch {
	const depth = checkDepth(options.depth);
	if (isTerminal(board)) return terminalSearch('minimax', board, depth, 'squares');
	const t = tableFor(depth, options.weights ?? DEFAULT_WEIGHTS);
	const remaining = depth ?? Infinity;
	const mark = toMove(board);
	const max = mark === 'X';
	const counts = zeroCounts();
	counts.nodes = 1;
	const moves: MoveValue[] = [];
	let value = max ? -Infinity : Infinity;
	for (const square of emptySquares(board)) {
		const c = node(place(board, square, mark), remaining - 1, t);
		moves.push({ square, value: c.value, bound: 'exact', nodes: c.nodes });
		value = max ? Math.max(value, c.value) : Math.min(value, c.value);
		counts.nodes += c.nodes;
		counts.terminals += c.terminals;
		counts.evaluations += c.evaluations;
	}
	const best = moves.filter((m) => m.value === value).map((m) => m.square);
	return {
		algorithm: 'minimax',
		board,
		player: playerOf(mark),
		depth,
		ordering: 'squares',
		value,
		move: best[0],
		best,
		moves,
		counts
	};
}

// ---------------------------------------------------------------------------
// Alpha-beta (slides 21–22)
// ---------------------------------------------------------------------------

interface AlphaBetaContext {
	counts: SearchCounts;
	table: Table;
	ordering: MoveOrdering;
}

/** The children of `board` in search order. `remaining` is the depth left at `board`. */
function ordered(board: Board, remaining: number, ctx: AlphaBetaContext): number[] {
	if (ctx.ordering === 'squares') return emptySquares(board);
	if (ctx.ordering === 'center') return CENTER_CORNERS_EDGES.filter((s) => board[s] === EMPTY);
	const mark = toMove(board);
	const sign = mark === 'X' ? -1 : 1;
	return emptySquares(board)
		.map((s) => ({ s, v: node(place(board, s, mark), remaining - 1, ctx.table).value }))
		.sort((a, b) => sign * (a.v - b.v) || a.s - b.s)
		.map((x) => x.s);
}

function leaf(board: Board, remaining: number, ctx: AlphaBetaContext): number | null {
	const w = winner(board);
	if (w !== null || isFull(board)) {
		ctx.counts.terminals++;
		return (w === 'X' ? 1 : w === 'O' ? -1 : 0) * ctx.table.scale;
	}
	if (remaining === 0) {
		ctx.counts.evaluations++;
		return evaluate(board, ctx.table.weights);
	}
	return null;
}

function maxValue(
	board: Board,
	alpha: number,
	beta: number,
	remaining: number,
	ctx: AlphaBetaContext
): number {
	ctx.counts.nodes++;
	const u = leaf(board, remaining, ctx);
	if (u !== null) return u;
	let v = -Infinity;
	const moves = ordered(board, remaining, ctx);
	for (let i = 0; i < moves.length; i++) {
		v = Math.max(v, minValue(place(board, moves[i], 'X'), alpha, beta, remaining - 1, ctx));
		if (v >= beta) {
			prune(moves.length - 1 - i, ctx);
			return v;
		}
		alpha = Math.max(alpha, v);
	}
	return v;
}

function minValue(
	board: Board,
	alpha: number,
	beta: number,
	remaining: number,
	ctx: AlphaBetaContext
): number {
	ctx.counts.nodes++;
	const u = leaf(board, remaining, ctx);
	if (u !== null) return u;
	let v = Infinity;
	const moves = ordered(board, remaining, ctx);
	for (let i = 0; i < moves.length; i++) {
		v = Math.min(v, maxValue(place(board, moves[i], 'O'), alpha, beta, remaining - 1, ctx));
		if (v <= alpha) {
			prune(moves.length - 1 - i, ctx);
			return v;
		}
		beta = Math.min(beta, v);
	}
	return v;
}

function prune(skipped: number, ctx: AlphaBetaContext): void {
	if (skipped <= 0) return;
	ctx.counts.cutoffs++;
	ctx.counts.pruned += skipped;
}

/**
 * Alpha-Beta-Search (slides 21–22) from `board`: Max-Value (X to move) or
 * Min-Value (O to move) with α = −∞ and β = +∞, returning the action whose
 * value equals v. Each root child's returned value is kept with its bound: at
 * a MAX root a child searched with α already above its value returns only an
 * upper bound (it was cut off), and symmetrically at a MIN root.
 */
export function alphaBeta(board: Board, options: AlphaBetaOptions = {}): GameSearch {
	const depth = checkDepth(options.depth);
	const ordering = options.ordering ?? 'squares';
	if (isTerminal(board)) return terminalSearch('alphabeta', board, depth, ordering);
	const ctx: AlphaBetaContext = {
		counts: zeroCounts(),
		table: tableFor(depth, options.weights ?? DEFAULT_WEIGHTS),
		ordering
	};
	const remaining = depth ?? Infinity;
	const mark = toMove(board);
	const max = mark === 'X';
	ctx.counts.nodes++;
	let alpha = -Infinity;
	let beta = Infinity;
	let v = max ? -Infinity : Infinity;
	const moves: MoveValue[] = [];
	const order = ordered(board, remaining, ctx);
	for (let i = 0; i < order.length; i++) {
		const square = order[i];
		const before = ctx.counts.nodes;
		const child = place(board, square, mark);
		let c: number;
		let bound: Bound;
		if (max) {
			c = minValue(child, alpha, beta, remaining - 1, ctx);
			bound = c > alpha ? 'exact' : 'upper';
		} else {
			c = maxValue(child, alpha, beta, remaining - 1, ctx);
			bound = c < beta ? 'exact' : 'lower';
		}
		moves.push({ square, value: c, bound, nodes: ctx.counts.nodes - before });
		if (max) {
			v = Math.max(v, c);
			if (v >= beta) break; // never: β = +∞ at the root
			alpha = Math.max(alpha, v);
		} else {
			v = Math.min(v, c);
			if (v <= alpha) break; // never: α = −∞ at the root
			beta = Math.min(beta, v);
		}
	}
	const move = moves.find((m) => m.value === v)!.square;
	const best = moves
		.filter((m) => m.bound === 'exact' && m.value === v)
		.map((m) => m.square)
		.sort((a, b) => a - b);
	return {
		algorithm: 'alphabeta',
		board,
		player: playerOf(mark),
		depth,
		ordering,
		value: v,
		move,
		best,
		moves,
		counts: ctx.counts
	};
}

// ---------------------------------------------------------------------------
// Whole-game counts
// ---------------------------------------------------------------------------

export interface TreeCounts {
	/** Nodes of the game tree below and including `board`. */
	nodes: number;
	/** Terminal nodes: complete games from `board`. */
	terminals: number;
	xWins: number;
	oWins: number;
	draws: number;
}

const treeTable = new Map<Board, TreeCounts>();

/** Size of the full game tree from `board` (memoized by board). From the empty board: 549,946 nodes, 255,168 games. */
export function gameTree(board: Board = EMPTY_BOARD): TreeCounts {
	const hit = treeTable.get(board);
	if (hit) return hit;
	let out: TreeCounts;
	if (isTerminal(board)) {
		const w = winner(board);
		out = {
			nodes: 1,
			terminals: 1,
			xWins: w === 'X' ? 1 : 0,
			oWins: w === 'O' ? 1 : 0,
			draws: w === null ? 1 : 0
		};
	} else {
		out = { nodes: 1, terminals: 0, xWins: 0, oWins: 0, draws: 0 };
		const mark = toMove(board);
		for (const s of emptySquares(board)) {
			const c = gameTree(place(board, s, mark));
			out.nodes += c.nodes;
			out.terminals += c.terminals;
			out.xWins += c.xWins;
			out.oWins += c.oWins;
			out.draws += c.draws;
		}
	}
	treeTable.set(board, out);
	return out;
}

/** Distinct boards reachable from `board` (itself included), in breadth-first order. */
export function reachableBoards(board: Board = EMPTY_BOARD): Board[] {
	const seen = new Set<Board>([board]);
	const out: Board[] = [board];
	for (let i = 0; i < out.length; i++) {
		const b = out[i];
		if (isTerminal(b)) continue;
		const mark = toMove(b);
		for (const s of emptySquares(b)) {
			const c = place(b, s, mark);
			if (!seen.has(c)) {
				seen.add(c);
				out.push(c);
			}
		}
	}
	return out;
}

export interface PositionCounts {
	/** Distinct boards, `board` included. */
	positions: number;
	terminal: number;
	xWins: number;
	oWins: number;
	draws: number;
}

/** Distinct positions reachable from `board`: 5,478 from the empty board, 958 of them terminal. */
export function reachablePositions(board: Board = EMPTY_BOARD): PositionCounts {
	const out: PositionCounts = { positions: 0, terminal: 0, xWins: 0, oWins: 0, draws: 0 };
	for (const b of reachableBoards(board)) {
		out.positions++;
		if (!isTerminal(b)) continue;
		out.terminal++;
		const w = winner(b);
		if (w === 'X') out.xWins++;
		else if (w === 'O') out.oWins++;
		else out.draws++;
	}
	return out;
}
