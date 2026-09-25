import { describe, expect, it } from 'vitest';
import { ASTAR_WRONG_PROBLEM, ROMANIA_PROBLEM, SLD_BUCHAREST } from '$lib/theory/graphs';
import { INFLATED_SLD } from './presets';
import { SECOND_NAMES, resolveSecond } from './second';

const preset = { h: SLD_BUCHAREST, label: 'Straight-line distance to Bucharest' };

describe('resolveSecond', () => {
	it('h = 0 and h*', () => {
		expect(resolveSecond({ kind: 'zero' }, ASTAR_WRONG_PROBLEM, {}, null)).toEqual({
			h: { S: 0, A: 0, B: 0, C: 0, G: 0 },
			label: 'h = 0'
		});
		expect(resolveSecond({ kind: 'perfect' }, ASTAR_WRONG_PROBLEM, {}, null)).toEqual({
			h: { S: 5, A: 4, B: 5, C: 3, G: 0 },
			label: 'h*(n)'
		});
	});

	it('the preset’s heuristic, or h = 0 without a preset', () => {
		const r = resolveSecond({ kind: 'preset' }, ROMANIA_PROBLEM, INFLATED_SLD, preset);
		expect(r.h.Arad).toBe(366);
		expect(r.label).toBe('Straight-line distance to Bucharest');
		expect(resolveSecond({ kind: 'preset' }, ROMANIA_PROBLEM, INFLATED_SLD, null).label).toBe(
			'h = 0'
		);
	});

	it('a multiple of h1', () => {
		const r = resolveSecond({ kind: 'scaled', factor: 0.5 }, ROMANIA_PROBLEM, SLD_BUCHAREST, null);
		expect(r.h.Arad).toBe(183);
		expect(r.label).toBe('0.5 × h1');
	});

	it('custom values over h1’s, for the graph’s states only', () => {
		const r = resolveSecond(
			{ kind: 'custom', h: { A: 1, Nowhere: 7 } },
			ASTAR_WRONG_PROBLEM,
			ASTAR_WRONG_PROBLEM.h!,
			null
		);
		expect(r.h).toEqual({ S: 2, A: 1, B: 1, C: 1, G: 0 });
	});

	it('names every choice', () => {
		expect(Object.keys(SECOND_NAMES)).toEqual(['zero', 'perfect', 'preset', 'scaled', 'custom']);
	});
});
