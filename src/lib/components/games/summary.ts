/**
 * Accessible summary and legend entries of a game tree drawing.
 */
import { nodeName, playerAt, playerAtDepth, type GameTree } from '$lib/theory/games';
import { formatBound, type GameTreeDisplay, type NodeStatus } from './types';

export type LegendItem = 'current' | 'open' | 'done' | 'unvisited' | 'pruned' | 'beyond' | 'best';

export const LEGEND_TEXT: Record<LegendItem, string> = {
	current: 'Current node',
	open: 'Being searched',
	done: 'Value known',
	unvisited: 'Not reached yet',
	pruned: 'Pruned',
	beyond: 'Beyond the cutoff',
	best: 'Best action'
};

const ORDER: readonly LegendItem[] = [
	'current',
	'open',
	'done',
	'unvisited',
	'pruned',
	'beyond',
	'best'
];

/** The legend entries for what is on screen. */
export function legendItems(display: GameTreeDisplay): LegendItem[] {
	const present = new Set<LegendItem>();
	display.status.forEach((s: NodeStatus, id) => {
		if (id === display.current) present.add('current');
		else present.add(s);
	});
	if (display.best !== null) present.add('best');
	return ORDER.filter((k) => present.has(k));
}

/** Whether any value label is a bound (≥ or ≤). */
export const hasBounds = (display: GameTreeDisplay): boolean =>
	display.labels.some((l) => l?.kind === 'lower' || l?.kind === 'upper');

/** One-paragraph description of the drawing for screen readers. */
export function treeSummary(
	tree: GameTree,
	display: GameTreeDisplay,
	order: readonly number[] = []
): string {
	const leaves = tree.nodes.filter((n) => !n.children.length).length;
	const who = tree.tuples
		? `player ${playerAtDepth(order, 0)} to move at the root`
		: `${playerAt(tree, 0) === 'max' ? 'MAX' : 'MIN'} to move at the root`;
	const parts = [`Game tree with ${tree.nodes.length} nodes and ${leaves} terminal nodes, ${who}`];
	if (display.current !== null) parts.push(`current node ${nodeName(tree, display.current)}`);
	if (display.bounds)
		parts.push(
			`at ${nodeName(tree, display.bounds.node)} α = ${formatBound(display.bounds.alpha)}, β = ${formatBound(display.bounds.beta)}`
		);
	const values = tree.nodes
		.filter((n) => display.labels[n.id])
		.map((n) => `${nodeName(tree, n.id)} ${display.labels[n.id]!.text}`);
	if (values.length)
		parts.push(
			`values ${values.slice(0, 20).join(', ')}${values.length > 20 ? `, and ${values.length - 20} more` : ''}`
		);
	if (display.cut.size)
		parts.push(`pruned ${[...display.cut].map((id) => nodeName(tree, id)).join(', ')}`);
	if (display.best !== null) parts.push(`best action ${nodeName(tree, display.best)}`);
	return `${parts.join('; ')}.`;
}
