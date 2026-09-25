/**
 * Step sentences for grid searches. A full sentence follows the lecture
 * wording (docs/ARCHITECTURE.md §3.3) through `describeStep`, except that the
 * goal step reports the path length and cost instead of listing every cell.
 * The short form is one clause per search for side-by-side runs.
 */
import { describeStep, formatNumber, priorityPhrase } from '$lib/components/search/describe';
import type { SearchResult } from '$lib/theory/search';

const plural = (n: number, one: string, many = `${one}s`) =>
	`${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * A path cost: integers as they are (4-connected paths), other costs with two
 * decimals ("27.31", "24.80"); "–" for NaN, "∞" for Infinity.
 */
export function formatCost(cost: number): string {
	if (!Number.isFinite(cost) || Number.isInteger(cost)) return formatNumber(cost);
	return cost.toFixed(2);
}

/** "203 cells expanded, 68 on the frontier". */
export function stepCounts(expanded: number, frontier: number): string {
	return `${plural(expanded, 'cell')} expanded, ${frontier.toLocaleString('en-US')} on the frontier`;
}

/** "24 moves, cost 27.31". */
export function pathSummary(moves: number, cost: number): string {
	return `${plural(moves, 'move')}, cost ${formatCost(cost)}`;
}

/** The sentence for step `index` of a grid search. */
export function describeGridStep(result: SearchResult, index: number): string {
	const step = result.steps[index];
	if (!step) return '';
	if (step.kind === 'goal' && step.node !== null) {
		const node = result.nodes[step.node];
		return `Take ${node.label} off the frontier. It contains the goal state: return the solution path (${pathSummary(node.depth, node.g)}).`;
	}
	if (step.kind === 'fail' && step.reason === 'exhausted') {
		return 'The frontier is empty: return failure (walls cut the goal off from the start).';
	}
	return describeStep(result, index);
}

/**
 * A short clause for step `index`, e.g. "expands (8, 17) (f = 22.63); 5 cells
 * added". Past the last step it reports how the search ended.
 */
export function shortGridStep(result: SearchResult, index: number): string {
	const last = result.steps.length - 1;
	const step = result.steps[Math.min(index, last)];
	if (!step) return '';
	const finished = index > last;
	const node = step.node === null ? null : result.nodes[step.node];
	switch (step.kind) {
		case 'init':
			return `starts with ${node?.label ?? 'the start'} on the frontier`;
		case 'expand': {
			const prio = node ? priorityPhrase(result.strategy, node, result.options.weight) : null;
			const added = step.children.filter((id) => {
				const o = result.nodes[id].outcome;
				return o === 'added' || o === 'replaced';
			}).length;
			return `expands ${node?.label}${prio ? ` (${prio})` : ''}; ${plural(added, 'cell')} added to the frontier`;
		}
		case 'goal': {
			const when = finished ? ` at step ${last + 1}` : '';
			return `found the goal${when}: ${pathSummary(node!.depth, node!.g)}`;
		}
		case 'fail':
			return step.reason === 'exhausted'
				? 'the frontier is empty: no path to the goal'
				: 'stopped at the search limit';
		default:
			return '';
	}
}
