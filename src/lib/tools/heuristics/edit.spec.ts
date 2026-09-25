import { describe, expect, it } from 'vitest';
import {
	ASTAR_WRONG_PROBLEM,
	ROMANIA_PROBLEM,
	SLD_BUCHAREST,
	TINY_PROBLEM,
	checkHeuristic,
	parseGraphText
} from '$lib/theory/graphs';
import {
	editedLabel,
	formatFactor,
	formatValue,
	fullHeuristic,
	hValue,
	maxOf,
	perfectHeuristic,
	roundH,
	sameHeuristic,
	scaleHeuristic,
	scaledLabel,
	setStateH,
	specText,
	stepFor,
	withGoal,
	withHeuristic,
	withStart,
	zeroHeuristic
} from './edit';

describe('graph text', () => {
	it('round-trips a lecture problem with its positions and label', () => {
		const text = specText(ROMANIA_PROBLEM);
		expect(text.startsWith('# h: Straight-line distance to Bucharest\nundirected')).toBe(true);
		expect(text).toContain('h: Arad=366, Bucharest=0');
		expect(text).toContain('at: Arad 26 233');
		expect(parseGraphText(text).spec).toEqual(ROMANIA_PROBLEM);
	});
});

describe('h values', () => {
	it('reads missing values as 0', () => {
		expect(hValue(undefined, 'A')).toBe(0);
		expect(hValue({ A: 3 }, 'B')).toBe(0);
		expect(hValue({ A: 3 }, 'A')).toBe(3);
		expect(hValue({ A: 3 }, 'constructor')).toBe(0);
		expect(fullHeuristic(TINY_PROBLEM)).toEqual(
			Object.fromEntries(TINY_PROBLEM.graph.nodes.map((n) => [n.id, 0]))
		);
	});

	it('compares over the graph’s states', () => {
		expect(
			sameHeuristic(ASTAR_WRONG_PROBLEM, { S: 2, A: 4, B: 1, C: 1 }, ASTAR_WRONG_PROBLEM.h!)
		).toBe(true);
		expect(sameHeuristic(ASTAR_WRONG_PROBLEM, { S: 2 }, ASTAR_WRONG_PROBLEM.h!)).toBe(false);
		expect(
			sameHeuristic(ASTAR_WRONG_PROBLEM, { ...ASTAR_WRONG_PROBLEM.h, X: 9 }, ASTAR_WRONG_PROBLEM.h!)
		).toBe(true);
	});

	it('rounds to the three decimals the text keeps; negatives become 0', () => {
		expect(roundH(1.23456)).toBe(1.235);
		expect(roundH(-2)).toBe(0);
		expect(roundH(Number.NaN)).toBe(0);
		expect(roundH(Infinity)).toBe(0);
	});
});

describe('editing', () => {
	it('sets one state and marks the label as edited', () => {
		const next = setStateH(ROMANIA_PROBLEM, 'Arad', 400);
		expect(next.h!.Arad).toBe(400);
		expect(next.h!.Sibiu).toBe(253);
		expect(next.hLabel).toBe('Straight-line distance to Bucharest (edited)');
		expect(setStateH(next, 'Sibiu', 250).hLabel).toBe(
			'Straight-line distance to Bucharest (edited)'
		);
		expect(parseGraphText(specText(next)).spec).toEqual(next);
	});

	it('keeps the label when the value does not change', () => {
		expect(setStateH(ROMANIA_PROBLEM, 'Arad', 366).hLabel).toBe(ROMANIA_PROBLEM.hLabel);
	});

	it('adds an h value to a problem without one', () => {
		const next = setStateH(TINY_PROBLEM, 'S', 5);
		expect(next.h!.S).toBe(5);
		expect(next.h!.G).toBe(0);
		expect(next.hLabel).toBeUndefined();
	});

	it('writes a new heuristic with a label, dropping unknown states', () => {
		const next = withHeuristic(ASTAR_WRONG_PROBLEM, { S: 1, X: 4, A: -1 }, '  my  h ');
		expect(next.h).toEqual({ S: 1, A: 0 });
		expect(next.hLabel).toBe('my h');
		expect(withHeuristic(ASTAR_WRONG_PROBLEM, {}, null).hLabel).toBeUndefined();
		expect(editedLabel(undefined)).toBeNull();
		expect(editedLabel('  ')).toBeNull();
	});

	it('changes the start and the goal', () => {
		expect(withStart(ROMANIA_PROBLEM, 'Zerind').start).toBe('Zerind');
		expect(withGoal(ROMANIA_PROBLEM, 'Sibiu').goals).toEqual(['Sibiu']);
	});
});

