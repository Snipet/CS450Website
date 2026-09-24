import { describe, expect, it } from 'vitest';
import {
	ASTAR_WRONG_PROBLEM,
	BINARY_TREE_PROBLEM,
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	graphProblem
} from '../graphs';
import { createFrontier } from './frontier';
import { frontierAfter, search } from './search';
import type { SearchOptions, SearchResult } from './types';

const tiny = graphProblem(TINY_PROBLEM);
const romania = graphProblem(ROMANIA_PROBLEM);

const labels = (r: SearchResult, ids: readonly number[]) => ids.map((id) => r.nodes[id].label);
const run = (p: typeof tiny, o: SearchOptions) => search(p, o);

describe('frontier', () => {
	it('FIFO, LIFO, and priority order with lazy removal', () => {
		const fifo = createFrontier('fifo');
		[1, 2, 3].forEach((id) => fifo.push(id, 0));
		fifo.remove(2);
		expect(fifo.snapshot()).toEqual([1, 3]);
		expect([fifo.pop(), fifo.pop(), fifo.pop()]).toEqual([1, 3, undefined]);

		const lifo = createFrontier('lifo');
		[1, 2, 3].forEach((id) => lifo.push(id, 0));
		expect(lifo.snapshot()).toEqual([3, 2, 1]);
		lifo.remove(3);
		expect(lifo.size).toBe(2);
		expect(lifo.pop()).toBe(2);

		const pq = createFrontier('priority');
		pq.push(1, 5);
		pq.push(2, 3);
		pq.push(3, 5);
		pq.push(4, 3);
		expect(pq.snapshot()).toEqual([2, 4, 1, 3]);
		pq.remove(4);
		expect([pq.pop(), pq.pop(), pq.pop(), pq.pop()]).toEqual([2, 1, 3, undefined]);
		expect(pq.size).toBe(0);
	});
});

describe('uninformed search on the tiny search problem (golden)', () => {
	it('BFS expansion order matches Uninformed Search, slide 4', () => {
		const r = run(tiny, { strategy: 'bfs' });
		expect(r.order.join(',')).toBe('S,d,e,p,b,c,e,h,r,q,a,a,h,r,p,q,f,p,q,f,q,c,G');
		// Fewest steps, not the cheapest path (slide 39).
		expect(r.solution?.states).toEqual(['S', 'e', 'r', 'f', 'G']);
		expect(r.solution?.cost).toBe(14);
	});

	it('DFS expansion order matches Uninformed Search, slide 6', () => {
		const r = run(tiny, { strategy: 'dfs' });
		expect(r.order.join(',')).toBe('S,d,b,a,c,a,e,h,p,q,q,r,f,c,a,G');
		expect(r.solution?.states).toEqual(['S', 'd', 'e', 'r', 'f', 'G']);
	});

	it('UCS expansion order matches Uninformed Search, slide 41', () => {
		const r = run(tiny, { strategy: 'ucs' });
		expect(r.order.join(',')).toBe('S,p,d,b,e,a,r,f,e,G');
		expect(r.solution?.cost).toBe(10);
		expect(r.solution?.states).toEqual(['S', 'd', 'e', 'r', 'f', 'G']);
		// Path costs drawn on the slide's search tree.
		const g = Object.fromEntries(
			r.nodes.filter((n) => n.depth <= 2).map((n) => [`${n.label}@${n.depth}`, n.g])
		);
		expect(g).toMatchObject({ 'd@1': 3, 'e@1': 9, 'p@1': 1, 'b@2': 4, 'c@2': 11, 'e@2': 5 });
	});

	it('frontier snapshots follow each strategy', () => {
		const at1 = (o: SearchOptions) => {
			const r = run(tiny, o);
			return labels(r, r.steps[1].frontier!);
		};
		expect(at1({ strategy: 'bfs' })).toEqual(['d', 'e', 'p']);
		expect(at1({ strategy: 'dfs' })).toEqual(['d', 'e', 'p']);
		expect(at1({ strategy: 'ucs' })).toEqual(['p', 'd', 'e']);
		const r = run(tiny, { strategy: 'bfs' });
		expect(r.steps[0]).toMatchObject({ kind: 'init', frontier: [0], expanded: 0, generated: 1 });
		expect(r.steps.at(-1)?.kind).toBe('goal');
	});

	it('goal test at generation stops as soon as G is generated', () => {
		const r = run(tiny, { strategy: 'bfs', goalTest: 'generate' });
		expect(r.order.join(',')).toBe('S,d,e,p,b,c,e,h,r,q,a,a,h,r,p,q,f');
		expect(r.solution?.states).toEqual(['S', 'e', 'r', 'f', 'G']);
		const goal = r.nodes[r.solution!.node];
		expect(goal.outcome).toBe('goal');
		expect(goal.closed).toBeNull();
		expect(r.steps.at(-2)?.kind).toBe('expand');
	});

	it('depth-limited search reports a cutoff; IDS finds the shallowest goal', () => {
		const dls = run(tiny, { strategy: 'dls', depthLimit: 2 });
		expect(dls.solution).toBeNull();
		expect(dls.failure).toBe('cutoff');
		const ids = run(tiny, { strategy: 'ids' });
		expect(ids.iterations.map((i) => i.limit)).toEqual([0, 1, 2, 3, 4]);
		expect(ids.solution?.states).toEqual(['S', 'e', 'r', 'f', 'G']);
		expect(ids.iterations.at(-1)?.found).toBe(true);
	});
});

