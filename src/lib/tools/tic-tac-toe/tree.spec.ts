import { describe, expect, it } from 'vitest';
import { EMPTY_BOARD } from '$lib/theory/games/tictactoe';
import { TREE_BOARD, TREE_LABEL, TREE_VALUE, treeLayout } from './tree';

describe('treeLayout', () => {
	it('draws the empty board and its nine children, as on slide 6', () => {
		const t = treeLayout(EMPTY_BOARD);
		expect(t.nodes).toHaveLength(10);
		expect(t.edges).toHaveLength(9);
		expect(t.levels.map((l) => l.label)).toEqual(['MAX (X)', 'MIN (O)']);
		expect(t.nodes.slice(1).map((n) => n.board)).toEqual([
			'X........',
			'.X.......',
			'..X......',
			'...X.....',
			'....X....',
			'.....X...',
			'......X..',
			'.......X.',
			'........X'
		]);
		// Every move has value 0: none is singled out.
		expect(t.nodes.every((n) => n.value === 0 && !n.best)).toBe(true);
		expect(t.expanded).toBeNull();
	});

	it('centers the root over its children and keeps boards apart', () => {
		const t = treeLayout(EMPTY_BOARD);
		const root = t.nodes[0];
		const kids = t.nodes.slice(1);
		const mid = (kids[0].x + kids[8].x + TREE_BOARD) / 2;
		expect(root.x + TREE_BOARD / 2).toBeCloseTo(mid);
		for (let i = 1; i < kids.length; i++) {
			expect(kids[i].x - kids[i - 1].x).toBeGreaterThan(TREE_BOARD);
		}
		expect(kids[0].x).toBeGreaterThanOrEqual(TREE_LABEL);
		expect(kids[8].x + TREE_BOARD).toBeLessThanOrEqual(t.width);
		// Edges leave below the parent's value.
		expect(t.edges[0].y1).toBe(root.y + TREE_BOARD + TREE_VALUE);
		expect(t.edges[0].y2).toBe(kids[0].y);
	});

	it('marks the best children when moves differ', () => {
		const t = treeLayout('XX..O....');
		expect(t.levels.map((l) => l.label)).toEqual(['MIN (O)', 'MAX (X)']);
		expect(t.nodes.filter((n) => n.best).map((n) => n.square)).toEqual([2]);
		expect(t.edges.filter((e) => e.best).map((e) => e.to)).toEqual(['c3']);
	});

	it('draws the children of one child at level 2', () => {
		const t = treeLayout('XX..O....', { levels: 2 });
		// Default: the move minimax returns (square 3).
		expect(t.expanded).toBe(2);
		const level2 = t.nodes.filter((n) => n.level === 2);
		expect(level2.map((n) => n.id)).toEqual(['g3-4', 'g3-6', 'g3-7', 'g3-8', 'g3-9']);
		expect(level2.every((n) => n.parent === 'c3')).toBe(true);
		expect(t.levels.map((l) => l.label)).toEqual(['MIN (O)', 'MAX (X)', 'MIN (O)']);
		for (const n of level2) {
			expect(n.x).toBeGreaterThanOrEqual(TREE_LABEL);
			expect(n.x + TREE_BOARD).toBeLessThanOrEqual(t.width);
		}
		expect(treeLayout('XX..O....', { levels: 2, expand: 8 }).expanded).toBe(8);
		// An occupied square falls back to the minimax move.
		expect(treeLayout('XX..O....', { levels: 2, expand: 0 }).expanded).toBe(2);
	});

	it('labels a level of terminal boards TERMINAL', () => {
		const t = treeLayout('XOX.X.XOO');
		expect(t.nodes).toHaveLength(1);
		expect(t.levels).toEqual([{ level: 0, y: t.nodes[0].y, label: 'TERMINAL' }]);
		expect(t.nodes[0].terminal).toBe(true);
		expect(t.nodes[0].value).toBe(1);
		// X to move with one square left: the only child is a full board.
		const last = treeLayout('XOXXOOOX.');
		expect(last.levels.map((l) => l.label)).toEqual(['MAX (X)', 'TERMINAL']);
		// With two levels there is nothing below a terminal child.
		expect(treeLayout('XOXXOOOX.', { levels: 2 }).nodes).toHaveLength(2);
	});
});
