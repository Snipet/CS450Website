/**
 * Numbers quoted from the slides, for the reference tables next to the tool.
 */

/**
 * Typical search costs for the 8-puzzle: average number of nodes expanded
 * for different solution depths (Informed Search, slide 36).
 */
export const TYPICAL_COSTS: readonly {
	depth: number;
	ids: string;
	astarH1: string;
	astarH2: string;
}[] = [
	{ depth: 12, ids: '3,644,035', astarH1: '227', astarH2: '73' },
	{ depth: 24, ids: '≈ 54,000,000,000', astarH1: '39,135', astarH2: '1,641' }
];

/** State-space sizes of sliding-tile puzzles (Solving Problems by Searching, slide 10). */
export const STATE_SPACE_SIZES: readonly { puzzle: string; states: string; note?: string }[] = [
	{ puzzle: '8-puzzle', states: '181,440', note: '9!/2' },
	{ puzzle: '15-puzzle', states: '~1.3 trillion' },
	{ puzzle: '24-puzzle', states: '~10²⁵' }
];
