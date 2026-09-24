import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import {
	COMPLEXITY_SYMBOLS,
	EIGHT_PUZZLE_COSTS,
	STRATEGY_PROPERTIES,
	dfsSpace,
	formatCount,
	formatLarge,
	hanoiMoves,
	idsNodes,
	superscript,
	treeNodes
} from './properties';

describe('strategy properties (Informed Search, slide 42)', () => {
	it('lists the six strategies in slide order with the slide values', () => {
		expect(STRATEGY_PROPERTIES.map((p) => p.name)).toEqual([
			'BFS',
			'DFS',
			'IDS',
			'UCS',
			'Greedy',
			'A*'
		]);
		const row = (name: string) => STRATEGY_PROPERTIES.find((p) => p.name === name)!;
		expect(row('BFS')).toMatchObject({ complete: 'Yes', time: 'O(bᵈ)', space: 'O(bᵈ)' });
		expect(row('DFS')).toMatchObject({ complete: 'No', optimal: 'No', space: 'O(bm)' });
		expect(row('IDS')).toMatchObject({ space: 'O(bd)', optimal: 'If all step costs are equal' });
		expect(row('A*').optimal).toBe('Yes (if heuristic is admissible)');
	});

	it('cites slides that exist', () => {
		for (const p of STRATEGY_PROPERTIES) {
			for (const c of p.cite) {
				expect(typeof c.slide).toBe('number');
				expect(c.slide as number).toBeLessThanOrEqual(decks[c.deck].slides);
			}
		}
		expect(COMPLEXITY_SYMBOLS.map((s) => s.symbol)).toEqual(['b', 'd', 'm', 'C*', 'g(n)']);
		expect(EIGHT_PUZZLE_COSTS[0]).toEqual({
			depth: 12,
			ids: '3,644,035',
			astarH1: 227,
			astarH2: 73
		});
	});
});

describe('node counts', () => {
	it('counts the nodes of a b-ary tree', () => {
		expect(treeNodes(2, 3)).toBe(15n);
		expect(treeNodes(10, 0)).toBe(1n);
		expect(treeNodes(1, 4)).toBe(5n);
		expect(treeNodes(10, 5)).toBe(111_111n);
	});

	it('counts IDS generations: (d+1)b⁰ + d b¹ + … + bᵈ (Uninformed Search, slide 38)', () => {
		// Binary tree of depth 3: 4·1 + 3·2 + 2·4 + 1·8 = 26.
		expect(idsNodes(2, 3)).toBe(26n);
		// b = 10, d = 5: the slide's sum counts the root 6 times → 123,456
		// (the textbook's 123,450 leaves the root out); the full tree has 111,111 nodes.
		expect(idsNodes(10, 5)).toBe(123_456n);
		expect(idsNodes(3, 0)).toBe(1n);
	});

	it('DFS space and Towers of Hanoi', () => {
		expect(dfsSpace(10, 12)).toBe(121n);
		expect(hanoiMoves(0)).toBe(0n);
		expect(hanoiMoves(3)).toBe(7n);
		expect(hanoiMoves(64)).toBe(18_446_744_073_709_551_615n);
	});

	it('rejects bad arguments', () => {
		expect(() => treeNodes(-1, 2)).toThrow(RangeError);
		expect(() => idsNodes(2, 1.5)).toThrow(RangeError);
	});
});

describe('formatting', () => {
	it('groups digits and switches to powers of ten', () => {
		expect(formatCount(1234567n)).toBe('1,234,567');
		expect(formatCount(999)).toBe('999');
		expect(formatCount(-12345n)).toBe('-12,345');
		expect(formatLarge(123n)).toBe('123');
		expect(formatLarge(10n ** 25n)).toBe('1 × 10²⁵');
		expect(formatLarge(18_446_744_073_709_551_615n)).toBe('1.84 × 10¹⁹');
		expect(superscript(25)).toBe('²⁵');
	});
});
