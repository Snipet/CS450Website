/**
 * Invariants of the search engine checked on seeded random graphs (parallel
 * edges, self-loops, zero-cost edges, unreachable goals) for every strategy,
 * repeated-state mode, and goal-test timing, plus targeted edge cases.
 */
import { describe, expect, it } from 'vitest';
import { ROMANIA_PROBLEM, graphProblem, trueCosts, type GraphProblemSpec } from '../graphs';
import { frontierAfter, normalizeOptions, search } from './search';
import type {
	RepeatMode,
	SearchOptions,
	SearchProblem,
	SearchResult,
	SearchStep,
	StrategyId
} from './types';

const STRATEGIES: StrategyId[] = ['bfs', 'dfs', 'dls', 'ids', 'ucs', 'greedy', 'astar', 'wastar'];
const MODES: RepeatMode[] = ['tree', 'path', 'graph'];
const GOAL_TESTS = ['expand', 'generate'] as const;

/** mulberry32 */
function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A random graph problem: up to 7 states, parallel edges, self-loops, zero costs. */
function randomSpec(seed: number): GraphProblemSpec {
	const r = rng(seed);
	const int = (n: number) => Math.floor(r() * n);
	const n = 1 + int(7);
	const ids = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
	const costs = [0, 1, 1, 2, 3, 5];
	const edges = Array.from({ length: int(2 * n + 3) }, () => ({
		from: ids[int(n)],
		to: ids[int(n)],
		cost: costs[int(costs.length)]
	}));
	const goals = ids.filter(() => r() < 0.2);
	const h = Object.fromEntries(ids.map((id) => [id, int(6)]));
	return {
		graph: { directed: r() < 0.6, nodes: ids.map((id) => ({ id })), edges },
		start: ids[int(n)],
		goals,
		h
	};
}

/** Scales h* by `factor` (≤ 1): admissible and consistent. States that cannot reach a goal get a large value. */
function scaledTrueCosts(spec: GraphProblemSpec, factor: number): Record<string, number> {
	const star = trueCosts(spec);
	return Object.fromEntries(
		[...star].map(([id, v]) => [id, Number.isFinite(v) ? Math.floor(v * factor) : 1000])
	);
}

const isPop = (r: SearchResult, s: SearchStep, i: number) =>
	s.kind === 'expand' ||
	s.kind === 'cutoff' ||
	(s.kind === 'goal' && r.options.goalTest === 'expand' && i > 0 && r.steps[i - 1].kind !== 'goal');

/** Steps without their frontier and explored-set snapshots. */
function strip(steps: SearchStep[]) {
	return steps.map((step) => {
		const rest: Partial<SearchStep> = { ...step };
		delete rest.frontier;
		delete rest.explored;
		return rest;
	});
}

