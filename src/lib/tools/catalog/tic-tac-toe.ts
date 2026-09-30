import type { ToolMeta } from '../types';

export const tool: ToolMeta = {
	slug: 'tic-tac-toe',
	title: 'Tic-tac-toe',
	summary:
		'Plays tic-tac-toe against a minimax, alpha-beta, or depth-limited player, shows the minimax value of every move and the game tree below the position, counts the nodes minimax and alpha-beta visit under different move orderings, and scores cut-off positions with a weighted evaluation function.',
	topic: 'games',
	order: 20,
	cites: [
		{ deck: 'adversarial', slide: 6 },
		{ deck: 'adversarial', slide: [10, 11] },
		{ deck: 'adversarial', slide: [21, 25] }
	],
	keywords: [
		'tic-tac-toe',
		'noughts and crosses',
		'game',
		'game tree',
		'adversarial search',
		'minimax',
		'minimax value',
		'alpha-beta',
		'alpha-beta pruning',
		'pruning',
		'move ordering',
		'MAX',
		'MIN',
		'utility',
		'zero-sum',
		'evaluation function',
		'depth limit',
		'cutoff',
		'horizon effect',
		'quiescence search',
		'singular extension',
		'transposition table',
		'Deep Blue',
		'chess'
	]
};
