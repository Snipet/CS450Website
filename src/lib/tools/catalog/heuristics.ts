import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'heuristics',
	title: 'Heuristics',
	summary:
		'Checks a heuristic on a graph problem: h(n) against the true cost h*(n), every edge for consistency, dominance and the maximum of two heuristics, and the paths A* tree search, A* graph search, and weighted A* return with it.',
	topic: 'informed',
	order: 10,
	cites: [
		{ deck: 'informed', slide: [25, 30] },
		{ deck: 'informed', slide: [35, 38] }
	],
	keywords: [
		'heuristic',
		'h(n)',
		'h*(n)',
		'true cost',
		'admissible',
		'admissibility',
		'consistent',
		'consistency',
		'monotone',
		'triangle inequality',
		'dominance',
		'dominates',
		'combining heuristics',
		'max heuristic',
		'optimality of A*',
		'A* gone wrong',
		'A*',
		'weighted A*',
		'straight-line distance',
		'Romania'
	]
};
