/**
 * Recursive best-first search (RBFS), as in Russell & Norvig, Artificial
 * Intelligence: A Modern Approach, 3rd ed., Section 3.5.3, Figure 3.26. The
 * Informed Search slides list RBFS (slide 4) without covering it.
 *
 * ```
 * function RECURSIVE-BEST-FIRST-SEARCH(problem) returns a solution, or failure
 *   return RBFS(problem, MAKE-NODE(problem.INITIAL-STATE), ∞)
 *
 * function RBFS(problem, node, f_limit) returns a solution, or failure and a new f-cost limit
 *   if problem.GOAL-TEST(node.STATE) then return SOLUTION(node)
 *   successors ← [ ]
 *   for each action in problem.ACTIONS(node.STATE) do
 *     add CHILD-NODE(problem, node, action) into successors
 *   if successors is empty then return failure, ∞
 *   for each s in successors do   // update f with value from previous search, if any
 *     s.f ← max(s.g + s.h, node.f)
 *   loop do
 *     best ← the lowest f-value node in successors
 *     if best.f > f_limit then return failure, best.f
 *     alternative ← the second-lowest f-value among successors
 *     result, best.f ← RBFS(problem, best, min(f_limit, alternative))
 *     if result ≠ failure then return result
 * ```
 *
 * Conventions:
 * - Tree search, as in the book: no repeated-state check, so a node's parent
 *   is among its successors (Sibiu → Arad).
 * - Successors in the problem's order (name order for graphs, §3.4); `best`
 *   is the first successor with the lowest f, and `alternative` the first
 *   other successor with the lowest f among the rest (ties: successor order).
 * - The root's f is g + h = h(initial state); h = 0 when the problem has none.
 * - A call whose best successor has f = ∞ (every path below it ended in a
 *   dead end) returns failure, ∞ even when f_limit = ∞. As printed, the loop
 *   would call that successor again forever when f_limit = ∞.
 * - Expansions count calls that pass the goal test and generate successors,
 *   including dead ends (no successors), as in `search`. Generated counts
 *   every node created (root included), so a node regenerated after its
 *   subtree was forgotten counts again.
 *
 * The search runs iteratively (an explicit stack of calls), so long paths do
 * not overflow the call stack, and stops at `maxExpansions`.
 */
import type { SearchProblem } from './types';

export const DEFAULT_RBFS_MAX_EXPANSIONS = 10_000;

export interface RbfsOptions {
	/** Stop before expanding more nodes than this (default 10 000). */
	maxExpansions?: number;
	/** Record the step trace (default true). Counts and the solution are kept either way. */
	record?: boolean;
}

/** One node of the search tree. A regenerated node is a new node at the same tree position. */
export interface RbfsNode {
	id: number;
	parent: number | null;
	key: string;
	label: string;
	/** Action that produced the node from its parent (null for the root). */
	action: string | null;
	depth: number;
	/** Path cost g(n). */
	g: number;
	/** Heuristic h(n) (0 when the problem has none). */
	h: number;
	/**
	 * f when generated: max(g + h, f of the parent node at that time). The
	 * root's f is g + h. Backed-up values replace it later (see `stackAt`).
	 */
	f: number;
	/** Tree position (the path from the root); a node and its regenerations share it. */
	position: number;
	/** Whether a node at this position was generated before and forgotten. */
	regenerated: boolean;
	/** Index of the step that generated it (0 for the root). */
	created: number;
}

/** Running totals after a step. */
export interface RbfsCounts {
	/** Calls that generated successors (dead ends included). */
	expanded: number;
	/** Expansions of a tree position expanded before (after its subtree was forgotten). */
	reexpanded: number;
	/** Nodes generated, root and regenerations included. */
	generated: number;
	/** Nodes generated at a position where a node had been generated before. */
	regenerated: number;
	/** Nodes kept in memory after the step: the root plus the successor lists of the open calls. */
	stored: number;
}

interface StepBase {
	/** The node of the RBFS call that runs the step. */
	node: number;
	/** f_limit of that call. */
	fLimit: number;
	counts: RbfsCounts;
}

/** The call's node is not a goal; its successors are generated with their f values. */
export interface RbfsExpandStep extends StepBase {
	kind: 'expand';
	/** Successors in successor order (node ids; their f is `RbfsNode.f`). */
	children: number[];
}

/** The call's node is not a goal and has no successors: return failure, ∞. */
export interface RbfsDeadEndStep extends StepBase {
	kind: 'dead-end';
	/** f of the node before ∞ is backed up to it (null for the root). */
	previous: number | null;
}

