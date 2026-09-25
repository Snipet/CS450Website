import { describe, expect, it } from 'vitest';
import {
	checkHeuristic,
	compareHeuristics,
	maxHeuristic,
	shortestPath,
	trueCosts
} from './analysis';
import {
	ASTAR_WRONG_PROBLEM,
	BINARY_TREE_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	SLD_BUCHAREST,
	SLD_FAGARAS,
	TINY_PROBLEM
} from './builtins';
import type { GraphProblemSpec } from './types';

/** A small spec from [from, to, cost] triples; nodes in order of appearance. */
function make(
	edges: [string, string, number][],
	start: string,
	goals: string[],
	directed = true,
	h?: Record<string, number>
): GraphProblemSpec {
	const ids = [...new Set([start, ...goals, ...edges.flatMap(([a, b]) => [a, b])])];
	return {
		graph: {
			directed,
			nodes: ids.map((id) => ({ id })),
			edges: edges.map(([from, to, cost]) => ({ from, to, cost }))
		},
		start,
		goals,
		...(h && { h })
	};
}

describe('trueCosts', () => {
	it('gives the road distances to Bucharest (Informed Search, slides 17–22)', () => {
		const hStar = trueCosts(ROMANIA_PROBLEM);
		expect(hStar.get('Arad')).toBe(418);
		expect(hStar.get('Sibiu')).toBe(278);
		expect(hStar.get('Rimnicu Vilcea')).toBe(198);
		expect(hStar.get('Pitesti')).toBe(101);
		expect(hStar.get('Fagaras')).toBe(211);
		expect(hStar.get('Bucharest')).toBe(0);
		expect([...hStar.keys()]).toEqual(ROMANIA_PROBLEM.graph.nodes.map((n) => n.id));
		for (const v of hStar.values()) expect(Number.isFinite(v)).toBe(true);
	});

	it('gives h* for "A* gone wrong" (Informed Search, slide 27)', () => {
		expect(Object.fromEntries(trueCosts(ASTAR_WRONG_PROBLEM))).toEqual({
			S: 5,
			A: 4,
			B: 5,
			C: 3,
			G: 0
		});
	});

	it('follows edge directions and gives Infinity when no goal is reachable', () => {
		const hStar = trueCosts(TINY_PROBLEM);
		expect(hStar.get('S')).toBe(10);
		expect(hStar.get('r')).toBe(3);
		for (const id of ['a', 'h', 'p', 'q']) expect(hStar.get(id)).toBe(Infinity);
	});

	it('takes the nearest of several goals and ignores goals that are not states', () => {
		const s = {
			...make(
				[
					['A', 'B', 4],
					['B', 'C', 1],
					['A', 'C', 9]
				],
				'A',
				['C', 'B'],
				false
			),
			goals: ['C', 'B', 'Nowhere']
		};
		expect(Object.fromEntries(trueCosts(s))).toEqual({ A: 4, B: 0, C: 0 });
		expect(Object.fromEntries(trueCosts({ ...s, goals: [] }))).toEqual({
			A: Infinity,
			B: Infinity,
			C: Infinity
		});
	});
});

describe('shortestPath', () => {
	it('finds Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest, cost 418', () => {
		expect(shortestPath(ROMANIA_PROBLEM)).toEqual({
			cost: 418,
			states: ['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']
		});
	});

	it('finds the UCS solution of the tiny search problem (Uninformed Search, slide 41)', () => {
		expect(shortestPath(TINY_PROBLEM)).toEqual({
			cost: 10,
			states: ['S', 'd', 'e', 'r', 'f', 'G']
		});
	});

	it('finds the optimal path of "A* gone wrong" and of the binary tree', () => {
		expect(shortestPath(ASTAR_WRONG_PROBLEM)).toEqual({ cost: 5, states: ['S', 'A', 'C', 'G'] });
		expect(shortestPath(BINARY_TREE_PROBLEM)).toEqual({ cost: 3, states: ['A', 'C', 'F', 'M'] });
	});

	it('returns the start alone when it is a goal, and null when no goal is reachable', () => {
		expect(shortestPath({ ...TINY_PROBLEM, goals: ['S'] })).toEqual({ cost: 0, states: ['S'] });
		expect(shortestPath({ ...TINY_PROBLEM, start: 'a' })).toBeNull();
		expect(shortestPath({ ...TINY_PROBLEM, start: 'Nowhere' })).toBeNull();
		expect(shortestPath({ ...TINY_PROBLEM, goals: [] })).toBeNull();
	});

	it('breaks ties by name order', () => {
		const diamond = make(
			[
				['S', 'b', 1],
				['S', 'A', 1],
				['b', 'G', 1],
				['A', 'G', 1]
			],
			'S',
			['G']
		);
		expect(shortestPath(diamond)).toEqual({ cost: 2, states: ['S', 'A', 'G'] });
		// Two goals at the same cost: the path that comes first in name order.
		const goals = make(
			[
				['S', 'x', 2],
				['S', 'y', 1],
				['y', 'G2', 1],
				['x', 'G1', 0]
			],
			'S',
			['G2', 'G1']
		);
		expect(shortestPath(goals)).toEqual({ cost: 2, states: ['S', 'x', 'G1'] });
		// Digit runs by value: q2 before q10.
		const digits = make(
			[
				['S', 'q10', 1],
				['S', 'q2', 1],
				['q10', 'G', 1],
				['q2', 'G', 1]
			],
			'S',
			['G']
		);
		expect(shortestPath(digits)!.states).toEqual(['S', 'q2', 'G']);
	});

	it('walks undirected edges both ways and stays simple with zero-cost edges', () => {
		const s = make(
			[
				['S', 'A', 0],
				['A', 'B', 0],
				['B', 'S', 0],
				['S', 'G', 5],
				['B', 'G', 5]
			],
			'S',
			['G'],
			false
		);
		const path = shortestPath(s)!;
		expect(path.cost).toBe(5);
		expect(new Set(path.states).size).toBe(path.states.length);
		expect(path.states.at(-1)).toBe('G');
	});
});

