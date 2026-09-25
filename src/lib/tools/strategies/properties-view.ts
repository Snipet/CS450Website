/**
 * How the strategy table writes its complexity cells: the greedy row's
 * "Worst case: O(bᵐ); best case: O(bd)" on two lines, as on the slide.
 */

/** Splits a complexity entry at "; " into lines, each starting with a capital letter. */
export function complexityLines(text: string): string[] {
	return text
		.split(/;\s*/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
		.map((s) => s[0].toUpperCase() + s.slice(1));
}