/** best.f ≤ f_limit: call RBFS(best, min(f_limit, alternative)). */
export interface RbfsCallStep extends StepBase {
	kind: 'call';
	best: number;
	bestF: number;
	/** The successor with the second-lowest f; null when there is only one successor. */
	alternative: number | null;
	/** Its f (∞ when there is none). */
	alternativeF: number;
	/** The f_limit passed down: min(f_limit, alternative). */
	limit: number;
}

/**
 * best.f > f_limit (or best.f = ∞): return failure, best.f. The value replaces
 * the node's f in its parent's successor list (backed up) and the node's
 * successors are forgotten.
 */
export interface RbfsReturnStep extends StepBase {
	kind: 'return';
	best: number;
	bestF: number;
	/** f of the node before the value is backed up to it (null for the root). */
	previous: number | null;
}

/** The call's node passes the goal test: the solution is returned through every open call. */
export interface RbfsGoalStep extends StepBase {
	kind: 'goal';
}

/** The search ends without a solution. */
export interface RbfsFailStep {
	kind: 'fail';
	/** `exhausted`: the root's call returned failure. `limit`: `maxExpansions` stopped the search. */
	reason: RbfsFailure;
	/** The call that was about to expand (limit), else the root. */
	node: number;
	fLimit: number;
	counts: RbfsCounts;
}

export type RbfsStep =
	RbfsExpandStep | RbfsDeadEndStep | RbfsCallStep | RbfsReturnStep | RbfsGoalStep | RbfsFailStep;

export type RbfsStepKind = RbfsStep['kind'];
export type RbfsFailure = 'exhausted' | 'limit';

export interface RbfsSolution {
	node: number;
	/** Node ids from the root to the goal. */
	path: number[];
	actions: string[];
	/** State labels from the initial state to the goal. */
	states: string[];
	cost: number;
	depth: number;
}

export interface RbfsStats extends Omit<RbfsCounts, 'stored'> {
	/** Depth of the deepest node RBFS was called on (root 0): the recursion was maxDepth + 1 calls deep. */
	maxDepth: number;
	/** Most nodes kept in memory at once (the root plus the successor lists of the open calls). */
	maxStored: number;
}

export interface RbfsResult {
	options: Required<RbfsOptions>;
	nodes: RbfsNode[];
	/** Empty when recorded without a trace. */
	steps: RbfsStep[];
	solution: RbfsSolution | null;
	failure: RbfsFailure | null;
	/** Labels of the nodes RBFS was called on (goal-tested), in order, including the goal. */
	order: string[];
	stats: RbfsStats;
}

/** A successor as an open call keeps it: the node and its current f. */
export interface RbfsEntry {
	id: number;
	f: number;
}

/** An open RBFS call. */
export interface RbfsFrame {
	node: number;
	fLimit: number;
	/** Successors in successor order with their current f values (empty before the expansion). */
	successors: RbfsEntry[];
	/** Index in `successors` of the call made from this frame, if one is open. */
	calling: number | null;
}

export function normalizeRbfsOptions(options: RbfsOptions = {}): Required<RbfsOptions> {
	const max = options.maxExpansions;
	return {
		maxExpansions:
			max === undefined || Number.isNaN(max)
				? DEFAULT_RBFS_MAX_EXPANSIONS
				: Math.max(1, Math.floor(max)),
		record: options.record ?? true
	};
}

/** The successor with the lowest f, and the first other one with the lowest f among the rest. */
export function bestAndAlternative(entries: readonly RbfsEntry[]): {
	best: number;
	alternative: number | null;
} {
	let best = 0;
	for (let i = 1; i < entries.length; i++) if (entries[i].f < entries[best].f) best = i;
	let alternative: number | null = null;
	for (let i = 0; i < entries.length; i++) {
		if (i === best) continue;
		if (alternative === null || entries[i].f < entries[alternative].f) alternative = i;
	}
	return { best, alternative };
}

