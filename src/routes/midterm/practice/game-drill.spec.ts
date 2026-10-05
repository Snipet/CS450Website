import { describe, expect, it } from 'vitest';
import { alphaBeta, minimax, parseGameTree } from '$lib/theory/games';
import {
	GAME_SIZES,
	alphaBetaDisplay,
	blankDisplay,
	gameDrill,
	gradeGame,
	minimaxDisplay
} from './game-drill';

const slideTree = () => parseGameTree('[[3 12 8] [2 4 6] [14 5 2]]').tree!;

describe('gameDrill', () => {
	it('builds trees of the chosen size with their minimax and alpha-beta results', () => {
		for (const size of GAME_SIZES) {
			for (let seed = 1; seed <= 30; seed++) {
				const d = gameDrill(seed, size.id);
				expect(d.leaves).toHaveLength(size.branching ** size.depth);
				expect(d.moves).toHaveLength(size.branching);
				expect(d.value).toBe(minimax(d.tree).value);
				expect(d.alphaBeta.value).toBe(d.value);
				expect(d.bestMoves).toContain(d.bestAction);
				expect(d.leaves.some((l) => l.pruned)).toBe(true);
				expect(d.leaves.filter((l) => !l.pruned)).toHaveLength(d.alphaBeta.stats.leaves);
				for (const l of d.leaves) {
					expect(l.utility).toBeGreaterThanOrEqual(0);
					expect(l.utility).toBeLessThanOrEqual(20);
				}
				expect(parseGameTree(d.text).tree!.nodes).toHaveLength(d.tree.nodes.length);
			}
		}
	});

	it('is reproducible', () => {
		expect(gameDrill(4, 'b3d3').text).toBe(gameDrill(4, 'b3d3').text);
		expect(gameDrill(4, 'b3d3').text).not.toBe(gameDrill(5, 'b3d3').text);
	});
});

describe('displays', () => {
	it('draws the blank tree with nothing searched', () => {
		const d = blankDisplay(slideTree());
		expect(d.status.every((s) => s === 'unvisited')).toBe(true);
		expect(d.labels.every((l) => l === null)).toBe(true);
		expect(d.cut.size).toBe(0);
	});

	it('labels every internal node with its minimax value', () => {
		const tree = slideTree();
		const d = minimaxDisplay(minimax(tree));
		const label = (action: string) => d.labels[tree.nodes.find((n) => n.action === action)!.id];
		expect(d.labels[0]).toEqual({ text: '3', kind: 'exact' });
		expect(label('A2')).toEqual({ text: '2', kind: 'exact' });
		expect(label('A11')).toBeNull();
		expect(d.best).toBe(tree.nodes.find((n) => n.action === 'A1')!.id);
	});

	it('shows alpha-beta’s final state as on slide 19', () => {
		const tree = slideTree();
		const d = alphaBetaDisplay(alphaBeta(tree));
		const id = (action: string) => tree.nodes.find((n) => n.action === action)!.id;
		expect(d.labels[0]).toEqual({ text: '3', kind: 'exact' });
		expect(d.labels[id('A1')]).toEqual({ text: '3', kind: 'exact' });
		expect(d.labels[id('A2')]).toEqual({ text: '≤2', kind: 'upper' });
		expect(d.labels[id('A3')]).toEqual({ text: '2', kind: 'exact' });
		expect([...d.cut].sort()).toEqual([id('A22'), id('A23')].sort());
		expect(d.status[id('A22')]).toBe('pruned');
		expect(d.status[id('A21')]).toBe('done');
		expect(d.best).toBe(id('A1'));
	});
});

describe('gradeGame', () => {
	it('grades the value, the move, and the pruned leaves', () => {
		const d = gameDrill(3, 'b2d3');
		const pruned = new Set(d.leaves.filter((l) => l.pruned).map((l) => l.id));
		const right = gradeGame(d, { value: d.value, move: d.bestAction, pruned });
		expect(right).toEqual({ value: true, move: true, wrongLeaves: [], leaves: true });
		const someLeaf = d.leaves[0].id;
		const wrong = gradeGame(d, {
			value: d.value + 1,
			move: null,
			pruned: new Set(
				[...pruned].filter((x) => x !== someLeaf).concat(pruned.has(someLeaf) ? [] : [someLeaf])
			)
		});
		expect(wrong.value).toBe(false);
		expect(wrong.move).toBeNull();
		expect(wrong.wrongLeaves).toEqual([someLeaf]);
		expect(wrong.leaves).toBe(false);
	});

	it('accepts any root move with the minimax value', () => {
		for (let seed = 1; seed <= 40; seed++) {
			const d = gameDrill(seed, 'b3d2');
			for (const move of d.moves)
				expect(gradeGame(d, { value: null, move, pruned: new Set() }).move).toBe(
					d.bestMoves.includes(move)
				);
		}
	});
});
