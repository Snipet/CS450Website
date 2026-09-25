import { describe, expect, it } from 'vitest';
import {
	ASTAR_WRONG_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	SLD_BUCHAREST,
	TINY_PROBLEM,
	checkHeuristic
} from '$lib/theory/graphs';
import {
	admissibilitySentence,
	consistencyRows,
	consistencySentence,
	dominance,
	dominanceSentence,
	fBands,
	heuristicRows,
	listSome,
	optimalPath,
	overestimates,
	runAStar,
	stopReason,
	verdictSummary,
	verdicts,
	violationText,
	weightedBound,
	weightedBoundNote
} from './analysis';
import { perfectHeuristic, scaleHeuristic, zeroHeuristic } from './edit';
import { INFLATED_SLD } from './presets';

const ROMANIA_PATH = ['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest'];

describe('Romania with the straight-line distance (Informed Search, slides 6, 25)', () => {
	const v = verdicts(ROMANIA_PROBLEM);

	it('is admissible and consistent', () => {
		expect(v.admissible).toBe(true);
		expect(v.consistent).toBe(true);
		expect(v.goalsZero).toBe(true);
		expect(v.over).toEqual([]);
		expect(v.violations).toEqual([]);
		expect(v.states).toBe(20);
		expect(v.directions).toBe(46);
		expect(admissibilitySentence(v)).toBe('h(n) ≤ h*(n) at all 20 states.');
		expect(consistencySentence(v)).toBe("h(n) ≤ c(n, n') + h(n') on all 46 edge directions.");
		expect(verdictSummary(v)).toBe('h is admissible and consistent.');
	});

	it('lists h(n), h*(n) and the margin per state', () => {
		const rows = heuristicRows(ROMANIA_PROBLEM, checkHeuristic(ROMANIA_PROBLEM));
		const arad = rows.find((r) => r.id === 'Arad')!;
		expect(arad).toEqual({
			id: 'Arad',
			h: 366,
			hStar: 418,
			admissible: true,
			margin: 52,
			start: true,
			goal: false
		});
		const bucharest = rows.find((r) => r.id === 'Bucharest')!;
		expect(bucharest).toMatchObject({ h: 0, hStar: 0, margin: 0, goal: true, start: false });
		expect(rows.find((r) => r.id === 'Pitesti')).toMatchObject({ h: 100, hStar: 101, margin: 1 });
	});

	it('A* tree and graph search both return the 418 path', () => {
		const best = optimalPath(ROMANIA_PROBLEM)!;
		expect(best).toEqual({ cost: 418, states: ROMANIA_PATH });
		for (const mode of ['tree', 'graph'] as const) {
			const run = runAStar(ROMANIA_PROBLEM, SLD_BUCHAREST, mode, best.cost);
			expect(run.cost).toBe(418);
			expect(run.states).toEqual(ROMANIA_PATH);
			expect(run.optimal).toBe(true);
			expect(run.stopped).toBe(false);
			expect(run.strategy).toBe('astar');
		}
	});

	it('groups the nodes A* takes off the frontier by f(n) against C* (slide 30)', () => {
		const run = runAStar(ROMANIA_PROBLEM, SLD_BUCHAREST, 'tree', 418);
		const bands = fBands(run.result, 418);
		// Slides 17–22: Arad 366, Sibiu 393, Rimnicu Vilcea 413, Fagaras 415, Pitesti 417, Bucharest 418.
		expect(bands.below.map((n) => [n.label, n.f])).toEqual([
			['Arad', 366],
			['Sibiu', 393],
			['Rimnicu Vilcea', 413],
			['Fagaras', 415],
			['Pitesti', 417]
		]);
		expect(bands.equal.map((n) => [n.label, n.g, n.h])).toEqual([['Bucharest', 418, 0]]);
		expect(bands.above).toEqual([]);
	});
});

