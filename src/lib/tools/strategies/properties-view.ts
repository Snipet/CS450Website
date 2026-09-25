/**
 * How the strategy table writes its cells: the greedy row's "Worst case:
 * O(bᵐ); best case: O(bd)" on two lines, and one cell for time and space
 * where the slide merges them.
 */
import type { StrategyProperties } from '$lib/theory/search';

/** Splits a complexity entry at "; " into lines, each starting with a capital letter. */
export function complexityLines(text: string): string[] {
	return text
		.split(/;\s*/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
		.map((s) => s[0].toUpperCase() + s.slice(1));
}

/**
 * Rows whose time and space share one cell on the slides (Uninformed Search
 * slide 45, Informed Search slide 42): UCS, greedy, and A*. BFS has O(bᵈ) in
 * both columns, written twice.
 */
const MERGED: ReadonlySet<StrategyProperties['strategy']> = new Set(['ucs', 'greedy', 'astar']);

/** Whether a row draws time and space as one cell, as the slide does. */
export function mergesTimeAndSpace(p: Pick<StrategyProperties, 'strategy' | 'time' | 'space'>) {
	return MERGED.has(p.strategy) && p.time === p.space;
}
