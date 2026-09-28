import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { hasErrors } from '$lib/theory/diagnostics';
import { ROMANIA, TINY_GRAPH, parseGraphText } from '$lib/theory/graphs';
import { compareStrategies } from './compare';
import {
	PRESETS,
	PROBLEMS,
	PROBLEM_IDS,
	isProblemId,
	matchProblemText,
	problemText,
	shapeFor
} from './problems';

describe('lecture problems', () => {
	it('round-trip through the graph text format', () => {
		for (const id of PROBLEM_IDS) {
			const { spec, diagnostics } = parseGraphText(problemText(id));
			expect(hasErrors(diagnostics), id).toBe(false);
			expect(spec!.start).toBe(PROBLEMS[id].spec.start);
			expect(spec!.goals).toEqual(PROBLEMS[id].spec.goals);
			expect(spec!.graph.edges.length).toBe(PROBLEMS[id].spec.graph.edges.length);
		}
	});

	it('are recognized from their text', () => {
		for (const id of PROBLEM_IDS) expect(matchProblemText(problemText(id))).toBe(id);
		expect(matchProblemText(`\n${problemText('romania')}\n`)).toBe('romania');
		expect(matchProblemText('start: S\ngoal: G\nS -> G')).toBeNull();
	});

	it('validates ids', () => {
		expect(isProblemId('tiny')).toBe(true);
		expect(isProblemId('toString')).toBe(false);
		expect(isProblemId(3)).toBe(false);
	});

	it('draws Romania with squares, other graphs with circles', () => {
		expect(shapeFor(ROMANIA)).toBe('square');
		expect(shapeFor(TINY_GRAPH)).toBe('circle');
	});
});

describe('PRESETS', () => {
	it('has one preset per problem, citing slides that exist', () => {
		expect(PRESETS.map((p) => p.id).sort()).toEqual([...PROBLEM_IDS].sort());
		for (const p of PRESETS) {
			expect(p.value.problem).toBe(p.id);
			const c = p.cite!;
			const [lo, hi] = typeof c.slide === 'number' ? [c.slide, c.slide] : c.slide!;
			expect(hi).toBeLessThanOrEqual(decks[c.deck].slides);
			expect(lo).toBeGreaterThanOrEqual(1);
		}
	});

	it('describes what the runs return', () => {
		const run = (
			id: (typeof PROBLEM_IDS)[number],
			mode = PRESETS.find((p) => p.id === id)!.value.mode
		) =>
			Object.fromEntries(
				compareStrategies(PROBLEMS[id].spec, { mode, alpha: 2, limit: 1000 }).rows.map((r) => [
					r.strategy,
					r
				])
			);
		const tiny = run('tiny');
		expect([tiny.bfs.cost, tiny.ucs.cost]).toEqual([14, 10]);
		expect(tiny.greedy.order).toEqual(tiny.bfs.order);
		expect(tiny.astar.order).toEqual(tiny.ucs.order);

		const tree = run('binary-tree');
		expect(tree.ids.iterations!.map((i) => i.join(' ')).join(' | ')).toBe(
			'A | A B C | A B D E C F G | A B D H I E J K C F L M'
		);
		expect(tree.ucs.order).toEqual(tree.bfs.order);

		const romania = run('romania');
		expect(romania.dfs.outcome).toBe('limit');
		expect([romania.ucs.cost, romania.astar.cost]).toEqual([418, 418]);
		expect([romania.bfs, romania.ids, romania.greedy, romania.wastar].map((r) => r.cost)).toEqual([
			450, 450, 450, 450
		]);

		const iasi = run('iasi-fagaras');
		expect([iasi.greedy.outcome, iasi.dfs.outcome]).toEqual(['limit', 'limit']);
		for (const mode of ['path', 'graph'] as const) {
			const r = run('iasi-fagaras', mode);
			expect([r.greedy.outcome, r.dfs.outcome]).toEqual(['found', 'found']);
		}

		const trap = run('greedy-trap');
		expect([trap.greedy.cost, trap.astar.cost]).toEqual([6, 3]);

		expect(run('astar-wrong').astar.cost).toBe(6);
		expect(run('astar-wrong', 'tree').astar.cost).toBe(5);
	});
});