describe('A* gone wrong (Informed Search, slides 27–29)', () => {
	const v = verdicts(ASTAR_WRONG_PROBLEM);

	it('is admissible but inconsistent only at A → C', () => {
		expect(v.admissible).toBe(true);
		expect(v.consistent).toBe(false);
		expect(v.violations.map((e) => `${e.from}→${e.to}`)).toEqual(['A→C']);
		const [e] = v.violations;
		expect(e).toMatchObject({ cost: 1, hFrom: 4, hTo: 1, slack: -2 });
		expect(violationText(e)).toBe('h(A) = 4 > c(A, C) + h(C) = 1 + 1 = 2');
		expect(consistencySentence(v)).toBe(
			'The check fails on A → C: h(A) = 4 > c(A, C) + h(C) = 1 + 1 = 2.'
		);
		expect(verdictSummary(v)).toBe('h is admissible and not consistent (1 edge direction).');
	});

	it('lists the failed check first', () => {
		const rows = consistencyRows(checkHeuristic(ASTAR_WRONG_PROBLEM));
		expect(rows.map((r) => `${r.from}→${r.to}`)).toEqual(['A→C', 'S→A', 'S→B', 'B→C', 'C→G']);
		expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
	});

	it('tree search returns 5, graph search 6, with C* = 5', () => {
		const best = optimalPath(ASTAR_WRONG_PROBLEM)!;
		expect(best).toEqual({ cost: 5, states: ['S', 'A', 'C', 'G'] });
		const tree = runAStar(ASTAR_WRONG_PROBLEM, ASTAR_WRONG_PROBLEM.h!, 'tree', 5);
		const graph = runAStar(ASTAR_WRONG_PROBLEM, ASTAR_WRONG_PROBLEM.h!, 'graph', 5);
		expect(tree.cost).toBe(5);
		expect(tree.optimal).toBe(true);
		expect(graph.cost).toBe(6);
		expect(graph.states).toEqual(['S', 'B', 'C', 'G']);
		expect(graph.optimal).toBe(false);
	});

	it('f drops along S → A → C in the tree run (5 then 3)', () => {
		const tree = runAStar(ASTAR_WRONG_PROBLEM, ASTAR_WRONG_PROBLEM.h!, 'tree', 5);
		const bands = fBands(tree.result, 5);
		// S (0+2), B (1+1), C via B (3+1), C via A... A (1+4) comes off at f = 5.
		expect(bands.below.map((n) => `${n.label} ${n.f}`)).toEqual(['S 2', 'B 2', 'C 4', 'C 3']);
		expect(bands.equal.map((n) => `${n.label} ${n.f}`)).toEqual(['A 5', 'G 5']);
	});
});

describe('the other presets', () => {
	it('Iasi to Fagaras: the measured distance is consistent and admissible', () => {
		const v = verdicts(ROMANIA_IASI_FAGARAS);
		expect(v.admissible).toBe(true);
		expect(v.consistent).toBe(true);
	});

	it('greedy trap: admissible and consistent; A* finds cost 3', () => {
		const v = verdicts(GREEDY_TRAP_PROBLEM);
		expect(v.admissible && v.consistent).toBe(true);
		expect(runAStar(GREEDY_TRAP_PROBLEM, GREEDY_TRAP_PROBLEM.h!, 'tree', 3).cost).toBe(3);
	});

	it('tiny problem with h = 0: A* is uniform-cost search (Uninformed Search, slide 41)', () => {
		const h = zeroHeuristic(TINY_PROBLEM);
		const v = verdicts(TINY_PROBLEM, h);
		expect(v.admissible && v.consistent).toBe(true);
		const run = runAStar(TINY_PROBLEM, h, 'tree', 10);
		expect(run.result.order).toEqual(['S', 'p', 'd', 'b', 'e', 'a', 'r', 'f', 'e', 'G']);
		expect(run.cost).toBe(10);
		expect(run.states).toEqual(['S', 'd', 'e', 'r', 'f', 'G']);
	});

	it('2 × straight-line distance overestimates at 18 of the 20 cities (slide 38)', () => {
		const v = verdicts(ROMANIA_PROBLEM, INFLATED_SLD);
		expect(v.admissible).toBe(false);
		expect(v.over).toHaveLength(18);
		expect(v.over.map((r) => r.id)).not.toContain('Lugoj');
		expect(v.over[0].id).toBe('Oradea');
		expect(admissibilitySentence(v)).toBe(
			'h(n) > h*(n) at 18 states: Oradea (h = 760 > h* = 429), Arad, Zerind, and 15 more.'
		);
		expect(consistencySentence(v)).toBe(
			'The check fails on 13 edge directions. Largest failure, Fagaras → Bucharest: h(Fagaras) = 352 > c(Fagaras, Bucharest) + h(Bucharest) = 211 + 0 = 211.'
		);
		for (const mode of ['tree', 'graph'] as const) {
			const run = runAStar(ROMANIA_PROBLEM, INFLATED_SLD, mode, 418);
			expect(run.cost).toBe(450);
			expect(run.states).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
			expect(run.optimal).toBe(false);
		}
	});
});

