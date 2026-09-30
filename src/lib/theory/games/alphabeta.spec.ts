import { describe, expect, it } from 'vitest';
import {
	ORDERINGS,
	alphaBeta,
	fnName,
	listNames,
	orderedTree,
	perfectOrderingLeaves,
	type AlphaBetaStep
} from './alphabeta';
import { minimax } from './minimax';
import { parseGameTree } from './text';
import {
	buildGameTree,
	nodeName,
	randomGameTree,
	seededRandom,
	type GameTree,
	type NodeSpec
} from './tree';

const tree = (text: string): GameTree => parseGameTree(text).tree!;
const SLIDE = tree('[[3 12 8] [2 4 6] [14 5 2]]');

const inf = (n: number) => (n === Infinity ? '+∞' : n === -Infinity ? '−∞' : String(n));

/** A compact line per step. */
function line(t: GameTree, s: AlphaBetaStep): string {
	const name = nodeName(t, s.node);
	switch (s.kind) {
		case 'start':
			return `start ${fnName(s.fn)}(${name})`;
		case 'call':
			return `${fnName(s.fn)}(${name}, ${inf(s.alpha)}, ${inf(s.beta)})`;
		case 'leaf':
		case 'eval':
			return `${s.kind} ${name} = ${s.value} (${inf(s.alpha)}, ${inf(s.beta)})`;
		case 'update':
			return `${name}: v ${inf(s.before)} → ${inf(s.v)} from ${nodeName(t, s.child)}`;
		case 'prune':
			return `${name}: prune v = ${s.v}, skip [${listNames(t, s.skipped)}]`;
		case 'bound':
			return `${name}: ${s.which} ${inf(s.before)} → ${inf(s.which === 'alpha' ? s.alpha : s.beta)}`;
		case 'return':
			return `${name}: return ${s.v}`;
		case 'decision':
			return `decision ${s.value} ${s.best === null ? '-' : nodeName(t, s.best)}`;
	}
}

describe('alphaBeta on the slide tree (slides 14–22)', () => {
	const r = alphaBeta(SLIDE);

	it('follows the Max-Value / Min-Value pseudocode step by step', () => {
		expect(r.steps.map((s) => line(r.tree, s))).toEqual([
			'start Max-Value(root)',
			'Max-Value(root, −∞, +∞)',
			'Min-Value(A1, −∞, +∞)',
			'leaf A11 = 3 (−∞, +∞)',
			'A1: v +∞ → 3 from A11',
			'A1: beta +∞ → 3',
			'leaf A12 = 12 (−∞, 3)',
			'A1: v 3 → 3 from A12',
			'A1: beta 3 → 3',
			'leaf A13 = 8 (−∞, 3)',
			'A1: v 3 → 3 from A13',
			'A1: beta 3 → 3',
			'A1: return 3',
			'root: v −∞ → 3 from A1',
			'root: alpha −∞ → 3',
			'Min-Value(A2, 3, +∞)',
			'leaf A21 = 2 (3, +∞)',
			'A2: v +∞ → 2 from A21',
			'A2: prune v = 2, skip [A22 and A23]',
			'root: v 3 → 3 from A2',
			'root: alpha 3 → 3',
			'Min-Value(A3, 3, +∞)',
			'leaf A31 = 14 (3, +∞)',
			'A3: v +∞ → 14 from A31',
			'A3: beta +∞ → 14',
			'leaf A32 = 5 (3, 14)',
			'A3: v 14 → 5 from A32',
			'A3: beta 14 → 5',
			'leaf A33 = 2 (3, 5)',
			'A3: v 5 → 2 from A33',
			'A3: prune v = 2, skip []',
			'root: v 3 → 3 from A3',
			'root: alpha 3 → 3',
			'root: return 3',
			'decision 3 A1'
		]);
	});

	it('prunes exactly the leaves 4 and 6 (A22, A23) and returns 3 with action A1', () => {
		const skipped = r.steps.flatMap((s) => (s.kind === 'prune' ? s.skipped : []));
		expect(skipped.map((id) => nodeName(r.tree, id))).toEqual(['A22', 'A23']);
		expect(skipped.map((id) => r.tree.nodes[id].utility)).toEqual([4, 6]);
		expect(r.value).toBe(3);
		expect(r.bestAction).toBe('A1');
		expect(r.stats).toEqual({
			visited: 11,
			total: 13,
			leaves: 7,
			evals: 0,
			prunes: 1,
			pruned: 2,
			prunedNodes: 2,
			prunedLeaves: 2
		});
	});

	it('bounds the third MIN node by 14, then 5, then 2 (slides 17–19)', () => {
		const a3 = 9;
		const vs = r.steps.flatMap((s) => (s.kind === 'update' && s.node === a3 ? [s.v] : []));
		expect(vs).toEqual([14, 5, 2]);
		expect(r.returned[a3]).toBe(2);
		expect(r.window[a3]).toEqual({ alpha: 3, beta: Infinity });
		expect(r.returned[7]).toBeNull();
	});
});