/** Checks one run against the other recording levels and the engine's invariants; returns the violations. */
function checkInvariants(p: SearchProblem<string>, options: SearchOptions): string[] {
	const errors: string[] = [];
	const check = (ok: boolean, message: string) => {
		if (!ok) errors.push(message);
	};
	const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
	const full = search(p, options);
	const bare = search(p, { ...options, record: 'nodes' });
	const sum = search(p, { ...options, record: 'summary' });
	const { strategy, mode } = full.options;
	const limited = strategy === 'dls' || strategy === 'ids';
	const priority = ['ucs', 'greedy', 'astar', 'wastar'].includes(strategy);
	const solutionText = (r: SearchResult) =>
		r.solution && { ...r.solution, node: 0, path: r.solution.path.map(() => 0) };

	// Recording levels agree.
	check(same(bare.nodes, full.nodes), 'record nodes: nodes differ');
	check(same(strip(bare.steps), strip(full.steps)), 'record nodes: steps differ');
	check(same(sum.order, full.order), 'summary: order differs');
	check(same(sum.stats, full.stats), 'summary: stats differ');
	check(sum.failure === full.failure, 'summary: failure differs');
	check(same(sum.iterations, full.iterations), 'summary: iterations differ');
	check(same(solutionText(sum), solutionText(full)), 'summary: solution differs');
	check(sum.steps.length === 0, 'summary: has steps');

	// Snapshots: frontierAfter reproduces them as sets; the next pop takes the first entry;
	// a priority queue lists its entries by priority.
	full.steps.forEach((step, i) => {
		const snap = step.frontier!;
		const sorted = [...snap].sort((a, b) => a - b);
		check(same(frontierAfter(bare, i), sorted), `step ${i}: frontierAfter ≠ snapshot`);
		check(new Set(snap).size === snap.length, `step ${i}: node twice on the frontier`);
		if (i > 0 && isPop(full, step, i) && step.iteration === full.steps[i - 1].iteration)
			check(
				step.node === full.steps[i - 1].frontier![0],
				`step ${i}: not the head of the frontier`
			);
		if (priority)
			for (let k = 1; k < snap.length; k++)
				check(
					full.nodes[snap[k - 1]].priority! <= full.nodes[snap[k]].priority!,
					`step ${i}: frontier out of priority order`
				);
	});

	// Replaced and dropped nodes are never taken off the frontier; no node is taken off twice.
	for (const n of full.nodes) {
		if (n.replacedAt !== null) check(n.closed === null, `replaced node ${n.id} was taken off`);
		if (n.outcome !== null && n.outcome !== 'added' && n.outcome !== 'replaced')
			check(n.closed === null, `dropped node ${n.id} was taken off`);
	}
	const popped = full.steps.flatMap((s, i) => (isPop(full, s, i) ? [s.node!] : []));
	check(new Set(popped).size === popped.length, 'a node was taken off twice');

	// Graph search takes each state off the frontier at most once (with a depth limit:
	// expands it at most once per iteration).
	if (mode === 'graph') {
		const seen = new Set<string>();
		full.steps.forEach((s, i) => {
			if (!(limited ? s.kind === 'expand' : isPop(full, s, i))) return;
			const k = `${s.iteration} ${full.nodes[s.node!].key}`;
			check(!seen.has(k), `step ${i}: state ${k} again`);
			seen.add(k);
		});
	}

	// Outcomes are justified.
	for (const n of full.nodes) {
		if (n.outcome === 'on-path') {
			let found = false;
			for (let a = n.parent; a !== null; a = full.nodes[a].parent)
				if (full.nodes[a].key === n.key) found = true;
			check(found, `node ${n.id}: on-path without a repeat on its path`);
		}
		if (n.outcome === 'explored')
			check(full.steps[n.created].explored!.includes(n.key), `node ${n.id}: not explored`);
		if (n.outcome === 'frontier' || n.outcome === 'replaced') {
			const before = n.created > 0 ? full.steps[n.created - 1].frontier! : [];
			const siblings = full.steps[n.created].children.filter((c) => c < n.id);
			const rivals = [...before, ...siblings].filter(
				(id) => full.nodes[id].key === n.key && full.nodes[id].outcome !== 'frontier'
			);
			check(rivals.length > 0, `node ${n.id}: ${n.outcome} without a frontier node for its state`);
			if (n.outcome === 'frontier' && priority)
				check(
					rivals.some((id) => full.nodes[id].g <= n.g),
					`node ${n.id}: dropped although cheaper`
				);
		}
	}

	// Counts.
	check(full.stats.popped === full.order.length, 'popped ≠ order length');
	check(full.stats.popped === popped.length, 'popped ≠ pop steps');
	check(
		full.stats.expanded === full.steps.filter((s) => s.kind === 'expand').length,
		'expanded ≠ expand steps'
	);
	check(full.stats.generated === full.nodes.length, 'generated ≠ nodes');
	check(
		full.stats.maxFrontier === Math.max(...full.steps.map((s) => s.frontier!.length)),
		'maxFrontier ≠ largest snapshot'
	);
	check(full.stats.popped <= full.options.maxExpansions, 'popped > maxExpansions');
	if (full.failure === 'limit')
		check(
			full.stats.popped >= full.options.maxExpansions ||
				full.stats.generated >= full.options.maxNodes,
			'limit without reaching a limit'
		);
	check((full.solution === null) === (full.failure !== null), 'solution and failure disagree');
	check(full.steps.at(-1)?.kind === (full.solution ? 'goal' : 'fail'), 'last step kind');

	// The solution is a path of the problem that ends in a goal.
	if (full.solution) {
		const { path, states, actions, cost, depth } = full.solution;
		check(states[0] === p.key(p.initial), 'solution does not start at the initial state');
		check(p.isGoal(states.at(-1)!), 'solution does not end in a goal');
		check(depth === path.length - 1 && actions.length === depth, 'solution depth');
		let g = 0;
		for (let k = 1; k < path.length; k++) {
			const step = full.nodes[path[k]].g - full.nodes[path[k - 1]].g;
			const costs = p
				.successors(states[k - 1])
				.filter((s) => s.state === states[k])
				.map((s) => s.cost);
			check(costs.includes(step), `solution step ${k} is not an edge`);
			g += step;
		}
		check(cost === g, 'solution cost ≠ sum of step costs');
		if (limited) check(depth <= full.iterations.at(-1)!.limit, 'solution below the depth limit');
	}
	return errors;
}