describe('iterative deepening on the binary tree (Uninformed Search, slides 34–37)', () => {
	it('restarts at each limit and finds M with limit 3', () => {
		const r = search(graphProblem(BINARY_TREE_PROBLEM), { strategy: 'ids' });
		expect(r.iterations.map((i) => i.order.join(''))).toEqual([
			'A',
			'ABC',
			'ABDECFG',
			'ABDHIEJKCFLM'
		]);
		// Nodes at the limit are cut off even when they are leaves (H–L in the last iteration).
		expect(r.iterations.map((i) => i.cutoff)).toEqual([true, true, true, true]);
		expect(r.solution?.states).toEqual(['A', 'C', 'F', 'M']);
		const inits = r.steps.filter((s) => s.kind === 'init').map((s) => s.iteration);
		expect(inits).toEqual([0, 1, 2, 3]);
		// Nodes of an iteration carry its limit; the root is recreated every time.
		expect(r.nodes.filter((n) => n.depth === 0).map((n) => n.iteration)).toEqual([0, 1, 2, 3]);
	});

	it('stops with a cutoff when the largest limit is too small', () => {
		const r = search(graphProblem(BINARY_TREE_PROBLEM), { strategy: 'ids', depthLimit: 2 });
		expect(r.solution).toBeNull();
		expect(r.failure).toBe('cutoff');
	});

	it('reports exhaustion once no node reaches the limit', () => {
		const r = search(graphProblem({ ...BINARY_TREE_PROBLEM, goals: ['Z'] }), { strategy: 'ids' });
		expect(r.failure).toBe('exhausted');
		// Limit 3 still cuts off the leaves; limit 4 expands them and finds nothing deeper.
		expect(r.iterations.map((i) => i.cutoff)).toEqual([true, true, true, true, false]);
	});
});