describe('alphaBeta', () => {
	it('uses Min-Value at a MIN root (slide 21)', () => {
		const t = tree('min: [[3 12 8] [2 4 6] [14 5 2]]');
		const r = alphaBeta(t);
		expect(r.steps[0]).toEqual({ kind: 'start', node: 0, fn: 'min' });
		expect(r.steps[1]).toMatchObject({ kind: 'call', fn: 'min', alpha: -Infinity, beta: Infinity });
		expect(r.value).toBe(minimax(t).value);
		expect(r.bestAction).toBe('A2');
	});

	it('orders moves best first and worst first (slide 23)', () => {
		const best = alphaBeta(SLIDE, { ordering: 'best-first' });
		expect(best.tree.nodes.map((n) => n.action)).toEqual([
			null,
			'A1',
			'A11',
			'A13',
			'A12',
			'A2',
			'A21',
			'A22',
			'A23',
			'A3',
			'A33',
			'A32',
			'A31'
		]);
		expect(best.stats.leaves).toBe(5);
		expect(best.source[3]).toBe(4);
		const worst = alphaBeta(SLIDE, { ordering: 'worst-first' });
		expect(worst.tree.nodes[1].action).toBe('A2');
		expect(worst.stats.leaves).toBe(9);
		expect(worst.value).toBe(3);
		expect(worst.bestAction).toBe('A1');
	});

	it('uses evaluation values at the cutoff and counts pruned nodes down to it', () => {
		const t = tree('[{5}[3 12] {1}[2 4] {9}[14 5]]');
		const r = alphaBeta(t, { cutoff: 1 });
		expect(r.value).toBe(9);
		expect(r.stats).toMatchObject({ evals: 3, leaves: 0, total: 4, prunedNodes: 0 });
		const deep = tree('[[{3}[1 2] {7}[1 2]] [{2}[1 2] {8}[1 2]]]');
		const d = alphaBeta(deep, { cutoff: 2 });
		expect(d.value).toBe(minimax(deep, { cutoff: 2 }).value);
		expect(d.stats).toMatchObject({
			evals: 3,
			pruned: 1,
			prunedNodes: 1,
			prunedLeaves: 1,
			total: 7
		});
	});

	it('reports tuple trees and bad cutoffs', () => {
		const multi = alphaBeta(buildGameTree({ children: [{ utility: [1, 2] }] }));
		expect(multi.value).toBeNull();
		expect(multi.diagnostics[0].severity).toBe('error');
		const bad = alphaBeta(SLIDE, { cutoff: -1 });
		expect(bad.value).toBe(3);
		expect(bad.diagnostics).toHaveLength(1);
	});

	it('leaves the tree alone for the given order', () => {
		const { tree: t, source } = orderedTree(SLIDE, 'given');
		expect(t).toBe(SLIDE);
		expect(source).toEqual(SLIDE.nodes.map((n) => n.id));
	});

	it('lists names in prose', () => {
		expect(listNames(SLIDE, [])).toBe('');
		expect(listNames(SLIDE, [2])).toBe('A11');
		expect(listNames(SLIDE, [2, 3, 4])).toBe('A11, A12, and A13');
		expect(fnName('min')).toBe('Min-Value');
	});
});