describe('checkHeuristic', () => {
	it('finds straight-line distance to Bucharest admissible and consistent (slide 25)', () => {
		const r = checkHeuristic(ROMANIA_PROBLEM);
		expect(r.admissible).toBe(true);
		expect(r.consistent).toBe(true);
		expect(r.goalsZero).toBe(true);
		expect(r.nodes).toHaveLength(20);
		expect(r.nodes.find((n) => n.id === 'Arad')).toEqual({
			id: 'Arad',
			h: 366,
			hStar: 418,
			admissible: true
		});
		// Undirected roads are checked both ways.
		expect(r.edges).toHaveLength(46);
		expect(r.edges.slice(0, 2)).toEqual([
			{ from: 'Arad', to: 'Zerind', cost: 75, hFrom: 366, hTo: 374, consistent: true },
			{ from: 'Zerind', to: 'Arad', cost: 75, hFrom: 374, hTo: 366, consistent: true }
		]);
	});

	it('finds "A* gone wrong" admissible but inconsistent at A → C (slides 27–28)', () => {
		const r = checkHeuristic(ASTAR_WRONG_PROBLEM);
		expect(r.nodes.map((n) => [n.id, n.h, n.hStar])).toEqual([
			['S', 2, 5],
			['A', 4, 4],
			['B', 1, 5],
			['C', 1, 3],
			['G', 0, 0]
		]);
		expect(r.admissible).toBe(true);
		expect(r.goalsZero).toBe(true);
		expect(r.consistent).toBe(false);
		expect(r.edges).toHaveLength(5);
		expect(r.edges.filter((e) => !e.consistent)).toEqual([
			{ from: 'A', to: 'C', cost: 1, hFrom: 4, hTo: 1, consistent: false }
		]);
	});

	it('finds the measured straight-line distance to Fagaras admissible and consistent', () => {
		// Scaled so no road is shorter than its drawn length (builtins.ts).
		const r = checkHeuristic(ROMANIA_IASI_FAGARAS);
		expect(SLD_FAGARAS).toMatchObject({
			Fagaras: 0,
			Sibiu: 97,
			Iasi: 174,
			Neamt: 130,
			Vaslui: 200
		});
		expect(r.goalsZero).toBe(true);
		expect(r.admissible).toBe(true);
		expect(r.consistent).toBe(true);
		expect(trueCosts(ROMANIA_IASI_FAGARAS).get('Iasi')).toBe(530);
	});

	it('finds the greedy-trap heuristic admissible and consistent', () => {
		const r = checkHeuristic(GREEDY_TRAP_PROBLEM);
		expect(r.admissible).toBe(true);
		expect(r.consistent).toBe(true);
	});

	it('uses h = 0 for missing values, and a given heuristic over the spec’s own', () => {
		const zero = checkHeuristic(TINY_PROBLEM);
		expect(zero.admissible && zero.consistent && zero.goalsZero).toBe(true);
		expect(zero.nodes.every((n) => n.h === 0)).toBe(true);

		const own = checkHeuristic(ROMANIA_PROBLEM, { Bucharest: 5, Arad: 500 });
		expect(own.goalsZero).toBe(false);
		expect(own.admissible).toBe(false);
		expect(own.nodes.filter((n) => !n.admissible).map((n) => n.id)).toEqual(['Arad', 'Bucharest']);
		expect(own.nodes.find((n) => n.id === 'Sibiu')!.h).toBe(0);
	});

	it('counts states that cannot reach a goal as admissible', () => {
		const r = checkHeuristic(TINY_PROBLEM, { a: 1000, q: 50 });
		expect(r.nodes.find((n) => n.id === 'a')).toEqual({
			id: 'a',
			h: 1000,
			hStar: Infinity,
			admissible: true
		});
		expect(r.admissible).toBe(true);
		// b → a (cost 2) with h(b) = 0 is fine; nothing points out of a.
		expect(r.consistent).toBe(true);
		expect(checkHeuristic(TINY_PROBLEM, { h: 50 }).consistent).toBe(false); // e → h: 0 ≤ 8 + 50, h → p: 50 > 4 + 0
	});

	it('checks a self-loop once and treats "constructor" as an ordinary state name', () => {
		const s = make(
			[
				['constructor', 'constructor', 1],
				['constructor', 'G', 2]
			],
			'constructor',
			['G'],
			false
		);
		const r = checkHeuristic(s, {});
		expect(r.edges.map((e) => `${e.from}-${e.to}`)).toEqual([
			'constructor-constructor',
			'constructor-G',
			'G-constructor'
		]);
		expect(r.nodes[0].h).toBe(0);
	});
});