describe('overestimates', () => {
	it('sorts the worst first', () => {
		const h = { S: 9, A: 4, B: 10, C: 1, G: 0 };
		const rows = heuristicRows(ASTAR_WRONG_PROBLEM, checkHeuristic(ASTAR_WRONG_PROBLEM, h));
		expect(overestimates(rows).map((r) => [r.id, r.margin])).toEqual([
			['B', -5],
			['S', -4]
		]);
	});

	it('flags a goal with h > 0', () => {
		const v = verdicts(ASTAR_WRONG_PROBLEM, { ...ASTAR_WRONG_PROBLEM.h, G: 2 });
		expect(v.goalsZero).toBe(false);
		expect(v.goalsAbove).toEqual(['G']);
		expect(v.admissible).toBe(false);
	});
});

describe('weighted A* (slide 38)', () => {
	it('with α = 2 on Romania returns 450, within α · C*', () => {
		const run = runAStar(ROMANIA_PROBLEM, SLD_BUCHAREST, 'tree', 418, 2);
		expect(run.strategy).toBe('wastar');
		expect(run.weight).toBe(2);
		expect(run.cost).toBe(450);
		expect(run.cost!).toBeLessThanOrEqual(2 * 418);
		const astar = runAStar(ROMANIA_PROBLEM, SLD_BUCHAREST, 'tree', 418);
		expect(run.popped).toBeLessThan(astar.popped);
	});

	it('the bound α · C* covers graph search only with a consistent h', () => {
		// A* gone wrong: admissible, not consistent. With α = 1.1 graph search
		// still drops the path through A and returns 6 > 1.1 × 5.
		const graph = runAStar(ASTAR_WRONG_PROBLEM, ASTAR_WRONG_PROBLEM.h!, 'graph', 5, 1.1);
		expect(graph.cost).toBe(6);
		expect(graph.cost!).toBeGreaterThan(1.1 * 5);
		const tree = runAStar(ASTAR_WRONG_PROBLEM, ASTAR_WRONG_PROBLEM.h!, 'tree', 5, 1.1);
		expect(tree.cost!).toBeLessThanOrEqual(1.1 * 5);
		expect(weightedBound(verdicts(ASTAR_WRONG_PROBLEM))).toBe('tree');
		expect(weightedBound(verdicts(ROMANIA_PROBLEM))).toBe('both');
		expect(weightedBound(verdicts(ROMANIA_PROBLEM, INFLATED_SLD))).toBe('none');
		expect(weightedBoundNote('tree')).toContain('not consistent');
		expect(weightedBoundNote('none')).toContain('not admissible');
	});

	it('α = 1 is plain A*', () => {
		expect(runAStar(ROMANIA_PROBLEM, SLD_BUCHAREST, 'tree', 418, 1).strategy).toBe('astar');
	});

	it('reports runs stopped by the limits', () => {
		const loop = {
			graph: {
				directed: true,
				nodes: [{ id: 'S' }, { id: 'A' }, { id: 'G' }],
				edges: [
					{ from: 'S', to: 'A', cost: 0 },
					{ from: 'A', to: 'S', cost: 0 }
				]
			},
			start: 'S',
			goals: ['G']
		};
		const run = runAStar(loop, {}, 'tree', null);
		expect(run.stopped).toBe(true);
		expect(run.cost).toBeNull();
		expect(run.optimal).toBeNull();
		// Zero-cost loop: 5,000 nodes come off the frontier before 20,000 are generated.
		expect(run.popped).toBe(5000);
		expect(stopReason(run)).toBe('at the limit of 5,000 nodes taken off the frontier');
		expect(stopReason(runAStar(ROMANIA_PROBLEM, SLD_BUCHAREST, 'tree', 418))).toBeNull();
	});
});

