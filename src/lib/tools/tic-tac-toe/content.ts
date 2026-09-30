/**
 * Reference material from the adversarial search lecture shown next to the
 * game: game environment types, zero-sum games, games versus single-agent
 * search, advanced techniques, and chess playing systems.
 */
import type { Citation } from '$lib/lectures';

/** Types of game environments (slide 3): rows are information, columns chance. */
export const GAME_TYPES = {
	cite: { deck: 'adversarial', slide: 3 } as Citation,
	columns: ['Deterministic', 'Stochastic'] as const,
	rows: [
		{
			label: 'Perfect information',
			detail: 'fully observable',
			cells: ['Chess, checkers, go', 'Backgammon, monopoly']
		},
		{
			label: 'Imperfect information',
			detail: 'partially observable',
			cells: ['Battleships', 'Scrabble, poker, bridge']
		}
	]
};

export interface NoteBlock {
	id: string;
	title: string;
	points: readonly string[];
	cite: Citation;
}

export const GAME_NOTES: readonly NoteBlock[] = [
	{
		id: 'zero-sum',
		title: 'Alternating two-player zero-sum games',
		points: [
			'Players take turns.',
			'Each terminal state has a utility for each player.',
			'The sum of both players’ utilities is a constant. Here X gets +1, 0, or −1 and O the negative, so the sum is 0.'
		],
		cite: { deck: 'adversarial', slide: 4 }
	},
	{
		id: 'vs-search',
		title: 'Games vs. single-agent search',
		points: [
			'The opponent’s moves are not known, so the solution is a strategy (policy): a mapping from each state to the best move in that state.',
			'The time to make a move is limited, and branching factor, depth, and the number of terminal configurations are huge.',
			'Chess: branching factor ≈ 35 and depth ≈ 100 give a search tree of 10¹⁵⁴ nodes, against ≈ 10⁸⁰ atoms in the observable universe. Tic-tac-toe: at most 9 moves, 549,946 nodes.'
		],
		cite: { deck: 'adversarial', slide: 5 }
	},
	{
		id: 'advanced',
		title: 'Advanced techniques',
		points: [
			'Transposition table to store previously expanded states. This tool keeps minimax values by board: 5,478 distinct positions instead of 549,946 nodes.',
			'Forward pruning to avoid considering all possible moves.',
			'Lookup tables for opening moves and endgames.'
		],
		cite: { deck: 'adversarial', slide: 26 }
	}
];

export interface ChessSystem {
	system: string;
	/** Search depth in plies. */
	ply: number;
	/** Playing strength the slide gives for that depth. */
	strength: string;
	details: string;
}

/** Chess playing systems (slide 27). */
export const CHESS_SYSTEMS: readonly ChessSystem[] = [
	{
		system: 'Baseline',
		ply: 5,
		strength: 'human novice',
		details:
			'200 million node evaluations per move (3 min), minimax with a decent evaluation function and quiescence search'
	},
	{
		system: 'Baseline + alpha-beta',
		ply: 10,
		strength: 'typical PC, experienced player',
		details: 'the same budget with alpha-beta pruning'
	},
	{
		system: 'Deep Blue',
		ply: 14,
		strength: 'Garry Kasparov',
		details:
			'30 billion evaluations per move, singular extensions, an evaluation function with 8000 features, large databases of opening and endgame moves'
	},
	{
		system: 'Hydra (ca. 2006)',
		ply: 18,
		strength: 'better than any human alive?',
		details: '36 billion evaluations per second, advanced pruning techniques'
	}
];

export const CHESS_CITE: Citation = { deck: 'adversarial', slide: 27 };
