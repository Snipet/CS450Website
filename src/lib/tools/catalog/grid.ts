import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'grid',
	title: 'Path finding on a grid',
	summary:
		'Runs breadth-first, depth-first, uniform-cost, greedy best-first, A*, and weighted A* search on a grid with walls you draw, one expansion at a time, alone or two side by side.',
	topic: 'informed',
	order: 30,
	cites: [
		{ deck: 'informed', slide: [23, 24] },
		{ deck: 'informed', slide: [38, 40] }
	],
	keywords: [
		'grid',
		'path finding',
		'pathfinding',
		'maze',
		'A*',
		'weighted A*',
		'greedy',
		'uniform-cost',
		'Dijkstra',
		'BFS',
		'DFS',
		'heuristic',
		'Manhattan',
		'Euclidean',
		'octile',
		'Chebyshev',
		'obstacle'
	]
};
