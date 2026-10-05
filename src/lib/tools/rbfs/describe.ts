/**
 * One sentence per RBFS step, in the style of the search tool's step
 * descriptions (docs/ARCHITECTURE.md §3.3), and a closing summary. Every
 * sentence starts with the call that runs the step: "RBFS(Rimnicu Vilcea,
 * f_limit = 415): best Pitesti (f = 417) exceeds the limit; return failure
 * and back up f = 417 to Rimnicu Vilcea."
 */
import { formatCount, formatNumber } from '$lib/components/search/describe';
import { rbfsPath, type RbfsNode, type RbfsResult } from '$lib/theory/search/rbfs';

const plural = (n: number, one: string, many = `${one}s`) =>
	`${formatCount(n)} ${n === 1 ? one : many}`;

/** "RBFS(Sibiu, f_limit = 447)". */
export function callText(name: string, fLimit: number): string {
	return `RBFS(${name}, f_limit = ${formatNumber(fLimit)})`;
}

/** A successor with its f: "Sibiu (f = 393)", or "Pitesti (f = max(400, 417) = 417)" when raised to the parent's f. */
function withF(n: RbfsNode): string {
	const gh = n.g + n.h;
	if (n.f > gh)
		return `${n.label} (f = max(${formatNumber(gh)}, ${formatNumber(n.f)}) = ${formatNumber(n.f)})`;
	return `${n.label} (f = ${formatNumber(n.f)})`;
}

function pathText(result: RbfsResult, id: number): string {
	return rbfsPath(result.nodes, id)
		.map((k) => result.nodes[k].label)
		.join(' → ');
}

/** Whether a node at the same tree position was expanded before step `index`. */
function expandedBefore(result: RbfsResult, index: number, node: RbfsNode): boolean {
	for (let i = 0; i < index; i++) {
		const s = result.steps[i];
		if (
			(s.kind === 'expand' || s.kind === 'dead-end') &&
			result.nodes[s.node].position === node.position
		)
			return true;
	}
	return false;
}

/** The sentence for step `index`; "" for an index outside the trace. */
export function describeStep(result: RbfsResult, index: number): string {
	const step = result.steps[index];
	if (!step) return '';
	const node = result.nodes[step.node];
	const call = callText(node.label, step.fLimit);

	switch (step.kind) {
		case 'expand': {
			const again = expandedBefore(result, index, node);
			const what = again ? 'expand it again (its successors were forgotten)' : 'expand it';
			const list = step.children.map((c) => withF(result.nodes[c])).join(', ');
			return `${call}: ${node.label} is not a goal; ${what}: ${list}.`;
		}
		case 'dead-end':
			return step.previous === null
				? `${call}: ${node.label} is not a goal and has no successors; return failure, ∞.`
				: `${call}: ${node.label} is not a goal and has no successors; return failure and back up f = ∞ to ${node.label}.`;
		case 'call': {
			const best = result.nodes[step.best];
			const alt =
				step.alternative === null
					? 'no alternative (∞)'
					: `alternative ${result.nodes[step.alternative].label} (f = ${formatNumber(step.alternativeF)})`;
			const limit = `min(${formatNumber(step.fLimit)}, ${formatNumber(step.alternativeF)}) = ${formatNumber(step.limit)}`;
			return `${call}: best ${best.label} (f = ${formatNumber(step.bestF)}) is within the limit; ${alt}. Call RBFS(${best.label}, f_limit = ${limit}).`;
		}
		case 'return': {
			const best = result.nodes[step.best];
			const why =
				step.bestF === Infinity
					? 'every successor has f = ∞ (no goal below it)'
					: `best ${best.label} (f = ${formatNumber(step.bestF)}) exceeds the limit`;
			return step.previous === null
				? `${call}: ${why}; return failure, ${formatNumber(step.bestF)}.`
				: `${call}: ${why}; return failure and back up f = ${formatNumber(step.bestF)} to ${node.label}.`;
		}
		case 'goal':
			return `${call}: ${node.label} is a goal; return the solution ${pathText(result, node.id)} (cost ${formatNumber(node.g)}).`;
		case 'fail':
			return step.reason === 'limit'
				? `Stop after ${plural(step.counts.expanded, 'expansion')} (the limit for this run); no solution found yet.`
				: `${callText(node.label, Infinity)} returned failure: no solution.`;
	}
}

/** "Solution: … (cost 418). 6 expansions (1 repeated), 19 nodes generated (3 regenerated), …" */
export function describeResult(result: RbfsResult): string {
	const s = result.stats;
	const head = result.solution
		? `Solution: ${result.solution.states.join(' → ')} (cost ${formatNumber(result.solution.cost)}).`
		: result.failure === 'limit'
			? `No solution within ${plural(result.options.maxExpansions, 'expansion')}.`
			: 'No solution: the root’s call returned failure.';
	const counts = [
		`${plural(s.expanded, 'expansion')}${s.reexpanded ? ` (${formatCount(s.reexpanded)} repeated)` : ''}`,
		`${plural(s.generated, 'node')} generated${s.regenerated ? ` (${formatCount(s.regenerated)} regenerated)` : ''}`,
		`deepest call at depth ${formatCount(s.maxDepth)}`,
		`at most ${plural(s.maxStored, 'node')} stored`
	];
	return `${head} ${counts.join(', ')}.`;
}