describe('search invariants on random graphs', () => {
	it('hold for every strategy, repeated-state mode and goal test', () => {
		const errors: string[] = [];
		for (let seed = 1; seed <= 100; seed++) {
			const spec = randomSpec(seed);
			const p = graphProblem(spec, { order: seed % 2 ? 'alphabetical' : 'listed' });
			for (const strategy of STRATEGIES)
				for (const mode of MODES)
					for (const goalTest of GOAL_TESTS)
						for (const e of checkInvariants(p, {
							strategy,
							mode,
							goalTest,
							maxExpansions: 60,
							depthLimit: strategy === 'ids' ? 6 : 2
						}))
							errors.push(`seed ${seed} ${strategy}/${mode}/${goalTest}: ${e}`);
		}
		expect(errors).toEqual([]);
	}, 60_000);

	it('UCS and A* return optimal solutions; BFS and IDS the shallowest', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const spec = randomSpec(seed);
			const star = trueCosts(spec).get(spec.start)!;
			const consistent = graphProblem({
				...spec,
				h: scaledTrueCosts(spec, seed % 3 === 0 ? 1 : 0.5)
			});
			const unit = graphProblem({
				...spec,
				graph: { ...spec.graph, edges: spec.graph.edges.map((e) => ({ ...e, cost: 1 })) }
			});
			const shallowest = trueCosts({
				...spec,
				graph: { ...spec.graph, edges: spec.graph.edges.map((e) => ({ ...e, cost: 1 })) }
			}).get(spec.start)!;
			const limits = { maxExpansions: 2000, maxNodes: 20_000, record: 'summary' } as const;
			for (const goalTest of GOAL_TESTS) {
				for (const mode of MODES) {
					for (const strategy of ['ucs', 'astar'] as const) {
						// Goal test at generation can return a costlier path (the slides test on expansion).
						if (goalTest === 'generate') continue;
						const r = search(consistent, { strategy, mode, goalTest, ...limits });
						if (mode === 'graph' || Number.isFinite(star)) {
							if (r.solution)
								expect(r.solution.cost, `seed ${seed} ${strategy}/${mode}`).toBe(star);
							if (mode !== 'tree') expect(r.solution === null).toBe(!Number.isFinite(star));
						}
					}
					const bfs = search(unit, { strategy: 'bfs', mode, goalTest, ...limits });
					if (mode !== 'tree' || bfs.solution) {
						expect(bfs.solution?.depth ?? Infinity, `seed ${seed} bfs/${mode}/${goalTest}`).toBe(
							shallowest
						);
					}
					if (mode === 'graph') continue; // DLS with an explored set can miss shallow goals
					const ids = search(unit, { strategy: 'ids', mode, goalTest, depthLimit: 10, ...limits });
					if (ids.failure !== 'limit')
						expect(ids.solution?.depth ?? Infinity, `seed ${seed} ids/${mode}/${goalTest}`).toBe(
							shallowest
						);
				}
			}
		}
	}, 60_000);
});

