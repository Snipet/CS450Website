/**
 * Cross-tool links. Each tool accepts the state shape listed here in its URL
 * hash (its own saved state may add fields), so any tool can open another one
 * on a specific example: "Open in the search tool", "Check this heuristic",
 * and so on.
 */
import type { GridHeuristic } from '$lib/theory/grid';
import type { RepeatMode, StrategyId } from '$lib/theory/search';
import { encode } from '$lib/url-state';
import { toolHref } from '$lib/site';
import type { ApproachId } from './approaches/content';
import type { GridAlgorithm } from './grid/state';
import { toolBySlug } from './registry';

export interface LinkStates {
	/** `graph` uses the graph text format (formatGraphText). */
	search: {
		graph: string;
		strategy?: StrategyId;
		mode?: RepeatMode;
		/** Weighted A* α. */
		weight?: number;
		/** DLS limit, or the largest IDS limit. */
		depthLimit?: number;
		goalTest?: 'expand' | 'generate';
	};
	heuristics: { graph: string };
	strategies: { graph?: string; mode?: RepeatMode };
	'state-spaces': { problem?: 'vacuum' | 'romania' | 'puzzle' | 'robot'; squares?: number };
	/** Boards as nine digits, row by row, 0 for the blank ("724506831"). */
	'eight-puzzle': { start: string; goal?: string };
	/** `grid` uses the grid text encoding (encodeGrid). */
	grid: {
		grid: string;
		algorithm?: GridAlgorithm;
		compare?: GridAlgorithm | null;
		diagonal?: boolean;
		heuristic?: GridHeuristic;
		weight?: number;
	};
	environments: { preset?: string };
	vacuum: {
		program?: 'reflex' | 'reflex-state' | 'random' | 'table';
		/** A vacuum state name such as "A DD" (agent in A, both squares dirty). */
		initial?: string;
		measure?: 'clean-squares' | 'clean-minus-moves';
	};
	approaches: { approach?: ApproachId };
	history: { era?: string | null };
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
