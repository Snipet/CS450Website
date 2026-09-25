/**
 * Tree search and graph search (Solving Problems by Searching, slides 28 and
 * 36) with every strategy from the uninformed and informed search lectures.
 *
 * Conventions (docs/ARCHITECTURE.md §3.4): successors are generated in the
 * order the problem lists them; DFS expands the first successor first; the
 * goal test runs when a node is taken off the frontier; priority ties go to
 * the node added first; in graph mode a child whose state is on the frontier
 * replaces that node only under a priority strategy and only when its path
 * cost is lower.
 */
import { createFrontier, type FrontierKind } from './frontier';
import type {
	ChildOutcome,
	FailReason,
	IterationInfo,
	SearchNode,
	SearchOptions,
	SearchProblem,
	SearchResult,
	SearchStep,
	Solution,
	StepKind,
	StrategyId
} from './types';

export const DEFAULT_MAX_EXPANSIONS = 10_000;
export const DEFAULT_MAX_NODES = 200_000;
export const DEFAULT_DLS_LIMIT = 3;
export const DEFAULT_IDS_MAX_LIMIT = 50;
export const DEFAULT_WEIGHT = 2;

/** The frontier data structure a strategy uses. */
export function frontierKind(strategy: StrategyId): FrontierKind {
	switch (strategy) {
		case 'bfs':
			return 'fifo';
		case 'dfs':
		case 'dls':
		case 'ids':
			return 'lifo';
		default:
			return 'priority';
	}
}

/** Whether the strategy orders its frontier by a priority (UCS, greedy, A*, weighted A*). */
export function usesPriority(strategy: StrategyId): boolean {
	return frontierKind(strategy) === 'priority';
}

/** Whether the strategy reads h(n). */
export function usesHeuristic(strategy: StrategyId): boolean {
	return strategy === 'greedy' || strategy === 'astar' || strategy === 'wastar';
}

/** Options with every default filled in. */
export function normalizeOptions(options: SearchOptions): Required<SearchOptions> {
	const s = options.strategy;
	const limit = numberOr(
		options.depthLimit,
		s === 'ids' ? DEFAULT_IDS_MAX_LIMIT : s === 'dls' ? DEFAULT_DLS_LIMIT : 0
	);
	return {
		strategy: s,
		mode: options.mode ?? 'tree',
		depthLimit: Math.max(0, Math.floor(limit)),
		weight: numberOr(options.weight, DEFAULT_WEIGHT),
		goalTest: options.goalTest ?? 'expand',
		maxExpansions: Math.max(1, Math.floor(numberOr(options.maxExpansions, DEFAULT_MAX_EXPANSIONS))),
		maxNodes: Math.max(1, Math.floor(numberOr(options.maxNodes, DEFAULT_MAX_NODES))),
		record: options.record ?? 'full'
	};
}

/** `value`, or `fallback` when it is missing or NaN (NaN would disable every limit check). */
function numberOr(value: number | undefined, fallback: number): number {
	return value === undefined || Number.isNaN(value) ? fallback : value;
}

/** Priority of a node with path cost g and heuristic h under a strategy (null: no priority). */
export function priorityOf(
	strategy: StrategyId,
	g: number,
	h: number | null,
	weight = DEFAULT_WEIGHT
): number | null {
	const hv = h ?? 0;
	switch (strategy) {
		case 'ucs':
			return g;
		case 'greedy':
			return hv;
		case 'astar':
			return g + hv;
		case 'wastar':
			return g + weight * hv;
		default:
			return null;
	}
}

interface RunOutcome {
	solution: number | null;
	failure: FailReason | null;
	cutoff: boolean;
}

