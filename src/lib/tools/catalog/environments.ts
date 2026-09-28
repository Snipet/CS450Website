import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'environments',
	title: 'Task environments',
	summary:
		'Compares task environments along the seven environment types in a table like slide 17, shows their PEAS descriptions, and lists the methods from the course preview that fit each one.',
	topic: 'agents',
	order: 20,
	cites: [
		{ deck: 'agents', slide: [6, 8] },
		{ deck: 'agents', slide: [9, 18] }
	],
	keywords: [
		'task environment',
		'environment types',
		'PEAS',
		'performance measure',
		'actuators',
		'sensors',
		'fully observable',
		'partially observable',
		'deterministic',
		'stochastic',
		'strategic',
		'episodic',
		'sequential',
		'static',
		'dynamic',
		'semidynamic',
		'discrete',
		'continuous',
		'single agent',
		'multi-agent',
		'known',
		'unknown',
		'autonomous taxi',
		'spam filter',
		'chess',
		'Scrabble'
	]
};
