import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'state-spaces',
	title: 'State spaces',
	summary:
		'Formulates the example problems (Romania, the vacuum world, the 8-puzzle, robot motion planning) as search problems, draws their state spaces, lists what the successor function returns for any state, and grows a breadth-first or uniform-cost search outward from the start state.',
	topic: 'search',
	order: 10,
	cites: [
		{ deck: 'search', slide: [2, 26] },
		{ deck: 'uninformed', slide: 40 }
	],
	keywords: [
		'state space',
		'state-space graph',
		'search problem',
		'problem formulation',
		'initial state',
		'actions',
		'transition model',
		'successor function',
		'goal state',
		'path cost',
		'step cost',
		'optimal solution',
		'reflex agent',
		'planning agent',
		'goal-based agent',
		'Romania',
		'vacuum world',
		'8-puzzle',
		'15-puzzle',
		'24-puzzle',
		'robot motion planning',
		'number of states',
		'exponential',
		'Dijkstra',
		'frontier',
		'expand',
		'BFS',
		'UCS'
	]
};