describe('dominance and combining (slides 35, 37)', () => {
	it('the straight-line distance dominates h = 0', () => {
		const d = dominance(ROMANIA_PROBLEM, zeroHeuristic(ROMANIA_PROBLEM), SLD_BUCHAREST);
		expect(d.verdict).toBe('h2');
		expect(d.admissible1 && d.admissible2 && d.admissibleMax).toBe(true);
		expect(dominanceSentence(d)).toBe(
			'h2(n) ≥ h1(n) for all n and both are admissible: h2 dominates h1.'
		);
		expect(d.rows.find((r) => r.id === 'Arad')).toEqual({
			id: 'Arad',
			h1: 0,
			h2: 366,
			max: 366,
			cmp: 1
		});
	});

	it('h* dominates every admissible heuristic', () => {
		const d = dominance(ROMANIA_PROBLEM, SLD_BUCHAREST, perfectHeuristic(ROMANIA_PROBLEM));
		expect(d.verdict).toBe('h2');
	});

	it('an inflated h is larger but not admissible, so it does not dominate', () => {
		const d = dominance(ROMANIA_PROBLEM, SLD_BUCHAREST, INFLATED_SLD);
		expect(d.verdict).toBe('h2');
		expect(d.admissible2).toBe(false);
		expect(dominanceSentence(d)).toBe(
			'h2(n) ≥ h1(n) for all n, but h2 is not admissible, so neither dominates in the slide’s sense.'
		);
	});

	it('the reverse direction and equality', () => {
		const half = scaleHeuristic(ROMANIA_PROBLEM, SLD_BUCHAREST, 0.5);
		expect(dominance(ROMANIA_PROBLEM, SLD_BUCHAREST, half).verdict).toBe('h1');
		const same = dominance(ROMANIA_PROBLEM, SLD_BUCHAREST, { ...SLD_BUCHAREST });
		expect(same.verdict).toBe('equal');
		expect(dominanceSentence(same)).toBe('h1 and h2 have the same value at every state.');
	});

	it('neither dominates: the maximum is admissible and at least as large as both', () => {
		const h1 = { S: 2, A: 0, B: 1, C: 1, G: 0 };
		const h2 = { S: 1, A: 2, B: 0, C: 1, G: 0 };
		const d = dominance(ASTAR_WRONG_PROBLEM, h1, h2);
		expect(d.verdict).toBe('neither');
		expect(d.max).toEqual({ S: 2, A: 2, B: 1, C: 1, G: 0 });
		expect(d.admissibleMax).toBe(true);
		expect(d.rows.map((r) => r.cmp)).toEqual([-1, 1, -1, 0, 0]);
		expect(dominanceSentence(d)).toMatch(/^Each is larger at some state/);
	});
});

describe('listSome', () => {
	it('shortens long lists', () => {
		expect(listSome(['a', 'b'])).toBe('a, b');
		expect(listSome(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, c, and 2 more');
	});
});