describe('Romania (golden)', () => {
	it('greedy best-first: Arad, Sibiu, Fagaras, Bucharest (Informed Search, slides 8–11)', () => {
		const r = run(romania, { strategy: 'greedy' });
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
		expect(r.solution?.cost).toBe(450);
		const sibiuChildren = r.steps[2].children.map((id) => [r.nodes[id].label, r.nodes[id].h]);
		expect(sibiuChildren).toEqual([
			['Arad', 366],
			['Fagaras', 176],
			['Oradea', 380],
			['Rimnicu Vilcea', 193]
		]);
	});

	it('A*: f = g + h values and expansion order match Informed Search, slides 17–22', () => {
		const r = run(romania, { strategy: 'astar' });
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Fagaras', 'Pitesti', 'Bucharest']);
		expect(r.solution?.states).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']);
		expect(r.solution?.cost).toBe(418);
		const f = (step: number) =>
			r.steps[step].children.map((id) => {
				const n = r.nodes[id];
				return `${n.label} ${n.priority}=${n.g}+${n.h}`;
			});
		expect(f(1)).toEqual(['Sibiu 393=140+253', 'Timisoara 447=118+329', 'Zerind 449=75+374']);
		expect(f(2)).toEqual([
			'Arad 646=280+366',
			'Fagaras 415=239+176',
			'Oradea 671=291+380',
			'Rimnicu Vilcea 413=220+193'
		]);
		expect(f(3)).toEqual(['Craiova 526=366+160', 'Pitesti 417=317+100', 'Sibiu 553=300+253']);
		expect(f(4)).toEqual(['Bucharest 450=450+0', 'Sibiu 591=338+253']);
		expect(f(5)).toEqual([
			'Bucharest 418=418+0',
			'Craiova 615=455+160',
			'Rimnicu Vilcea 607=414+193'
		]);
	});

	it('UCS graph search expands cities in order of road distance', () => {
		const r = run(romania, { strategy: 'ucs', mode: 'graph' });
		expect(r.order).toEqual([
			'Arad',
			'Zerind',
			'Timisoara',
			'Sibiu',
			'Oradea',
			'Rimnicu Vilcea',
			'Lugoj',
			'Fagaras',
			'Mehadia',
			'Pitesti',
			'Craiova',
			'Dobreta',
			'Bucharest'
		]);
		expect(r.solution?.cost).toBe(418);
		// Pitesti's road to Bucharest (418) replaces the frontier node reached through Fagaras (450).
		const replaced = r.nodes.find((n) => n.label === 'Bucharest' && n.replacedAt !== null);
		expect(replaced?.g).toBe(450);
		const winner = r.nodes[r.solution!.node];
		expect(winner.outcome).toBe('replaced');
		// Oradea through Sibiu (291) is dropped: Oradea is already on the frontier at 146.
		const dropped = r.nodes.find((n) => n.label === 'Oradea' && n.g === 291);
		expect(dropped?.outcome).toBe('frontier');
		expect(r.steps.at(-1)?.explored).toHaveLength(12);
	});

	it('DFS tree search loops; the path check or graph search fixes it', () => {
		const tree = run(romania, { strategy: 'dfs', maxExpansions: 50 });
		expect(tree.failure).toBe('limit');
		expect(tree.order.slice(0, 5)).toEqual(['Arad', 'Sibiu', 'Arad', 'Sibiu', 'Arad']);
		const path = run(romania, { strategy: 'dfs', mode: 'path' });
		expect(path.order).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
		expect(path.nodes.filter((n) => n.outcome === 'on-path').map((n) => n.label)).toEqual([
			'Arad',
			'Sibiu'
		]);
		const graph = run(romania, { strategy: 'dfs', mode: 'graph' });
		expect(graph.solution?.states.at(-1)).toBe('Bucharest');
	});

	it('greedy tree search from Iasi to Fagaras gets stuck in a loop (Informed Search, slide 12)', () => {
		const p = graphProblem(ROMANIA_IASI_FAGARAS);
		const tree = search(p, { strategy: 'greedy', maxExpansions: 20 });
		expect(tree.failure).toBe('limit');
		expect(tree.order.slice(0, 4)).toEqual(['Iasi', 'Neamt', 'Iasi', 'Neamt']);
		const graph = search(p, { strategy: 'greedy', mode: 'graph' });
		expect(graph.solution?.states.at(-1)).toBe('Fagaras');
	});

	it('weighted A* with α = 1 is A*', () => {
		const a = run(romania, { strategy: 'astar' });
		const w = run(romania, { strategy: 'wastar', weight: 1 });
		expect(w.order).toEqual(a.order);
		expect(w.nodes.map((n) => n.priority)).toEqual(a.nodes.map((n) => n.priority));
	});
});

