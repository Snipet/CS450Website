import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'rbfs',
	title: 'Recursive best-first search',
	summary:
		'Runs recursive best-first search (RBFS) on a graph one step at a time: the recursion path with each call’s f_limit and the backed-up f values, the state space, the pseudocode line, and node counts next to A* on the same problem.',
	topic: 'informed',
	order: 15,
	cites: [
		{ deck: 'informed', slide: 4 },
		{ deck: 'informed', slide: [16, 22] }
	],
	keywords: [
		'RBFS',
		'recursive best-first search',
		'best-first',
		'f_limit',
		'f-limit',
		'backed-up value',
		'linear space',
		'memory-bounded',
		'regeneration',
		'IDA*',
		'A*',
		'f(n) = g(n) + h(n)',
		'admissible',
		'Romania',
		'Arad',
		'Bucharest'
	]
};