describe('compareHeuristics', () => {
	const s = make(
		[
			['S', 'A', 2],
			['A', 'G', 2],
			['S', 'G', 5]
		],
		'S',
		['G']
	);

	it('reports dominance: h2(n) ≥ h1(n) for every n (slide 35)', () => {
		const h1 = { S: 1, A: 1 };
		const h2 = { S: 3, A: 2, G: 0 };
		expect(compareHeuristics(s, h1, h2)).toEqual({
			dominates: true,
			equal: false,
			nodes: [
				{ id: 'S', h1: 1, h2: 3 },
				{ id: 'G', h1: 0, h2: 0 },
				{ id: 'A', h1: 1, h2: 2 }
			]
		});
		expect(compareHeuristics(s, h2, h1).dominates).toBe(false);
		// Neither dominates when each is larger somewhere.
		const h3 = { S: 4, A: 0 };
		expect(compareHeuristics(s, h2, h3).dominates).toBe(false);
		expect(compareHeuristics(s, h3, h2).dominates).toBe(false);
	});

	it('reports equal heuristics, with missing values as 0', () => {
		expect(compareHeuristics(s, { S: 3, G: 0 }, { S: 3 })).toMatchObject({
			dominates: true,
			equal: true
		});
	});

	it('compares h1 and h2 on the Romania map: SLD dominates zero', () => {
		const r = compareHeuristics(ROMANIA_PROBLEM, {}, SLD_BUCHAREST);
		expect(r.dominates).toBe(true);
		expect(r.equal).toBe(false);
		expect(r.nodes).toHaveLength(20);
	});
});

describe('maxHeuristic', () => {
	it('takes the pointwise maximum over every named state (slide 37)', () => {
		expect(maxHeuristic({ A: 1, B: 5 }, { A: 3, C: 2 }, { B: 4 })).toEqual({ A: 3, B: 5, C: 2 });
		expect(maxHeuristic()).toEqual({});
		expect(maxHeuristic({ A: 2 })).toEqual({ A: 2 });
	});

	it('keeps admissibility: the max of admissible heuristics is admissible', () => {
		const h1 = { S: 5, A: 1, B: 0, C: 3 };
		const h2 = { S: 2, A: 4, B: 5, C: 1 };
		expect(checkHeuristic(ASTAR_WRONG_PROBLEM, h1).admissible).toBe(true);
		expect(checkHeuristic(ASTAR_WRONG_PROBLEM, h2).admissible).toBe(true);
		const h = maxHeuristic(h1, h2);
		expect(h).toEqual({ S: 5, A: 4, B: 5, C: 3 });
		expect(checkHeuristic(ASTAR_WRONG_PROBLEM, h).admissible).toBe(true);
		expect(compareHeuristics(ASTAR_WRONG_PROBLEM, h1, h).dominates).toBe(true);
	});

	it('stores unusual state names as own properties', () => {
		const withProto = JSON.parse('{"__proto__": 7}') as Record<string, number>;
		const h = maxHeuristic(withProto, { constructor: 2 });
		expect(Object.keys(h)).toEqual(['__proto__', 'constructor']);
		expect(Object.getOwnPropertyDescriptor(h, '__proto__')!.value).toBe(7);
		expect(h.constructor).toBe(2);
		expect(Object.getPrototypeOf(h)).toBe(Object.prototype);
	});
});