/** A problem given by successor lists (duplicates allowed). */
function listProblem(
	succ: Record<string, [string, number][]>,
	initial: string,
	goals: string[],
	h?: Record<string, number>
): SearchProblem<string> {
	return {
		initial,
		key: (s) => s,
		successors: (s) => (succ[s] ?? []).map(([state, cost]) => ({ action: state, state, cost })),
		isGoal: (s) => goals.includes(s),
		...(h && { h: (s: string) => h[s] ?? 0 })
	};
}

describe('edge cases', () => {
	it('a cheaper duplicate successor replaces its sibling before it reaches the frontier', () => {
		const p = listProblem(
			{
				S: [
					['A', 5],
					['A', 3],
					['A', 4]
				],
				A: [['G', 10]]
			},
			'S',
			['G']
		);
		for (const strategy of ['ucs', 'astar', 'greedy', 'wastar'] as const) {
			const r = search(p, { strategy, mode: 'graph' });
			expect(r.order, strategy).toEqual(['S', 'A', 'G']);
			expect(r.steps[1].frontier, strategy).toEqual([2]);
			expect(r.nodes.map((n) => n.outcome)).toEqual([
				null,
				'added',
				'replaced',
				'frontier',
				'added'
			]);
			expect(r.nodes[1]).toMatchObject({ replacedAt: 1, closed: null });
			expect(r.solution?.cost).toBe(13);
			expect(r.stats.expanded).toBe(2);
		}
		// BFS and DFS keep the first one (no replacement without priorities).
		for (const strategy of ['bfs', 'dfs'] as const) {
			const r = search(p, { strategy, mode: 'graph' });
			expect(
				r.nodes.map((n) => n.outcome),
				strategy
			).toEqual([null, 'added', 'frontier', 'frontier', 'added']);
			expect(r.solution?.cost).toBe(15);
		}
	});

	it('self-loops are dropped by the path check and graph search, and followed by tree search', () => {
		const p = listProblem(
			{
				S: [
					['S', 0],
					['G', 1]
				]
			},
			'S',
			['G']
		);
		expect(search(p, { strategy: 'dfs', mode: 'path' }).nodes[1].outcome).toBe('on-path');
		expect(search(p, { strategy: 'dfs', mode: 'graph' }).nodes[1].outcome).toBe('explored');
		const tree = search(p, { strategy: 'dfs', maxExpansions: 5 });
		expect(tree.failure).toBe('limit');
		expect(tree.order).toEqual(['S', 'S', 'S', 'S', 'S']);
		// UCS pops the zero-cost self-loop first, then the goal.
		expect(search(p, { strategy: 'ucs', maxExpansions: 5 }).failure).toBe('limit');
		expect(search(p, { strategy: 'ucs', mode: 'graph' }).order).toEqual(['S', 'G']);
	});

	it('zero-cost edges: UCS still finds the cheapest path, ties first in, first out', () => {
		const p = listProblem(
			{
				S: [
					['A', 0],
					['B', 0]
				],
				A: [['G', 2]],
				B: [
					['C', 0],
					['G', 3]
				],
				C: [['G', 1]]
			},
			'S',
			['G']
		);
		for (const mode of MODES) {
			const r = search(p, { strategy: 'ucs', mode });
			expect(r.solution?.states, mode).toEqual(['S', 'B', 'C', 'G']);
			expect(r.order.slice(0, 4), mode).toEqual(['S', 'A', 'B', 'C']);
		}
	});

	it('an initial goal state is returned at once by every strategy and mode', () => {
		const p = listProblem({ S: [['A', 1]] }, 'S', ['S']);
		for (const strategy of STRATEGIES)
			for (const mode of MODES) {
				const e = search(p, { strategy, mode });
				expect(e.solution, `${strategy}/${mode}`).toMatchObject({ states: ['S'], cost: 0 });
				expect(e.order).toEqual(['S']);
				expect(e.stats).toMatchObject({ popped: 1, expanded: 0, generated: 1 });
				const g = search(p, { strategy, mode, goalTest: 'generate', record: 'nodes' });
				expect(g.steps.map((s) => s.kind)).toEqual(['init', 'goal']);
				expect(g.order).toEqual([]);
				expect(g.stats).toMatchObject({ popped: 0, expanded: 0, generated: 1, maxFrontier: 0 });
				// The root never entered the frontier.
				expect(frontierAfter(g, 0)).toEqual([]);
				expect(frontierAfter(g, 1)).toEqual([]);
			}
	});

	it('unreachable goals: the frontier empties (or the path check stops the loop)', () => {
		const p = listProblem({ S: [['A', 1]], A: [['S', 1]], G: [] }, 'S', ['G']);
		for (const strategy of ['bfs', 'dfs', 'ucs', 'greedy', 'astar', 'wastar'] as const) {
			expect(search(p, { strategy, mode: 'graph' }).failure, strategy).toBe('exhausted');
			expect(search(p, { strategy, mode: 'path' }).failure, strategy).toBe('exhausted');
			expect(search(p, { strategy, maxExpansions: 7 }).failure, strategy).toBe('limit');
		}
		expect(search(p, { strategy: 'dls', mode: 'path', depthLimit: 5 }).failure).toBe('exhausted');
		expect(search(p, { strategy: 'dls', depthLimit: 5 }).failure).toBe('cutoff');
		const ids = search(p, { strategy: 'ids', mode: 'path' });
		expect(ids.failure).toBe('exhausted');
		expect(ids.iterations.map((i) => i.cutoff)).toEqual([true, true, false]);
		const idsTree = search(p, { strategy: 'ids', depthLimit: 4 });
		expect(idsTree.failure).toBe('cutoff');
		expect(idsTree.iterations).toHaveLength(5);
	});

	it('goal test at generation, in every mode, tests each child before it is added', () => {
		const p = listProblem(
			{
				S: [
					['A', 1],
					['G', 10]
				],
				A: [['G', 1]]
			},
			'S',
			['G']
		);
		for (const mode of MODES) {
			for (const strategy of ['bfs', 'dfs', 'ucs'] as const) {
				const r = search(p, { strategy, mode, goalTest: 'generate' });
				expect(r.solution?.cost, `${strategy}/${mode}`).toBe(10);
				expect(r.order).toEqual(['S']);
				expect(r.steps.map((s) => s.kind)).toEqual(['init', 'expand', 'goal']);
			}
		}
	});

	it('maxExpansions and maxNodes stop exactly at their boundaries', () => {
		const chain = listProblem({ S: [['A', 1]], A: [['B', 1]], B: [['G', 1]] }, 'S', ['G']);
		// Four pops reach the goal: three expansions and the goal test.
		expect(search(chain, { strategy: 'bfs', maxExpansions: 4 }).solution?.depth).toBe(3);
		const three = search(chain, { strategy: 'bfs', maxExpansions: 3 });
		expect(three.failure).toBe('limit');
		expect(three.stats.popped).toBe(3);
		// Four nodes are generated before the goal is taken off the frontier.
		expect(search(chain, { strategy: 'bfs', maxNodes: 5 }).solution?.depth).toBe(3);
		const four = search(chain, { strategy: 'bfs', maxNodes: 4 });
		expect(four.failure).toBe('limit');
		expect(four.stats.generated).toBe(4);
		expect(search(chain, { strategy: 'bfs', maxNodes: 1 }).stats.popped).toBe(0);
	});

	it('the depth limit cuts off nodes at the limit, even goals below them', () => {
		const chain = listProblem({ S: [['A', 1]], A: [['G', 1]] }, 'S', ['G']);
		const d1 = search(chain, { strategy: 'dls', depthLimit: 1 });
		expect(d1.failure).toBe('cutoff');
		expect(d1.steps.map((s) => s.kind)).toEqual(['init', 'expand', 'cutoff', 'fail']);
		// At generation too: A is at the limit, so G is never generated.
		expect(search(chain, { strategy: 'dls', depthLimit: 1, goalTest: 'generate' }).failure).toBe(
			'cutoff'
		);
		// With limit 2, expanding A (depth 1) generates G, which passes the test at once.
		const g2 = search(chain, { strategy: 'dls', depthLimit: 2, goalTest: 'generate' });
		expect(g2.solution?.depth).toBe(2);
		expect(g2.order).toEqual(['S', 'A']);
		expect(search(chain, { strategy: 'dls', depthLimit: 2 }).solution?.depth).toBe(2);
		expect(search(chain, { strategy: 'dls', depthLimit: 0 }).steps.map((s) => s.kind)).toEqual([
			'init',
			'cutoff',
			'fail'
		]);
		const ids = search(chain, { strategy: 'ids', depthLimit: 0 });
		expect(ids.failure).toBe('cutoff');
		expect(ids.iterations).toHaveLength(1);
	});
});