/** Runs RECURSIVE-BEST-FIRST-SEARCH and returns its nodes, step trace, solution, and counts. */
export function rbfs<S>(problem: SearchProblem<S>, options: RbfsOptions = {}): RbfsResult {
	const opts = normalizeRbfsOptions(options);
	const { maxExpansions, record } = opts;

	const nodes: RbfsNode[] = [];
	const stateOf: S[] = [];
	const steps: RbfsStep[] = [];
	const order: string[] = [];
	const positions = new Map<string, number>();
	const expandedPositions = new Set<number>();
	let stepCount = 0;
	let expanded = 0;
	let reexpanded = 0;
	let generated = 0;
	let regenerated = 0;
	let stored = 0;
	let maxDepth = 0;
	let maxStored = 0;

	const label = (s: S) => (problem.label ? problem.label(s) : problem.key(s));
	const hOf = (s: S) => (problem.h ? problem.h(s) : 0);

	function makeNode(
		state: S,
		parent: number | null,
		action: string | null,
		cost: number,
		index: number,
		parentF: number
	): number {
		const p = parent === null ? null : nodes[parent];
		const g = p ? p.g + cost : 0;
		const h = hOf(state);
		const posKey = p ? `${p.position}:${index}` : 'root';
		let position = positions.get(posKey);
		const again = position !== undefined;
		if (position === undefined) {
			position = positions.size;
			positions.set(posKey, position);
		}
		const id = nodes.length;
		nodes.push({
			id,
			parent,
			key: problem.key(state),
			label: label(state),
			action,
			depth: p ? p.depth + 1 : 0,
			g,
			h,
			f: Math.max(g + h, parentF),
			position,
			regenerated: again,
			created: stepCount
		});
		stateOf.push(state);
		generated++;
		if (again) regenerated++;
		return id;
	}

	const frames: RbfsFrame[] = [];

	const counts = (): RbfsCounts => ({ expanded, reexpanded, generated, regenerated, stored });

	type StepInput =
		| Omit<RbfsExpandStep, 'counts'>
		| Omit<RbfsDeadEndStep, 'counts'>
		| Omit<RbfsCallStep, 'counts'>
		| Omit<RbfsReturnStep, 'counts'>
		| Omit<RbfsGoalStep, 'counts'>
		| Omit<RbfsFailStep, 'counts'>;

	function recordStep(step: StepInput) {
		if (record) steps.push({ ...step, counts: counts() } as RbfsStep);
		stepCount++;
	}

	/** f of the node of frame `k`: its entry in the parent's list, or the root's own f. */
	const frameF = (k: number): number => {
		if (k === 0) return nodes[frames[0].node].f;
		const parent = frames[k - 1];
		return parent.successors[parent.calling!].f;
	};

	let solution: number | null = null;
	let failure: RbfsFailure | null = null;

	const root = makeNode(problem.initial, null, null, 0, 0, -Infinity);
	stored = 1;
	maxStored = 1;
	frames.push({ node: root, fLimit: Infinity, successors: [], calling: null });

	const fail = () => {
		failure = 'exhausted';
		recordStep({ kind: 'fail', reason: 'exhausted', node: root, fLimit: Infinity });
	};

	/** Pops the top frame, backing `value` up to its node in the parent's list. False at the root. */
	function popWith(value: number): boolean {
		const frame = frames.pop()!;
		stored -= frame.successors.length;
		if (frames.length === 0) {
			stored = 0;
			return false;
		}
		const parent = frames[frames.length - 1];
		parent.successors[parent.calling!].f = value;
		parent.calling = null;
		return true;
	}

	/** A frame was just pushed: goal test it, then expand it (a dead end returns at once). */
	function enter() {
		const k = frames.length - 1;
		const frame = frames[k];
		const node = nodes[frame.node];
		const state = stateOf[frame.node];
		order.push(node.label);
		maxDepth = Math.max(maxDepth, node.depth);
		if (problem.isGoal(state)) {
			solution = frame.node;
			recordStep({ kind: 'goal', node: frame.node, fLimit: frame.fLimit });
			return;
		}
		if (expanded >= maxExpansions) {
			failure = 'limit';
			recordStep({ kind: 'fail', reason: 'limit', node: frame.node, fLimit: frame.fLimit });
			return;
		}
		expanded++;
		if (expandedPositions.has(node.position)) reexpanded++;
		else expandedPositions.add(node.position);
		const f = frameF(k);
		const succ = problem.successors(state);
		if (succ.length === 0) {
			const more = popWith(Infinity);
			recordStep({
				kind: 'dead-end',
				node: frame.node,
				fLimit: frame.fLimit,
				previous: k === 0 ? null : f
			});
			if (!more) fail();
			return;
		}
		const children = succ.map((s, i) => makeNode(s.state, frame.node, s.action, s.cost, i, f));
		frame.successors = children.map((id) => ({ id, f: nodes[id].f }));
		stored += children.length;
		maxStored = Math.max(maxStored, stored);
		recordStep({ kind: 'expand', node: frame.node, fLimit: frame.fLimit, children });
	}

	enter();
	while (solution === null && failure === null) {
		const k = frames.length - 1;
		const frame = frames[k];
		const { best, alternative } = bestAndAlternative(frame.successors);
		const bestEntry = frame.successors[best];
		if (bestEntry.f > frame.fLimit || bestEntry.f === Infinity) {
			const previous = k === 0 ? null : frameF(k);
			const more = popWith(bestEntry.f);
			recordStep({
				kind: 'return',
				node: frame.node,
				fLimit: frame.fLimit,
				best: bestEntry.id,
				bestF: bestEntry.f,
				previous
			});
			if (!more) fail();
			continue;
		}
		const alternativeF = alternative === null ? Infinity : frame.successors[alternative].f;
		const limit = Math.min(frame.fLimit, alternativeF);
		frame.calling = best;
		recordStep({
			kind: 'call',
			node: frame.node,
			fLimit: frame.fLimit,
			best: bestEntry.id,
			bestF: bestEntry.f,
			alternative: alternative === null ? null : frame.successors[alternative].id,
			alternativeF,
			limit
		});
		frames.push({ node: bestEntry.id, fLimit: limit, successors: [], calling: null });
		enter();
	}

	return {
		options: opts,
		nodes,
		steps,
		solution: solution === null ? null : solutionOf(nodes, solution),
		failure: solution === null ? failure : null,
		order,
		stats: { expanded, reexpanded, generated, regenerated, maxDepth, maxStored }
	};
}

