import { describe, expect, it } from 'vitest';
import { ROMANIA_PROBLEM, TINY_PROBLEM } from '$lib/theory/graphs';
import { compareStrategies } from './compare';
import { pathOptions, problemFacts } from './problem-view';

describe('problemFacts', () => {
	it('tiny search problem: b = 3, cheapest path cost 10 at depth 5', () => {
		expect(problemFacts(TINY_PROBLEM)).toEqual({
			states: 12,
			edges: 16,
			directed: true,
			start: 'S',
			goals: ['G'],
			hCount: 0,
			branching: 3,
			cheapest: { cost: 10, states: ['S', 'd', 'e', 'r', 'f', 'G'], depth: 5 }
		});
	});

	it('Romania: b = 4 (Sibiu), 418 at depth 4', () => {
		const f = problemFacts(ROMANIA_PROBLEM);
		expect(f.branching).toBe(4);
		expect(f.hCount).toBe(20);
		expect(f.cheapest).toMatchObject({ cost: 418, depth: 4 });
	});

	it('has no cheapest path when the goal is unreachable', () => {
		const f = problemFacts({
			graph: { directed: true, nodes: [{ id: 'S' }, { id: 'G' }], edges: [] },
			start: 'S',
			goals: ['G']
		});
		expect(f.cheapest).toBeNull();
		expect(f.branching).toBe(0);
	});
});

describe('pathOptions', () => {
	it('lists the cheapest path, then each strategy', () => {
		const opts = pathOptions(
			compareStrategies(ROMANIA_PROBLEM, { mode: 'tree', alpha: 2, limit: 1000 })
		);
		expect(opts.map((o) => o.label)).toEqual([
			'Cheapest path (cost 418)',
			'BFS (cost 450)',
			'DFS (no path)',
			'IDS (cost 450)',
			'UCS (cost 418)',
			'Greedy (cost 450)',
			'A* (cost 418)',
			'Weighted A* (cost 450)'
		]);
		expect(opts[0].states).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']);
		expect(opts[2].states).toBeNull();
	});

	it('says when there is no path at all', () => {
		const c = compareStrategies(
			{
				graph: { directed: true, nodes: [{ id: 'S' }, { id: 'G' }], edges: [] },
				start: 'S',
				goals: ['G']
			},
			{ mode: 'tree', alpha: 2, limit: 10 }
		);
		expect(pathOptions(c)[0]).toEqual({
			value: 'cheapest',
			label: 'Cheapest path (none)',
			states: null
		});
	});
});