describe('quick heuristics', () => {
	it('h = 0', () => {
		const h = zeroHeuristic(ASTAR_WRONG_PROBLEM);
		expect(h).toEqual({ S: 0, A: 0, B: 0, C: 0, G: 0 });
	});

	it('h = h* on Romania is admissible and consistent', () => {
		const h = perfectHeuristic(ROMANIA_PROBLEM);
		expect(h.Arad).toBe(418);
		expect(h.Bucharest).toBe(0);
		const report = checkHeuristic(ROMANIA_PROBLEM, h);
		expect(report.admissible && report.consistent).toBe(true);
	});

	it('h = h* gives states that cannot reach a goal the largest finite h*, keeping it consistent', () => {
		const h = perfectHeuristic(TINY_PROBLEM);
		expect(h.S).toBe(10);
		// a, b, c, h, p, q cannot reach G.
		for (const id of ['a', 'b', 'c', 'h', 'p', 'q']) expect(h[id]).toBe(10);
		const report = checkHeuristic(TINY_PROBLEM, h);
		expect(report.admissible && report.consistent).toBe(true);
	});

	it('scales and rounds', () => {
		const half = scaleHeuristic(ROMANIA_PROBLEM, SLD_BUCHAREST, 0.5);
		expect(half.Arad).toBe(183);
		expect(half.Sibiu).toBe(126.5);
		expect(scaleHeuristic(ASTAR_WRONG_PROBLEM, { S: 1 }, 1 / 3).S).toBe(0.333);
	});

	it('takes the pointwise maximum', () => {
		expect(maxOf(ASTAR_WRONG_PROBLEM, { S: 2, A: 1 }, { A: 3, B: 1 })).toEqual({
			S: 2,
			A: 3,
			B: 1,
			C: 0,
			G: 0
		});
	});
});

describe('labels and steps', () => {
	it('names scaled heuristics', () => {
		expect(scaledLabel('Straight-line distance', 2)).toBe('2 × Straight-line distance');
		expect(scaledLabel('2 × Straight-line distance', 1.5)).toBe('3 × Straight-line distance');
		expect(scaledLabel('2 × Straight-line distance', 0.5)).toBe('Straight-line distance');
		expect(scaledLabel(undefined, 0.25)).toBe('0.25 × h');
		expect(scaledLabel('h', 1)).toBe('h');
		expect(formatFactor(1 / 3)).toBe('0.333');
	});

	it('steps h fields by the value’s last decimal place', () => {
		expect(stepFor(366)).toBe(1);
		expect(stepFor(126.5)).toBe(0.1);
		expect(stepFor(1.25)).toBe(0.01);
		expect(stepFor(0.333)).toBe(0.001);
		expect(stepFor(0.1 + 0.2)).toBe(0.1);
	});
});

describe('formatValue', () => {
	it('writes up to three decimals, ∞, and a minus sign', () => {
		expect(formatValue(418)).toBe('418');
		expect(formatValue(0.3333)).toBe('0.333');
		expect(formatValue(-113)).toBe('−113');
		expect(formatValue(-0.0001)).toBe('0');
		expect(formatValue(Infinity)).toBe('∞');
		expect(formatValue(-Infinity)).toBe('−∞');
		expect(formatValue(Number.NaN)).toBe('–');
	});
});
