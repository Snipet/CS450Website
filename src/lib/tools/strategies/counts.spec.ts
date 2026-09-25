import { describe, expect, it } from 'vitest';
import { treeNodes } from '$lib/theory/search';
import {
	HANOI_BRANCHING,
	MAX_EXPONENT,
	formatQuotient,
	formatRatio,
	hanoiFacts,
	hanoiText,
	idsSeries,
	nodeCounts,
	percentMore,
	ratioOf,
	treeSeries,
	ucsDepth,
	ucsSeries
} from './counts';

describe('treeSeries', () => {
	it('writes 1 + b + … + bᵈ with b substituted (Uninformed Search, slide 31)', () => {
		expect(treeSeries(10, 5)).toEqual({
			symbolic: '1 + b + b² + … + bᵈ',
			powers: '1 + 10 + 10² + 10³ + 10⁴ + 10⁵',
			values: '1 + 10 + 100 + 1,000 + 10,000 + 100,000',
			total: 111_111n
		});
	});

	it('elides long sums to the first three and last two terms', () => {
		const s = treeSeries(10, 10, 'm');
		expect(s.symbolic).toBe('1 + b + b² + … + bᵐ');
		expect(s.powers).toBe('1 + 10 + 10² + … + 10⁹ + 10¹⁰');
		expect(s.values).toBe('1 + 10 + 100 + … + 1,000,000,000 + 10,000,000,000');
		expect(s.total).toBe(11_111_111_111n);
	});

	it('writes seven terms in full', () => {
		expect(treeSeries(2, 6).powers).toBe('1 + 2 + 2² + 2³ + 2⁴ + 2⁵ + 2⁶');
		expect(treeSeries(2, 7).powers).toBe('1 + 2 + 2² + … + 2⁶ + 2⁷');
	});

	it('handles depth 0 and b = 1', () => {
		expect(treeSeries(10, 0)).toMatchObject({ powers: '1', values: '1', total: 1n });
		expect(treeSeries(1, 3)).toMatchObject({ powers: '1 + 1 + 1² + 1³', total: 4n });
	});

	it('writes huge terms in scientific form', () => {
		const s = treeSeries(1000, 100);
		expect(s.values.endsWith('1 × 10³⁰⁰')).toBe(true);
		expect(s.total).toBe(treeNodes(1000, 100));
	});

	it('rejects exponents outside 0…MAX_EXPONENT', () => {
		expect(() => treeSeries(2, MAX_EXPONENT + 1)).toThrow(RangeError);
		expect(() => treeSeries(2, -1)).toThrow(RangeError);
		expect(() => treeSeries(2, 1.5)).toThrow(RangeError);
	});
});

describe('idsSeries', () => {
	it('writes (d+1)b⁰ + d b¹ + … + bᵈ with the numbers substituted (Uninformed Search, slide 38)', () => {
		expect(idsSeries(10, 5)).toEqual({
			symbolic: '(d+1)b⁰ + d b¹ + (d−1)b² + … + bᵈ',
			powers: '6·10⁰ + 5·10¹ + 4·10² + 3·10³ + 2·10⁴ + 10⁵',
			values: '6 + 50 + 400 + 3,000 + 20,000 + 100,000',
			total: 123_456n
		});
	});

	it('handles d = 0', () => {
		expect(idsSeries(10, 0)).toMatchObject({ powers: '10⁰', values: '1', total: 1n });
	});
});

describe('UCS bound', () => {
	it('computes ⌊C*/ε⌋ without float error', () => {
		expect(ucsDepth(0.3, 0.1)).toBe(3);
		expect(ucsDepth(10, 1)).toBe(10);
		expect(ucsDepth(418, 70)).toBe(5);
		expect(ucsDepth(0, 1)).toBe(0);
		expect(() => ucsDepth(1, 0)).toThrow(RangeError);
		expect(() => ucsDepth(-1, 1)).toThrow(RangeError);
	});

	it('counts the nodes of a tree of depth ⌊C*/ε⌋', () => {
		// The tiny search problem: b = 3, C* = 10, ε = 1 (against d = 5 for BFS).
		const u = ucsSeries(3, 10, 1);
		expect(u).toMatchObject({ depth: 10, capped: false, total: 88_573n });
		expect(u.symbolic).toBe('1 + b + b² + … + bᵏ');
		expect(treeSeries(3, 5).total).toBe(364n);
	});

	it('caps the depth at MAX_EXPONENT', () => {
		const u = ucsSeries(2, 10_000, 0.1);
		expect(u.depth).toBe(100_000);
		expect(u.capped).toBe(true);
		expect(u.total).toBe(treeNodes(2, MAX_EXPONENT));
	});
});

