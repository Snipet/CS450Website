/**
 * Legend entries for the search drawings: which status colors (§3.2) a
 * drawing uses right now, in a fixed order, with their captions.
 */
import type { TreeNodeStatus } from './tree-view';

export type LegendKey =
	| 'current'
	| 'frontier'
	| 'expanded'
	| 'explored'
	| 'goal'
	| 'path'
	| 'dropped'
	| 'cutoff'
	| 'replaced'
	| 'heuristic';

export const LEGEND_ORDER: readonly LegendKey[] = [
	'current',
	'frontier',
	'expanded',
	'explored',
	'goal',
	'path',
	'dropped',
	'cutoff',
	'replaced',
	'heuristic'
];

export const LEGEND_TEXT: Record<LegendKey, string> = {
	current: 'Being expanded',
	frontier: 'On the frontier',
	expanded: 'Expanded',
	explored: 'Expanded (explored)',
	goal: 'Goal state',
	path: 'Solution path',
	dropped: 'Not added (repeated state)',
	cutoff: 'Cut off at the depth limit',
	replaced: 'Replaced on the frontier',
	heuristic: 'h(n) estimate'
};

/** Highlight of a state graph (state names), as `StateGraph` takes it. */
export interface GraphHighlight {
	current?: string;
	frontier?: readonly string[];
	explored?: readonly string[];
	path?: readonly string[];
	dropped?: readonly string[];
}

const ordered = (keys: Set<LegendKey>): LegendKey[] => LEGEND_ORDER.filter((k) => keys.has(k));

/** Legend entries for a state graph with this highlight. */
export function graphLegend(
	highlight: GraphHighlight | undefined,
	opts: { goals?: readonly string[]; heuristic?: boolean } = {}
): LegendKey[] {
	const keys = new Set<LegendKey>();
	if (highlight?.current) keys.add('current');
	if (highlight?.frontier?.length) keys.add('frontier');
	if (highlight?.explored?.length) keys.add('explored');
	if (highlight?.path && highlight.path.length > 0) keys.add('path');
	if (highlight?.dropped?.length) keys.add('dropped');
	if (opts.goals?.length) keys.add('goal');
	if (opts.heuristic) keys.add('heuristic');
	return ordered(keys);
}

/** Legend entries for a search tree with these node statuses (see `countStatuses`). */
export function treeLegend(
	counts: Partial<Record<TreeNodeStatus, number>>,
	opts: { current?: boolean; path?: boolean } = {}
): LegendKey[] {
	const keys = new Set<LegendKey>();
	if (opts.current || counts.current) keys.add('current');
	if (counts.frontier) keys.add('frontier');
	if (counts.expanded) keys.add('expanded');
	if (counts.goal) keys.add('goal');
	if (opts.path) keys.add('path');
	if (counts.dropped) keys.add('dropped');
	if (counts.cutoff) keys.add('cutoff');
	if (counts.replaced) keys.add('replaced');
	return ordered(keys);
}
