import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'search',
	title: 'Tree and graph search',
	summary:
		'Runs breadth-first, depth-first, depth-limited, iterative deepening, uniform-cost, greedy best-first, A*, and weighted A* search on a graph, one step at a time, with the state space, the search tree, and the frontier side by side.',
	topic: 'search',
	order: 20,
	cites: [
		{ deck: 'search', slide: [27, 43] },
		{ deck: 'uninformed', slide: [3, 44] },
		{ deck: 'informed', slide: [7, 38] }
	],
	keywords: [
		'tree search',
		'graph search',
		'search tree',
		'state space',
		'frontier',
		'explored set',
		'repeated states',
		'expansion order',
		'BFS',
		'breadth-first',
		'DFS',
		'depth-first',
		'depth-limited',
		'IDS',
		'iterative deepening',
		'UCS',
		'uniform-cost',
		'Dijkstra',
		'greedy',
		'best-first',
		'A*',
		'weighted A*',
		'Romania',
		'Arad',
		'Bucharest'
	]
};