describe('nodeCounts', () => {
	it('gives time and space for b = 10, d = 5, m = 10', () => {
		const c = nodeCounts({ b: 10, d: 5, m: 10, cStar: 10, eps: 1 });
		expect(c.bfs.total).toBe(111_111n);
		expect(c.ids.total).toBe(123_456n);
		expect(c.dfs.total).toBe(11_111_111_111n);
		expect(c.ucs.total).toBe(11_111_111_111n);
		expect(c.idsOverBfs).toBeCloseTo(1.111105, 6);
		expect(c.space).toEqual({ bfs: 100_000n, ids: 51n, dfs: 101n, ucs: 10_000_000_000n });
	});

	it('uses the capped depth for the UCS space', () => {
		const c = nodeCounts({ b: 2, d: 1, m: 1, cStar: 10_000, eps: 0.1 });
		expect(c.space.ucs).toBe(2n ** BigInt(MAX_EXPONENT));
	});
});

describe('ratios', () => {
	it('divides BigInts', () => {
		expect(ratioOf(123_456n, 111_111n)).toBeCloseTo(1.111105, 6);
		expect(ratioOf(1n, 0n)).toBe(Infinity);
	});

	it('formats ratios', () => {
		expect(formatRatio(1.111105)).toBe('1.11');
		expect(formatRatio(12.34)).toBe('12.3');
		expect(formatRatio(123.4)).toBe('123');
		expect(formatRatio(12_345.6)).toBe('12,346');
		expect(formatRatio(Infinity)).toBe('∞');
	});

	it('formats quotients of any size', () => {
		expect(formatQuotient(123_456n, 111_111n)).toBe('1.11');
		expect(formatQuotient(11_111_111_111n, 111_111n)).toBe('100,000');
		expect(formatQuotient(10n ** 30n, 1n)).toBe('1 × 10³⁰');
		expect(formatQuotient(1n, 0n)).toBe('∞');
	});

	it('says how many more', () => {
		expect(percentMore(1.111105)).toBe('11% more');
		expect(percentMore(1.05)).toBe('5% more');
		expect(percentMore(1.0012)).toBe('about as many');
		expect(percentMore(0.5)).toBe('50% fewer');
		expect(percentMore(20)).toBe('1,900% more');
		expect(percentMore(Infinity)).toBe('infinitely more');
	});
});

describe('Towers of Hanoi (Informed Search, slide 43)', () => {
	it('needs 2ⁿ − 1 moves', () => {
		expect(hanoiFacts(5)).toEqual({
			disks: 5,
			moves: 31n,
			power: 617_673_396_283_947n,
			digits: 15
		});
		expect(HANOI_BRANCHING).toBe(3);
	});

	it('writes the facts', () => {
		expect(hanoiText(hanoiFacts(5))).toEqual({
			movesFormula: '2⁵ − 1',
			moves: '31',
			power: '3³¹',
			value: '617,673,396,283,947',
			digits: '15 digits'
		});
		expect(hanoiText(hanoiFacts(1))).toMatchObject({ moves: '1', value: '3', digits: '1 digit' });
		const ten = hanoiText(hanoiFacts(10));
		expect(ten.power).toBe('3¹⁰²³');
		expect(ten.value).toBe('≈ 1.24 × 10⁴⁸⁸');
		expect(ten.digits).toBe('489 digits');
	});

	it('estimates the digits beyond the exact range', () => {
		const f = hanoiFacts(15);
		expect(f.power).toBeNull();
		expect(f.digits).toBe(15_634);
		expect(hanoiText(f)).toMatchObject({ value: null, digits: 'about 15,634 digits' });
		const t = hanoiText(hanoiFacts(64));
		expect(t.moves).toBe('18,446,744,073,709,551,615');
		expect(t.power).toBe('3^(2⁶⁴ − 1)');
		expect(t.digits).toBe('about 8.8 × 10¹⁸ digits');
	});
});
