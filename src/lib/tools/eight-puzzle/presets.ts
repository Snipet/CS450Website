/**
 * Example boards for the 8-puzzle tool. Solution depths are optimal lengths
 * checked by breadth-first graph search in presets.spec.ts.
 */
import type { Preset } from '$lib/components/ui';
import type { Citation } from '$lib/lectures';
import { SLIDE_GOAL, SLIDE_START, formatBoard, type Board } from '$lib/theory/puzzle';

export interface PuzzleScenario {
	start: Board;
	goal: Board;
	/** Moves in an optimal solution; null when the goal cannot be reached. */
	depth: number | null;
}

const scenario = (start: Board, depth: number | null, goal: Board = SLIDE_GOAL) => ({
	start,
	goal,
	depth
});

/** Typical search costs are averaged by solution depth on Informed Search slide 36. */
const DEPTH_CITE: Citation = { deck: 'informed', slide: 36 };

const byDepth = (depth: number, start: Board): Preset<PuzzleScenario> => ({
	id: `depth-${depth}`,
	label: `${depth} moves from the goal`,
	group: 'By solution depth',
	description: formatBoard(start),
	cite: DEPTH_CITE,
	value: scenario(start, depth)
});

export const PUZZLE_PRESETS: readonly Preset<PuzzleScenario>[] = [
	{
		id: 'slide',
		label: 'Slide start state',
		group: 'From the slides',
		description: `${formatBoard(SLIDE_START)} to ${formatBoard(SLIDE_GOAL)}; 26 moves`,
		cite: { deck: 'informed', slide: 32 },
		value: scenario(SLIDE_START, 26)
	},
	byDepth(4, '320415678'),
	byDepth(8, '350421678'),
	byDepth(12, '431802657'),
	byDepth(20, '257804361'),
	byDepth(24, '283475061'),
	{
		id: 'depth-31',
		label: '31 moves from the goal',
		group: 'By solution depth',
		description: `${formatBoard('806547231')}: one of the two boards farthest from the goal`,
		cite: DEPTH_CITE,
		value: scenario('806547231', 31)
	},
	{
		id: 'unsolvable',
		label: 'Tiles 7 and 8 swapped',
		group: 'Unsolvable',
		description: `${formatBoard('012345687')}: odd inversion count, so the goal cannot be reached`,
		cite: { deck: 'search', slide: 10 },
		value: scenario('012345687', null)
	}
];

/** The preset loaded when the page opens. */
export const DEFAULT_PRESET = PUZZLE_PRESETS[0];
