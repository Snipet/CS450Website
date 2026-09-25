import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'eight-puzzle',
	title: '8-puzzle',
	summary:
		'Slides tiles on a 3 × 3 board, computes the misplaced-tiles (h1) and Manhattan-distance (h2) heuristics, checks solvability, and solves any board with BFS, IDS, greedy best-first, A*, and weighted A*, then steps through the solution.',
	topic: 'informed',
	order: 20,
	cites: [
		{ deck: 'search', slide: 10 },
		{ deck: 'informed', slide: [32, 37] }
	],
	keywords: [
		'8-puzzle',
		'eight puzzle',
		'sliding tile',
		'15-puzzle',
		'heuristic',
		'misplaced tiles',
		'Manhattan distance',
		'h1',
		'h2',
		'admissible',
		'dominance',
		'relaxed problem',
		'pattern database',
		'inversions',
		'solvable',
		'A*',
		'IDS',
		'BFS',
		'greedy',
		'weighted A*'
	]
};