describe('normalizeOptions', () => {
	it('fills in defaults, also for NaN from an empty number field', () => {
		expect(normalizeOptions({ strategy: 'ids' })).toMatchObject({
			mode: 'tree',
			depthLimit: 50,
			weight: 2,
			goalTest: 'expand',
			maxExpansions: 10_000,
			maxNodes: 200_000,
			record: 'full'
		});
		expect(normalizeOptions({ strategy: 'dls' }).depthLimit).toBe(3);
		expect(
			normalizeOptions({
				strategy: 'dls',
				depthLimit: NaN,
				weight: NaN,
				maxExpansions: NaN,
				maxNodes: NaN
			})
		).toMatchObject({ depthLimit: 3, weight: 2, maxExpansions: 10_000, maxNodes: 200_000 });
		expect(normalizeOptions({ strategy: 'bfs', maxExpansions: 0, depthLimit: -2.5 })).toMatchObject(
			{
				maxExpansions: 1,
				depthLimit: 0
			}
		);
	});

	it('keeps a search with NaN limits bounded', () => {
		const loop = listProblem({ S: [['A', 1]], A: [['S', 1]] }, 'S', ['G']);
		const r = search(loop, { strategy: 'dfs', maxExpansions: NaN, maxNodes: NaN });
		expect(r.failure).toBe('limit');
		expect(r.stats.popped).toBe(10_000);
		expect(
			search(loop, { strategy: 'ids', depthLimit: NaN, maxExpansions: 100 }).iterations.length
		).toBeGreaterThan(0);
	});
});