/** Node ids from the root down to `id`. */
export function rbfsPath(nodes: readonly RbfsNode[], id: number): number[] {
	const path: number[] = [];
	for (let n: number | null = id; n !== null; n = nodes[n].parent) path.push(n);
	return path.reverse();
}

function solutionOf(nodes: readonly RbfsNode[], goal: number): RbfsSolution {
	const path = rbfsPath(nodes, goal);
	return {
		node: goal,
		path,
		actions: path.slice(1).map((id) => nodes[id].action ?? ''),
		states: path.map((id) => nodes[id].label),
		cost: nodes[goal].g,
		depth: nodes[goal].depth
	};
}

/** The open calls before the first step: the root's call, not yet expanded. */
export function initialStack(result: RbfsResult): RbfsFrame[] {
	return result.nodes.length ? [{ node: 0, fLimit: Infinity, successors: [], calling: null }] : [];
}

/** Applies one step to the open calls (in place), as the search did. */
export function applyRbfsStep(result: RbfsResult, frames: RbfsFrame[], step: RbfsStep): void {
	const top = frames[frames.length - 1];
	switch (step.kind) {
		case 'expand':
			top.successors = step.children.map((id) => ({ id, f: result.nodes[id].f }));
			break;
		case 'call':
			top.calling = top.successors.findIndex((e) => e.id === step.best);
			frames.push({ node: step.best, fLimit: step.limit, successors: [], calling: null });
			break;
		case 'return':
		case 'dead-end': {
			frames.pop();
			const parent = frames[frames.length - 1];
			if (parent && parent.calling !== null) {
				parent.successors[parent.calling].f = step.kind === 'return' ? step.bestF : Infinity;
				parent.calling = null;
			}
			break;
		}
		case 'fail':
			if (step.reason === 'exhausted') frames.length = 0;
			break;
		case 'goal':
			break;
	}
}

/**
 * The open calls after step `index` (root first), with every stored
 * successor's current f: what RBFS keeps in memory. Replays the trace, so it
 * costs O(index); a negative index gives the state before the first step.
 * Calls stay open after a goal step (the solution is returned through them)
 * and after a limit stop; after the root's call fails there are none.
 */
export function stackAt(result: RbfsResult, index: number): RbfsFrame[] {
	const frames = initialStack(result);
	const last = Math.min(index, result.steps.length - 1);
	for (let i = 0; i <= last; i++) applyRbfsStep(result, frames, result.steps[i]);
	return frames;
}

/** The current f of every stored node (the open calls' nodes included), by node id. */
export function storedF(result: RbfsResult, frames: readonly RbfsFrame[]): Map<number, number> {
	const out = new Map<number, number>();
	if (frames.length === 0) return out;
	out.set(frames[0].node, result.nodes[frames[0].node].f);
	for (const fr of frames) for (const e of fr.successors) out.set(e.id, e.f);
	return out;
}
