import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'minimax',
	title: 'Minimax and alpha-beta pruning',
	summary:
		'Computes minimax values on a game tree, steps through minimax and alpha-beta search with α, β, and pruning, and backs up utility tuples in games with more than two players.',
	topic: 'games',
	order: 10,
	cites: [
		{ deck: 'adversarial', slide: [9, 13] },
		{ deck: 'adversarial', slide: [14, 23] },
		{ deck: 'adversarial', slide: [24, 25] }
	],
	keywords: [
		'minimax',
		'alpha-beta',
		'alpha beta',
		'pruning',
		'game tree',
		'adversarial search',
		'MAX',
		'MIN',
		'utility',
		'move ordering',
		'evaluation function',
		'depth cutoff',
		'horizon effect',
		'multi-player',
		'max-n'
	]
};
