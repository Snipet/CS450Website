import { describe, expect, it } from 'vitest';
import { parseGraphText, trueCosts } from '$lib/theory/graphs';
import { seededRandom } from '$lib/theory/games';
import {
	gradeHeuristic,
	heuristicDrill,
	heuristicGraphText,
	kindForSeed,
	randomSmallGraph
} from './heuristic-drill';

describe('randomSmallGraph', () => {
	it('connects S to G with six states and costs 1–6', () => {
		const rand = seededRandom(4);
		for (let k = 0; k < 100; k++) {
			const spec = randomSmallGraph(rand);
			expect(spec.graph.nodes.map((n) => n.id)).toEqual(['S', 'A', 'B', 'C', 'D', 'G']);
			expect(Number.isFinite(trueCosts(spec).get('S')!)).toBe(true);
			for (const e of spec.graph.edges) {
				expect(e.cost).toBeGreaterThanOrEqual(1);
				expect(e.cost).toBeLessThanOrEqual(6);
			}
		}
	});
});

describe('heuristicDrill', () => {
	it('picks every kind, the same one for the same seed', () => {
		const kinds = Array.from({ length: 30 }, (_, seed) => kindForSeed(seed));
		expect(new Set(kinds)).toEqual(new Set(['consistent', 'admissible', 'inadmissible']));
		expect(kindForSeed(12)).toBe(kindForSeed(12));
	});

	it('gives a heuristic of the asked kind on a connected graph', () => {
		for (let seed = 0; seed < 150; seed++) {
			const d = heuristicDrill(seed);
			const { report } = d;
			expect(Object.keys(d.spec.h!).sort()).toEqual(['A', 'B', 'C', 'D', 'G', 'S']);
			expect(report.goalsZero).toBe(true);
			expect(Number.isFinite(d.optimalCost)).toBe(true);
			if (d.kind === 'consistent') expect(report.consistent).toBe(true);
			if (d.kind === 'admissible') {
				expect(report.admissible).toBe(true);
				expect(report.consistent).toBe(false);
			}
			if (d.kind === 'inadmissible') expect(report.admissible).toBe(false);
			// The optimality guarantees of Informed Search, slide 29.
			if (report.admissible) expect(d.tree.optimal).toBe(true);
			if (report.consistent) expect(d.graph.optimal).toBe(true);
			expect(d.tree.cost).not.toBeNull();
			expect(d.graph.cost).not.toBeNull();
		}
	});

	it('is reproducible and round-trips its graph text', () => {
		const a = heuristicDrill(7, 'admissible');
		expect(heuristicGraphText(heuristicDrill(7, 'admissible'))).toBe(heuristicGraphText(a));
		const { spec, diagnostics } = parseGraphText(heuristicGraphText(a));
		expect(diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
		expect(spec).toEqual(a.spec);
	});
});

describe('gradeHeuristic', () => {
	it('marks each answer right, wrong, or unanswered', () => {
		const d = heuristicDrill(1, 'admissible');
		expect(gradeHeuristic(d, { admissible: true, consistent: false })).toEqual({
			admissible: true,
			consistent: true
		});
		expect(gradeHeuristic(d, { admissible: false, consistent: null })).toEqual({
			admissible: false,
			consistent: null
		});
	});
});