/** Runs a search and returns its nodes, step trace, solution, and statistics. */
export function search<S>(problem: SearchProblem<S>, options: SearchOptions): SearchResult {
	const opts = normalizeOptions(options);
	const { strategy, mode, goalTest, maxExpansions, maxNodes, record, weight } = opts;
	const full = record === 'full';
	const keepSteps = record !== 'summary';
	const keepDropped = record !== 'summary';
	const kind = frontierKind(strategy);
	const priority = kind === 'priority';

	const nodes: SearchNode[] = [];
	const stateOf: S[] = [];
	const steps: SearchStep[] = [];
	const order: string[] = [];
	const iterations: IterationInfo[] = [];
	let stepCount = 0;
	let popped = 0;
	let expanded = 0;
	let generated = 0;
	let maxFrontier = 0;
	let exploredSize = 0;

	const label = (s: S) => (problem.label ? problem.label(s) : problem.key(s));
	const hOf = (s: S) => (problem.h ? problem.h(s) : null);

	function makeNode(
		state: S,
		parent: number | null,
		action: string | null,
		stepCost: number,
		iteration: number,
		outcome: ChildOutcome | null
	): number {
		const p = parent === null ? null : nodes[parent];
		const g = p ? p.g + stepCost : 0;
		const h = hOf(state);
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
			priority: priorityOf(strategy, g, h, weight),
			iteration,
			outcome,
			created: stepCount,
			closed: null,
			replacedAt: null
		});
		stateOf.push(state);
		return id;
	}

	function onPath(nodeId: number, key: string): boolean {
		for (let n: number | null = nodeId; n !== null; n = nodes[n].parent) {
			if (nodes[n].key === key) return true;
		}
		return false;
	}

	/** One tree/graph search; `limit` makes it depth-limited (DLS). */
	function runOnce(limit: number | null, iteration: number): RunOutcome {
		const frontier = createFrontier(kind);
		const explored = new Set<string>();
		const exploredOrder: string[] = [];
		const inFrontier = new Map<string, number>();
		const iterOrder: string[] = [];
		const firstStep = stepCount;
		let cutoff = false;

		const recordStep = (
			k: StepKind,
			node: number | null,
			children: number[] = [],
			reason?: FailReason
		) => {
			if (keepSteps) {
				const step: SearchStep = {
					kind: k,
					node,
					children,
					iteration,
					expanded,
					generated
				};
				if (reason) step.reason = reason;
				if (full) {
					step.frontier = frontier.snapshot();
					if (mode === 'graph') step.explored = [...exploredOrder];
				}
				steps.push(step);
			}
			stepCount++;
		};

		const finish = (out: RunOutcome): RunOutcome => {
			if (limit !== null) {
				iterations.push({
					limit,
					firstStep,
					lastStep: stepCount - 1,
					order: iterOrder,
					found: out.solution !== null,
					cutoff
				});
			}
			return out;
		};

		const root = makeNode(problem.initial, null, null, 0, iteration, null);
		generated++;
		if (goalTest === 'generate' && problem.isGoal(problem.initial)) {
			recordStep('init', root);
			recordStep('goal', root);
			return finish({ solution: root, failure: null, cutoff });
		}
		frontier.push(root, nodes[root].priority ?? 0);
		if (mode === 'graph') inFrontier.set(nodes[root].key, root);
		maxFrontier = Math.max(maxFrontier, frontier.size);
		recordStep('init', root);

		for (;;) {
			if (frontier.size === 0) {
				const reason: FailReason = cutoff ? 'cutoff' : 'exhausted';
				recordStep('fail', null, [], reason);
				return finish({ solution: null, failure: reason, cutoff });
			}
			if (popped >= maxExpansions || generated >= maxNodes) {
				recordStep('fail', null, [], 'limit');
				return finish({ solution: null, failure: 'limit', cutoff });
			}

			const id = frontier.pop()!;
			const node = nodes[id];
			const state = stateOf[id];
			if (mode === 'graph' && inFrontier.get(node.key) === id) inFrontier.delete(node.key);
			node.closed = stepCount;
			popped++;
			order.push(node.label);
			iterOrder.push(node.label);

			if (goalTest === 'expand' && problem.isGoal(state)) {
				recordStep('goal', id);
				return finish({ solution: id, failure: null, cutoff });
			}
			if (limit !== null && node.depth >= limit) {
				cutoff = true;
				recordStep('cutoff', id);
				continue;
			}

			expanded++;
			if (mode === 'graph' && !explored.has(node.key)) {
				explored.add(node.key);
				exploredOrder.push(node.key);
				exploredSize = Math.max(exploredSize, explored.size);
			}

			const children: number[] = [];
			const toPush: number[] = [];
			let goalChild: number | null = null;
			for (const succ of problem.successors(state)) {
				const key = problem.key(succ.state);
				const g = node.g + succ.cost;
				let outcome: ChildOutcome = 'added';
				let replaces: number | null = null;
				if (mode === 'path' && onPath(id, key)) outcome = 'on-path';
				else if (mode === 'graph' && explored.has(key)) outcome = 'explored';
				else if (mode === 'graph' && inFrontier.has(key)) {
					const existing = inFrontier.get(key)!;
					if (priority && g < nodes[existing].g) {
						outcome = 'replaced';
						replaces = existing;
					} else outcome = 'frontier';
				}
				generated++;
				const added = outcome === 'added' || outcome === 'replaced';
				if (!added && !keepDropped) continue;

				const child = makeNode(succ.state, id, succ.action, succ.cost, iteration, outcome);
				children.push(child);
				if (!added) continue;
				if (replaces !== null) {
					// A sibling generated earlier in this expansion (parallel edges) is
					// still waiting to be pushed; drop it there instead.
					const pending = toPush.indexOf(replaces);
					if (pending >= 0) toPush.splice(pending, 1);
					else frontier.remove(replaces);
					nodes[replaces].replacedAt = stepCount;
				}
				if (goalTest === 'generate' && problem.isGoal(succ.state)) {
					nodes[child].outcome = 'goal';
					goalChild = child;
					break;
				}
				toPush.push(child);
				if (mode === 'graph') inFrontier.set(key, child);
			}

			if (kind === 'lifo') toPush.reverse();
			for (const c of toPush) frontier.push(c, nodes[c].priority ?? 0);
			maxFrontier = Math.max(maxFrontier, frontier.size);
			recordStep('expand', id, children);

			if (goalChild !== null) {
				recordStep('goal', goalChild);
				return finish({ solution: goalChild, failure: null, cutoff });
			}
		}
	}

	let outcome: RunOutcome;
	if (strategy === 'ids') {
		outcome = { solution: null, failure: 'cutoff', cutoff: true };
		for (let limit = 0; limit <= opts.depthLimit; limit++) {
			outcome = runOnce(limit, limit);
			if (outcome.solution !== null || outcome.failure !== 'cutoff') break;
		}
	} else if (strategy === 'dls') {
		outcome = runOnce(opts.depthLimit, opts.depthLimit);
	} else {
		outcome = runOnce(null, 0);
	}

	return {
		strategy,
		mode,
		options: opts,
		nodes,
		steps,
		solution: outcome.solution === null ? null : solutionOf(nodes, outcome.solution),
		failure: outcome.solution === null ? outcome.failure : null,
		order,
		iterations,
		stats: { popped, expanded, generated, maxFrontier, explored: exploredSize }
	};
}

