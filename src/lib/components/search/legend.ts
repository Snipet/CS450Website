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
	/** States whose node was cut off at the depth limit at this step (DLS, IDS). */
	cutoff?: readonly string[];
}

/** Status keys a state of a state graph can have (the legend keys it draws). */
export type GraphStatusKey = Extract<
	LegendKey,
	'current' | 'path' | 'frontier' | 'explored' | 'dropped' | 'cutoff' | 'goal'
>;

/** How a state graph names a state's status in the state's accessible name. */
export const GRAPH_STATUS_WORDS: Record<GraphStatusKey, string> = {
	current: 'being expanded',
	path: 'on the solution path',
	frontier: 'on the frontier',
	explored: 'explored',
	dropped: 'not added',
	cutoff: 'cut off at the depth limit',
	goal: 'goal state'
};

/**
 * The words for a status in a state's accessible name: the page's own text
 * (`statusText`, which also captions the legend) with a leading capital
 * lowered ("Overestimates h*" → "overestimates h*"; "A* …" stays), else the
 * default words.
 */
export function statusWord(
	key: GraphStatusKey,
	statusText?: Partial<Record<LegendKey, string>>
): string {
	const text = statusText?.[key]?.trim();
	if (!text) return GRAPH_STATUS_WORDS[key];
	return /^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
}

const ordered = (keys: Set<LegendKey>): LegendKey[] => LEGEND_ORDER.filter((k) => keys.has(k));

/**
 * Legend entries for a state graph with this highlight. A state on the
 * solution path or being expanded is drawn in that color, so the frontier and
 * explored entries count only the states they color.
 */
export function graphLegend(
	highlight: GraphHighlight | undefined,
	opts: { goals?: readonly string[]; heuristic?: boolean } = {}
): LegendKey[] {
	const keys = new Set<LegendKey>();
	const onPath = new Set(highlight?.path ?? []);
	const shown = (id: string) => !onPath.has(id) && id !== highlight?.current;
	if (highlight?.current) keys.add('current');
	if (highlight?.frontier?.some(shown)) keys.add('frontier');
	if (highlight?.explored?.some(shown)) keys.add('explored');
	if (highlight?.path && highlight.path.length > 0) keys.add('path');
	if (highlight?.dropped?.length) keys.add('dropped');
	if (highlight?.cutoff?.length) keys.add('cutoff');
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
