import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'vacuum',
	title: 'Vacuum-cleaner agent',
	summary:
		'Runs the reflex vacuum agent and other agent programs in the two-square vacuum world step by step, scores them with a performance measure, and compares their average scores over all initial states.',
	topic: 'agents',
	order: 10,
	cites: [
		{ deck: 'agents', slide: [3, 5] },
		{ deck: 'search', slide: 8 }
	],
	keywords: [
		'vacuum',
		'vacuum world',
		'agent',
		'agent program',
		'agent function',
		'reflex agent',
		'simple reflex agent',
		'model-based',
		'table-driven agent',
		'percept',
		'action',
		'performance measure',
		'rational agent',
		'expected utility',
		'stochastic',
		'simulation'
	]
};