describe('graph search on Romania (Solving Problems by Searching, slides 37–43, golden)', () => {
	// "Search without repeated states": the tree of slide 43 with its path costs,
	// the crossed-out children, and Bucharest (450) replaced by Bucharest (418).
	const r = search(graphProblem(ROMANIA_PROBLEM), { strategy: 'astar', mode: 'graph' });
	const kids = (step: number) =>
		r.steps[step].children.map(
			(id) => `${r.nodes[id].label} ${r.nodes[id].g} ${r.nodes[id].outcome}`
		);

	it('expands Arad, Sibiu, Rimnicu Vilcea, Fagaras, Pitesti and returns Bucharest at 418', () => {
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Fagaras', 'Pitesti', 'Bucharest']);
		expect(r.solution?.cost).toBe(418);
	});

	it('crosses out explored states and costlier frontier duplicates as the slides do', () => {
		expect(kids(1)).toEqual(['Sibiu 140 added', 'Timisoara 118 added', 'Zerind 75 added']);
		expect(kids(2)).toEqual([
			'Arad 280 explored',
			'Fagaras 239 added',
			'Oradea 291 added',
			'Rimnicu Vilcea 220 added'
		]);
		expect(kids(3)).toEqual(['Craiova 366 added', 'Pitesti 317 added', 'Sibiu 300 explored']);
		expect(kids(4)).toEqual(['Bucharest 450 added', 'Sibiu 338 explored']);
		expect(kids(5)).toEqual([
			'Bucharest 418 replaced',
			'Craiova 455 frontier',
			'Rimnicu Vilcea 414 explored'
		]);
		const replaced = r.nodes.find((n) => n.label === 'Bucharest' && n.g === 450)!;
		expect(replaced.replacedAt).toBe(5);
		expect(r.steps.at(-1)?.explored).toEqual([
			'Arad',
			'Sibiu',
			'Rimnicu Vilcea',
			'Fagaras',
			'Pitesti'
		]);
	});
});