/** Node ids from the root of `id`'s tree down to `id`. */
export function pathTo(nodes: readonly SearchNode[], id: number): number[] {
	const path: number[] = [];
	for (let n: number | null = id; n !== null; n = nodes[n].parent) path.push(n);
	return path.reverse();
}

function solutionOf(nodes: readonly SearchNode[], goal: number): Solution {
	const path = pathTo(nodes, goal);
	return {
		node: goal,
		path,
		actions: path.slice(1).map((id) => nodes[id].action ?? ''),
		states: path.map((id) => nodes[id].label),
		cost: nodes[goal].g,
		depth: nodes[goal].depth
	};
}

/**
 * Ids of nodes on the frontier after step `index`, for results recorded
 * without snapshots. Unordered (ascending id); use `SearchStep.frontier` for
 * the pop order when it was recorded.
 */
export function frontierAfter(result: SearchResult, index: number): number[] {
	const step = result.steps[index];
	if (step?.frontier) return step.frontier;
	const iteration = step?.iteration ?? 0;
	// With the goal test at generation the goal node never enters the frontier
	// (this matters for a root that is already a goal: its outcome stays null).
	const neverPushed = result.options.goalTest === 'generate' ? result.solution?.node : undefined;
	const out: number[] = [];
	for (const n of result.nodes) {
		if (n.created > index) break;
		if (n.iteration !== iteration) continue;
		if (n.id === neverPushed) continue;
		if (n.outcome !== null && n.outcome !== 'added' && n.outcome !== 'replaced') continue;
		if (n.closed !== null && n.closed <= index) continue;
		if (n.replacedAt !== null && n.replacedAt <= index) continue;
		out.push(n.id);
	}
	return out;
}
