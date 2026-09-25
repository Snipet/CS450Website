/**
 * Names and sentences for search traces, in the lectures' words
 * (docs/ARCHITECTURE.md §3.1 and §3.3): strategy and queue names, the
 * priority labels drawn under search-tree nodes, and one sentence per step.
 */
import {
	DEFAULT_WEIGHT,
	pathTo,
	usesPriority,
	type SearchNode,
	type SearchResult,
	type SearchStep,
	type StrategyId
} from '$lib/theory/search';

/** What is written under a search-tree node (§3.2). */
export type Annotation = 'none' | 'g' | 'h' | 'f' | 'fgh';

export interface DescribeOptions {
	/** Display name of a node's state (default: `node.label`). */
	label?: (node: SearchNode) => string;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** Integers as is, other numbers with up to two decimals (1.41, 2.5); ∞ for Infinity. */
export function formatNumber(n: number): string {
	if (Number.isNaN(n)) return '–';
	if (!Number.isFinite(n)) return n > 0 ? '∞' : '−∞';
	if (Number.isInteger(n)) return String(n);
	const r = Math.round(n * 100) / 100;
	return String(Object.is(r, -0) ? 0 : r);
}

/** Counts with thousands separators: 10,000. */
export const formatCount = (n: number): string => n.toLocaleString('en-US');

const plural = (n: number, one: string, many = `${one}s`) =>
	`${formatCount(n)} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

const NAMES: Record<StrategyId, string> = {
	bfs: 'Breadth-first search',
	dfs: 'Depth-first search',
	dls: 'Depth-limited search',
	ids: 'Iterative deepening search',
	ucs: 'Uniform-cost search',
	greedy: 'Greedy best-first search',
	astar: 'A* search',
	wastar: 'Weighted A* search'
};

const SHORT: Record<StrategyId, string> = {
	bfs: 'BFS',
	dfs: 'DFS',
	dls: 'DLS',
	ids: 'IDS',
	ucs: 'UCS',
	greedy: 'Greedy',
	astar: 'A*',
	wastar: 'Weighted A*'
};

/** "Breadth-first search", "A* search", … */
export const strategyName = (s: StrategyId): string => NAMES[s];

/** "BFS", "DFS", "DLS", "IDS", "UCS", "Greedy", "A*", "Weighted A*". */
export const strategyShort = (s: StrategyId): string => SHORT[s];

/** The frontier data structure of a strategy (§3.1). */
export function queueName(s: StrategyId): string {
	switch (s) {
		case 'bfs':
			return 'FIFO queue';
		case 'dfs':
		case 'dls':
		case 'ids':
			return 'LIFO queue';
		case 'ucs':
			return 'Priority queue ordered by g(n)';
		case 'greedy':
			return 'Priority queue ordered by h(n)';
		case 'astar':
			return 'Priority queue ordered by f(n) = g(n) + h(n)';
		case 'wastar':
			return 'Priority queue ordered by g(n) + α·h(n)';
	}
}

/** The symbol of the value a strategy orders its frontier by, or null (BFS, DFS, DLS, IDS). */
export function prioritySymbol(s: StrategyId): 'g' | 'h' | 'f' | null {
	if (s === 'ucs') return 'g';
	if (s === 'greedy') return 'h';
	if (s === 'astar' || s === 'wastar') return 'f';
	return null;
}

/** The annotation the slides draw under tree nodes for a strategy (§3.2). */
export function defaultAnnotation(s: StrategyId): Annotation {
	if (s === 'ucs') return 'g';
	if (s === 'greedy') return 'h';
	if (s === 'astar' || s === 'wastar') return 'fgh';
	return 'none';
}

// ---------------------------------------------------------------------------
// Node labels
// ---------------------------------------------------------------------------

const hOf = (node: SearchNode) => node.h ?? 0;

/**
 * Text under a search-tree node: `g` "140", `h` "253", `f` "393", `fgh`
 * "393=140+253" (weighted A*: "646=140+2·253"), `none` "". `h` is empty when
 * the problem has no heuristic.
 */
export function annotationText(
	node: SearchNode,
	annotation: Annotation,
	strategy: StrategyId,
	weight: number = DEFAULT_WEIGHT
): string {
	const g = formatNumber(node.g);
	const h = formatNumber(hOf(node));
	const weighted = strategy === 'wastar';
	const f = formatNumber(weighted ? node.g + weight * hOf(node) : node.g + hOf(node));
	switch (annotation) {
		case 'g':
			return g;
		case 'h':
			return node.h === null ? '' : h;
		case 'f':
			return f;
		case 'fgh':
			return weighted ? `${f}=${g}+${formatNumber(weight)}·${h}` : `${f}=${g}+${h}`;
		default:
			return '';
	}
}

/**
 * The frontier priority of a node as the slides write it: A* "393=140+253",
 * weighted A* "646=140+2·253", UCS "140", greedy "253"; "" for BFS, DFS, DLS, IDS.
 */
export function priorityLabel(
	s: StrategyId,
	node: SearchNode,
	weight: number = DEFAULT_WEIGHT
): string {
	switch (s) {
		case 'ucs':
			return annotationText(node, 'g', s, weight);
		case 'greedy':
			return formatNumber(hOf(node));
		case 'astar':
		case 'wastar':
			return annotationText(node, 'fgh', s, weight);
		default:
			return '';
	}
}

/** "g = 140", "h = 253", "f = 393"; null for strategies without priorities. */
export function priorityPhrase(
	s: StrategyId,
	node: SearchNode,
	weight: number = DEFAULT_WEIGHT
): string | null {
	const symbol = prioritySymbol(s);
	if (!symbol) return null;
	const value =
		s === 'ucs'
			? node.g
			: s === 'greedy'
				? hOf(node)
				: s === 'wastar'
					? node.g + weight * hOf(node)
					: node.g + hOf(node);
	return `${symbol} = ${formatNumber(value)}`;
}

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------

/** "A", "A and B", "A, B, and C". */
function listNames(names: readonly string[]): string {
	if (names.length <= 1) return names[0] ?? '';
	if (names.length === 2) return `${names[0]} and ${names[1]}`;
	return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

const isAre = (n: number) => (n === 1 ? 'is' : 'are');

function nameFn(opts: DescribeOptions) {
	return opts.label ?? ((n: SearchNode) => n.label);
}

/** "Arad → Sibiu → … → Bucharest" for the path from the root to `id`. */
function pathText(result: SearchResult, id: number, name: (n: SearchNode) => string): string {
	return pathTo(result.nodes, id)
		.map((k) => name(result.nodes[k]))
		.join(' → ');
}

/**
 * The frontier node for the same state that a dropped child (`outcome:
 * 'frontier'`) was compared with: the newest live frontier node for that state
 * created before the child.
 */
function frontierRival(result: SearchResult, child: SearchNode): SearchNode | null {
	const step = child.created;
	for (let id = child.id - 1; id >= 0; id--) {
		const n = result.nodes[id];
		if (n.iteration !== child.iteration) break;
		if (n.key !== child.key) continue;
		if (n.outcome !== null && n.outcome !== 'added' && n.outcome !== 'replaced') continue;
		if (n.closed !== null && n.closed <= step) continue;
		if (n.replacedAt !== null && n.replacedAt < step) continue;
		return n;
	}
	return null;
}

/** The node a replacing child pushed off the frontier. */
function replacedRival(result: SearchResult, child: SearchNode): SearchNode | null {
	for (let id = child.id - 1; id >= 0; id--) {
		const n = result.nodes[id];
		if (n.iteration !== child.iteration) break;
		if (n.key === child.key && n.replacedAt === child.created) return n;
	}
	return null;
}

/** Notes on children that were not simply added, grouped by reason in order of first appearance. */
function childNotes(
	result: SearchResult,
	children: readonly SearchNode[],
	name: (n: SearchNode) => string
): string[] {
	const priority = usesPriority(result.strategy);
	const groups = new Map<string, SearchNode[]>();
	const notes: { key: string; text: () => string }[] = [];
	const group = (key: string, child: SearchNode, text: (list: SearchNode[]) => string) => {
		const list = groups.get(key);
		if (list) {
			list.push(child);
			return;
		}
		const fresh = [child];
		groups.set(key, fresh);
		notes.push({ key, text: () => text(fresh) });
	};
	const names = (list: SearchNode[]) => listNames(list.map(name));

	for (const c of children) {
		switch (c.outcome) {
			case 'explored':
				group(
					'explored',
					c,
					(l) => `${names(l)} ${isAre(l.length)} in the explored set; not added.`
				);
				break;
			case 'on-path':
				group(
					'on-path',
					c,
					(l) => `${names(l)} ${isAre(l.length)} already on this path; not added.`
				);
				break;
			case 'frontier': {
				const rival = priority ? frontierRival(result, c) : null;
				if (!rival) {
					group(
						'frontier',
						c,
						(l) => `${names(l)} ${isAre(l.length)} already on the frontier; not added.`
					);
				} else {
					const how = rival.g < c.g ? 'a lower' : 'the same';
					notes.push({
						key: `frontier-${c.id}`,
						text: () =>
							`${name(c)} is already on the frontier with ${how} path cost (${formatNumber(rival.g)}); not added.`
					});
				}
				break;
			}
			case 'replaced': {
				const old = replacedRival(result, c);
				notes.push({
					key: `replaced-${c.id}`,
					text: () =>
						old
							? `${name(c)} (path cost ${formatNumber(c.g)}) replaces ${name(old)} (path cost ${formatNumber(old.g)}) on the frontier.`
							: `${name(c)} (path cost ${formatNumber(c.g)}) replaces a costlier frontier node for the same state.`
				});
				break;
			}
			case 'goal':
				notes.push({ key: `goal-${c.id}`, text: () => `${name(c)} contains the goal state.` });
				break;
		}
	}
	return notes.map((n) => n.text());
}

/** Nodes taken off the frontier up to and including step `index`. */
function poppedThrough(result: SearchResult, index: number): number {
	let count = 0;
	for (let k = 0; k <= index; k++) {
		const kind = result.steps[k].kind;
		if (kind === 'expand' || kind === 'cutoff') count++;
		else if (kind === 'goal') {
			const node = result.nodes[result.steps[k].node!];
			if (node.closed === k) count++;
		}
	}
	return count;
}

function failSentence(result: SearchResult, index: number, step: SearchStep): string {
	const limited = result.strategy === 'ids' || result.strategy === 'dls';
	const limit = step.iteration;
	switch (step.reason) {
		case 'cutoff': {
			const cut = `The frontier is empty and nodes were cut off at the depth limit ${limit}`;
			if (result.strategy === 'ids') {
				return index < result.steps.length - 1
					? `${cut}: start again with depth limit ${limit + 1}.`
					: `${cut}, the largest limit: stop without a solution.`;
			}
			return `${cut}: no solution within the limit.`;
		}
		case 'limit': {
			const popped = poppedThrough(result, index);
			if (popped >= result.options.maxExpansions) {
				return `Stop after taking ${plural(popped, 'node')} off the frontier (the limit for this run); no solution found yet.`;
			}
			return `Stop after generating ${plural(step.generated, 'node')} (the limit for this run); no solution found yet.`;
		}
		default:
			return limited
				? `The frontier is empty and no node was cut off at the depth limit ${limit}: return failure (no solution).`
				: 'The frontier is empty: return failure (no solution).';
	}
}

/**
 * The sentence for step `index` (§3.3), e.g. "Take Sibiu off the frontier
 * (f = 393). Not a goal; expand it: Arad, Fagaras, Oradea, Rimnicu Vilcea."
 * Returns "" for an index outside the trace.
 */
export function describeStep(
	result: SearchResult,
	index: number,
	opts: DescribeOptions = {}
): string {
	const step = result.steps[index];
	if (!step) return '';
	const name = nameFn(opts);
	const weight = result.options.weight;
	const node = step.node === null ? null : result.nodes[step.node];

	if (step.kind === 'fail' || !node) return failSentence(result, index, step);

	const prio = priorityPhrase(result.strategy, node, weight);
	const take = `Take ${name(node)} off the frontier${prio ? ` (${prio})` : ''}.`;

	switch (step.kind) {
		case 'init': {
			if (result.strategy === 'ids')
				return `Start iteration with depth limit ${step.iteration}: initialize the frontier with ${name(node)}.`;
			if (result.strategy === 'dls')
				return `Initialize the frontier with ${name(node)} (depth limit ${step.iteration}).`;
			return `Initialize the frontier with ${name(node)}.`;
		}
		case 'expand': {
			const children = step.children.map((id) => result.nodes[id]);
			const expand = children.length
				? `Not a goal; expand it: ${children.map(name).join(', ')}.`
				: 'Not a goal, and it has no successors.';
			return [take, expand, ...childNotes(result, children, name)].join(' ');
		}
		case 'cutoff':
			return `${take} Not a goal. ${name(node)} is at the depth limit ${step.iteration}; not expanded.`;
		case 'goal': {
			const solution = `return the solution ${pathText(result, node.id, name)} (cost ${formatNumber(node.g)}).`;
			if (node.closed === index)
				return `Take ${name(node)} off the frontier. It contains the goal state: ${solution}`;
			// Goal test at generation.
			return `${name(node)} contains the goal state (tested when generated): ${solution}`;
		}
	}
	return '';
}

/**
 * One or two sentences on how the search ended: the solution with its cost,
 * or why there is none, plus the node counts.
 */
export function describeResult(result: SearchResult, opts: DescribeOptions = {}): string {
	const name = nameFn(opts);
	const { popped, expanded, generated } = result.stats;
	const counts = `${plural(popped, 'node')} taken off the frontier, ${formatCount(expanded)} expanded, ${formatCount(generated)} generated.`;
	const sol = result.solution;
	if (sol) {
		const path = sol.path.map((id) => name(result.nodes[id])).join(' → ');
		const iteration =
			result.strategy === 'ids'
				? ` Found in the iteration with depth limit ${result.nodes[sol.node].iteration}.`
				: '';
		return `Solution: ${path} (cost ${formatNumber(sol.cost)}).${iteration} ${counts}`;
	}
	const lastIteration = result.iterations.at(-1)?.limit ?? result.options.depthLimit;
	switch (result.failure) {
		case 'cutoff':
			return result.strategy === 'ids'
				? `No solution up to the largest depth limit, ${lastIteration}; nodes were still cut off. ${counts}`
				: `No solution within the depth limit ${lastIteration}; nodes were cut off. ${counts}`;
		case 'limit':
			return popped >= result.options.maxExpansions
				? `No solution found before the limit of ${plural(result.options.maxExpansions, 'node')} taken off the frontier. ${counts}`
				: `No solution found before the limit of ${plural(result.options.maxNodes, 'generated node')}. ${counts}`;
		default:
			return result.strategy === 'ids' || result.strategy === 'dls'
				? `No solution: the frontier emptied without cutting off any node. ${counts}`
				: `No solution: the frontier emptied. ${counts}`;
	}
}