/** A random tree with ragged depth and branching, for the property tests. */
function raggedTree(seed: number): GameTree {
	const rand = seededRandom(seed);
	const make = (depth: number): NodeSpec => {
		if (depth >= 5 || (depth > 0 && rand() < 0.25))
			return { utility: Math.floor(rand() * 21) - 10 };
		const n = 1 + Math.floor(rand() * 4);
		return { children: Array.from({ length: n }, () => make(depth + 1)) };
	};
	return buildGameTree(make(0), { root: rand() < 0.5 ? 'max' : 'min' });
}

/** Checks the fail-soft guarantees of every call against the true minimax values. */
function checkBounds(t: GameTree, cutoff: number | null = null) {
	const r = alphaBeta(t, { cutoff });
	const truth = minimax(r.tree, { cutoff }).values;
	r.tree.nodes.forEach((n) => {
		const v = r.returned[n.id];
		const w = r.window[n.id];
		if (v === null || w === null) return;
		const exact = truth[n.id]!;
		if (v <= w.alpha) expect(exact).toBeLessThanOrEqual(v);
		else if (v >= w.beta) expect(exact).toBeGreaterThanOrEqual(v);
		else expect(v).toBe(exact);
	});
}

describe('alphaBeta properties', () => {
	it('returns the minimax value and a minimax action for every ordering', () => {
		for (let seed = 1; seed <= 150; seed++) {
			const t =
				seed % 3 === 0
					? raggedTree(seed)
					: randomGameTree({
							branching: 2 + (seed % 3),
							depth: 1 + (seed % 5),
							seed,
							min: 0,
							max: 9,
							root: seed % 2 ? 'max' : 'min'
						});
			const mm = minimax(t);
			for (const ordering of ORDERINGS) {
				const r = alphaBeta(t, { ordering });
				expect(r.value).toBe(mm.value);
				expect(mm.values[r.source[r.best!]]).toBe(mm.value);
				expect(r.stats.visited + r.stats.prunedNodes).toBe(t.nodes.length);
				expect(r.stats.leaves + r.stats.prunedLeaves).toBe(mm.stats.leaves);
			}
		}
	});

	it('keeps the fail-soft bounds: v ≤ α means an upper bound, v ≥ β a lower bound, else exact', () => {
		for (let seed = 1; seed <= 80; seed++) checkBounds(raggedTree(seed));
		checkBounds(tree('[[{3}[1 2] {7}[1 2]] [{2}[1 2] {8}[1 2]]]'), 2);
	});

	it('evaluates no more leaves best first than in the given order', () => {
		for (let seed = 1; seed <= 150; seed++) {
			const t =
				seed % 2
					? raggedTree(seed)
					: randomGameTree({ branching: 2 + (seed % 4), depth: 2 + (seed % 4), seed, max: 9 });
			const given = alphaBeta(t).stats.leaves;
			const best = alphaBeta(t, { ordering: 'best-first' }).stats.leaves;
			expect(best).toBeLessThanOrEqual(given);
		}
	});

	it('evaluates b^⌈d/2⌉ + b^⌊d/2⌋ − 1 leaves with perfect ordering on uniform trees', () => {
		expect(perfectOrderingLeaves(3, 2)).toBe(5);
		expect(perfectOrderingLeaves(2, 3)).toBe(5);
		for (let b = 2; b <= 4; b++) {
			for (let d = 1; d <= 5; d++) {
				for (const root of ['max', 'min'] as const) {
					const t = randomGameTree({
						branching: b,
						depth: d,
						seed: b * 10 + d,
						distinct: true,
						root
					});
					const r = alphaBeta(t, { ordering: 'best-first' });
					expect(r.stats.leaves).toBe(perfectOrderingLeaves(b, d));
					if (d <= 2) expect(alphaBeta(t, { ordering: 'worst-first' }).stats.leaves).toBe(b ** d);
					expect(alphaBeta(t, { ordering: 'worst-first' }).stats.leaves).toBeLessThanOrEqual(
						b ** d
					);
				}
			}
		}
	});
});
