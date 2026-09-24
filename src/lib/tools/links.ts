/**
 * Cross-tool links. Each tool accepts the state shape listed here in its URL
 * hash (its own saved state may add fields), so any tool can open another one
 * on a specific example: "Open in the search tool", "Check this heuristic",
 * and so on.
 */
import type { RepeatMode, StrategyId } from '$lib/theory/search';
import { encode } from '$lib/url-state';
import { toolHref } from '$lib/site';
import { toolBySlug } from './registry';

export interface LinkStates {
	/** `graph` uses the graph text format (formatGraphText). */
	search: { graph: string; strategy?: StrategyId; mode?: RepeatMode };
	heuristics: { graph: string };
	strategies: { graph?: string };
	'state-spaces': { problem?: 'vacuum' | 'romania' | 'puzzle'; squares?: number };
	/** Boards as nine digits, row by row, 0 for the blank ("724506831"). */
	'eight-puzzle': { start: string; goal?: string };
	/** `grid` uses the grid text encoding (encodeGrid). */
	grid: { grid: string };
	environments: { preset?: string };
	vacuum: { program?: string };
}

export type LinkSlug = keyof LinkStates;

/**
 * URL of `slug` opened on `state`, or null when that tool is not part of the
 * site (so callers can hide the link rather than point at a missing page).
 */
export function toolLink<S extends LinkSlug>(slug: S, state: LinkStates[S]): string | null {
	if (!toolBySlug(slug)) return null;
	return `${toolHref(slug)}#${encode(state)}`;
}
