import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import {
	TINY_PROBLEM,
	checkHeuristic,
	graphProblem,
	parseGraphText,
	type WeightedGraph
} from '$lib/theory/graphs';
import { rbfs } from '$lib/theory/search/rbfs';
import { RBFS_PRESETS, TINY_WITH_STEPS, matchPreset, undirectedSteps } from './presets';
import { isSavedRbfsState } from './state';

const run = (id: string) => {
	const p = RBFS_PRESETS.find((x) => x.id === id)!;
	return rbfs(graphProblem(parseGraphText(p.value.graph).spec!), {
		maxExpansions: p.value.maxExpansions
	});
};

describe('undirectedSteps', () => {
	it('counts the fewest steps to a goal with edges taken either way', () => {
		expect(undirectedSteps(TINY_PROBLEM.graph, ['G'])).toEqual({
			S: 4,
			a: 3,
			b: 4,
			c: 2,
			d: 3,
			e: 3,
			f: 1,
			G: 0,
			h: 4,
			p: 5,
			q: 5,
			r: 2
		});
	});

	it('gives 0 to states that cannot reach a goal and ignores unknown goals', () => {
		const g: WeightedGraph = {
			directed: true,
			nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
			edges: [{ from: 'A', to: 'B', cost: 2 }]
		};
		expect(undirectedSteps(g, ['B', 'Z'])).toEqual({ A: 1, B: 0, C: 0 });
		expect(undirectedSteps(g, [])).toEqual({ A: 0, B: 0, C: 0 });
	});

	it('is admissible and consistent on the tiny search problem (every step costs at least 1)', () => {
		const report = checkHeuristic(TINY_WITH_STEPS);
		expect(report.admissible).toBe(true);
		expect(report.consistent).toBe(true);
	});
});

describe('RBFS presets', () => {
	it('round-trip through the URL state and cite real slides', () => {
		const ids = new Set<string>();
		for (const p of RBFS_PRESETS) {
			expect(ids.has(p.id)).toBe(false);
			ids.add(p.id);
			expect(isSavedRbfsState(p.value), p.id).toBe(true);
			expect(matchPreset(p.value)?.id).toBe(p.id);
			const s = p.cite!.slide as number;
			expect(s).toBeGreaterThanOrEqual(1);
			expect(s).toBeLessThanOrEqual(decks[p.cite!.deck].slides);
			const { spec } = parseGraphText(p.value.graph);
			expect(spec?.h, p.id).toBeDefined();
			expect(checkHeuristic(spec!).admissible, p.id).toBe(true);
		}
		expect([...ids]).toEqual(['romania', 'tiny', 'greedy-trap', 'iasi-fagaras']);
		expect(matchPreset({ ...RBFS_PRESETS[0].value, maxExpansions: 7 })).toBeUndefined();
	});

	it('do what their descriptions say', () => {
		const romania = run('romania');
		expect(romania.solution?.states).toEqual([
			'Arad',
			'Sibiu',
			'Rimnicu Vilcea',
			'Pitesti',
			'Bucharest'
		]);
		expect(romania.solution?.cost).toBe(418);

		const tiny = run('tiny');
		expect(tiny.solution?.cost).toBe(10);
		const dead = tiny.steps.filter((s) => s.kind === 'dead-end');
		expect(dead.map((s) => tiny.nodes[s.node].label)).toEqual(['a']);

		const trap = run('greedy-trap');
		expect(trap.solution?.states).toEqual(['S', 'T1', 'T2', 'G']);
		const back = trap.steps.find((s) => s.kind === 'return' && trap.nodes[s.node].label === 'B1');
		expect(back?.kind === 'return' && back.bestF).toBe(4);

		const iasi = run('iasi-fagaras');
		expect(iasi.solution?.states).toEqual(['Iasi', 'Vaslui', 'Urziceni', 'Bucharest', 'Fagaras']);
		expect(iasi.solution?.cost).toBe(530);
		expect(iasi.stats.expanded).toBe(40);
		expect(iasi.stats.reexpanded).toBe(27);
	});
});
