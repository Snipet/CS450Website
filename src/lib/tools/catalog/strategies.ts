import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'strategies',
	title: 'Comparing search strategies',
	summary:
		'Lists the completeness, optimality, and time and space complexity of each search strategy as on the slides, runs BFS, DFS, IDS, UCS, greedy best-first, A*, and weighted A* on one problem side by side, and computes node counts for given b, d, and m.',
	topic: 'search',
	order: 30,
	cites: [
		{ deck: 'uninformed', slide: [30, 45] },
		{ deck: 'informed', slide: 36 },
		{ deck: 'informed', slide: [42, 43] }
	],
	keywords: [
		'complete',
		'completeness',
		'optimal',
		'optimality',
		'time complexity',
		'space complexity',
		'branching factor',
		'depth',
		'O(b^d)',
		'node count',
		'properties',
		'comparison',
		'BFS',
		'DFS',
		'IDS',
		'UCS',
		'greedy',
		'A*',
		'weighted A*',
		'towers of Hanoi',
		'8-puzzle'
	]
};