describe('A* and heuristic consistency (Informed Search, slides 15, 27–29)', () => {
	const p = graphProblem(ASTAR_WRONG_PROBLEM);

	it('tree search with an admissible heuristic is optimal', () => {
		const r = search(p, { strategy: 'astar' });
		expect(r.order.join(',')).toBe('S,B,C,A,C,G');
		expect(r.solution?.cost).toBe(5);
	});

	it('graph search with an inconsistent heuristic is not', () => {
		const r = search(p, { strategy: 'astar', mode: 'graph' });
		expect(r.order.join(',')).toBe('S,B,C,A,G');
		expect(r.solution?.cost).toBe(6);
		expect(r.nodes.find((n) => n.label === 'C' && n.outcome === 'explored')?.g).toBe(2);
	});

	it('greedy follows h down the long path; A* takes the short one', () => {
		const q = graphProblem(GREEDY_TRAP_PROBLEM);
		expect(search(q, { strategy: 'greedy' }).solution?.cost).toBe(6);
		expect(search(q, { strategy: 'astar' }).solution?.cost).toBe(3);
	});
});

describe('limits and recording', () => {
	it('stops at maxExpansions and maxNodes', () => {
		const r = run(tiny, { strategy: 'bfs', maxExpansions: 3 });
		expect(r.failure).toBe('limit');
		expect(r.stats.popped).toBe(3);
		expect(r.steps.at(-1)).toMatchObject({ kind: 'fail', reason: 'limit' });
		const n = run(tiny, { strategy: 'bfs', maxNodes: 5 });
		expect(n.failure).toBe('limit');
		expect(n.stats.generated).toBeGreaterThanOrEqual(5);
	});

	it('summary mode keeps the solution and counts but no steps or dropped nodes', () => {
		const full = run(romania, { strategy: 'ucs', mode: 'graph' });
		const sum = run(romania, { strategy: 'ucs', mode: 'graph', record: 'summary' });
		expect(sum.steps).toEqual([]);
		expect(sum.solution?.states).toEqual(full.solution?.states);
		expect(sum.order).toEqual(full.order);
		expect(sum.stats).toEqual(full.stats);
		expect(sum.nodes.length).toBeLessThan(full.nodes.length);
		expect(sum.nodes.every((n) => n.outcome !== 'explored' && n.outcome !== 'frontier')).toBe(true);
	});

	it('frontierAfter matches the recorded snapshots as sets', () => {
		for (const strategy of ['bfs', 'dfs', 'ucs', 'astar', 'ids'] as const) {
			for (const mode of ['tree', 'graph'] as const) {
				const full = run(romania, { strategy, mode, maxExpansions: 40 });
				const bare = run(romania, { strategy, mode, maxExpansions: 40, record: 'nodes' });
				expect(bare.steps.every((s) => s.frontier === undefined)).toBe(true);
				full.steps.forEach((step, i) => {
					const sorted = [...step.frontier!].sort((a, b) => a - b);
					expect(frontierAfter(bare, i), `${strategy}/${mode} step ${i}`).toEqual(sorted);
				});
			}
		}
	});

	it('counts popped, expanded, and generated nodes', () => {
		const r = run(tiny, { strategy: 'ucs' });
		expect(r.stats.popped).toBe(10);
		expect(r.stats.expanded).toBe(9);
		expect(r.stats.generated).toBe(r.nodes.length);
		expect(r.stats.maxFrontier).toBeGreaterThan(0);
	});

	it('an initial goal state is found at once', () => {
		const r = search(graphProblem({ ...TINY_PROBLEM, goals: ['S'] }), { strategy: 'bfs' });
		expect(r.solution).toMatchObject({ states: ['S'], cost: 0, depth: 0 });
		const g = search(graphProblem({ ...TINY_PROBLEM, goals: ['S'] }), {
			strategy: 'bfs',
			goalTest: 'generate'
		});
		expect(g.steps.map((s) => s.kind)).toEqual(['init', 'goal']);
	});
});
