import { describe, expect, it } from 'vitest';
import {
	GREEDY_TRAP_PROBLEM,
	ROMANIA_IASI_FAGARAS,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	graphProblem,
	shortestPath,
	trueCosts,
	type GraphProblemSpec
} from '../graphs';
import {
	DEFAULT_RBFS_MAX_EXPANSIONS,
	applyRbfsStep,
	bestAndAlternative,
	initialStack,
	normalizeRbfsOptions,
	rbfs,
	rbfsPath,
	stackAt,
	storedF,
	type RbfsFrame,
	type RbfsResult,
	type RbfsStep
} from './rbfs';
import { search } from './search';
import type { SearchProblem } from './types';

const romania = graphProblem(ROMANIA_PROBLEM);

/** A compact line per step: kind, call node, f_limit, and what the step decided. */
function traceLine(r: RbfsResult, s: RbfsStep): string {
	const name = (id: number) => r.nodes[id].label;
	const num = (n: number) => (n === Infinity ? '∞' : String(n));
	const head = `${s.kind} ${name(s.node)} [${num(s.fLimit)}]`;
	switch (s.kind) {
		case 'expand':
			return `${head}: ${s.children.map((c) => `${name(c)} ${num(r.nodes[c].f)}`).join(', ')}`;
		case 'call':
			return `${head}: best ${name(s.best)} ${num(s.bestF)}, alternative ${
				s.alternative === null ? '–' : name(s.alternative)
			} ${num(s.alternativeF)} → RBFS(${name(s.best)}, ${num(s.limit)})`;
		case 'return':
			return `${head}: best ${name(s.best)} ${num(s.bestF)} > limit, ${name(s.node)} ${num(
				s.previous ?? NaN
			)} → ${num(s.bestF)}`;
		case 'fail':
			return `fail ${s.reason}`;
		default:
			return head;
	}
}

/** Each open call as "Node [f_limit]: successor f, …" (current f values). */
function frameLines(r: RbfsResult, frames: readonly RbfsFrame[]): string[] {
	const num = (n: number) => (n === Infinity ? '∞' : String(n));
	return frames.map(
		(fr) =>
			`${r.nodes[fr.node].label} [${num(fr.fLimit)}]: ${fr.successors
				.map((e) => `${r.nodes[e.id].label} ${num(e.f)}`)
				.join(', ')}`
	);
}

describe('RBFS on Romania (golden: AIMA 3rd ed., Figure 3.27)', () => {
	const r = rbfs(romania);

	it('reproduces the trace step by step', () => {
		expect(r.steps.map((s) => traceLine(r, s))).toEqual([
			'expand Arad [∞]: Sibiu 393, Timisoara 447, Zerind 449',
			'call Arad [∞]: best Sibiu 393, alternative Timisoara 447 → RBFS(Sibiu, 447)',
			'expand Sibiu [447]: Arad 646, Fagaras 415, Oradea 671, Rimnicu Vilcea 413',
			'call Sibiu [447]: best Rimnicu Vilcea 413, alternative Fagaras 415 → RBFS(Rimnicu Vilcea, 415)',
			'expand Rimnicu Vilcea [415]: Craiova 526, Pitesti 417, Sibiu 553',
			// (a) → (b): Pitesti (417) exceeds 415; Rimnicu Vilcea's f becomes 417.
			'return Rimnicu Vilcea [415]: best Pitesti 417 > limit, Rimnicu Vilcea 413 → 417',
			'call Sibiu [447]: best Fagaras 415, alternative Rimnicu Vilcea 417 → RBFS(Fagaras, 417)',
			'expand Fagaras [417]: Bucharest 450, Sibiu 591',
			// (b) → (c): Bucharest (450) exceeds 417; Fagaras's f becomes 450.
			'return Fagaras [417]: best Bucharest 450 > limit, Fagaras 415 → 450',
			'call Sibiu [447]: best Rimnicu Vilcea 417, alternative Fagaras 450 → RBFS(Rimnicu Vilcea, 447)',
			'expand Rimnicu Vilcea [447]: Craiova 526, Pitesti 417, Sibiu 553',
			'call Rimnicu Vilcea [447]: best Pitesti 417, alternative Craiova 526 → RBFS(Pitesti, 447)',
			'expand Pitesti [447]: Bucharest 418, Craiova 615, Rimnicu Vilcea 607',
			'call Pitesti [447]: best Bucharest 418, alternative Rimnicu Vilcea 607 → RBFS(Bucharest, 447)',
			'goal Bucharest [447]'
		]);
	});

	it('keeps only the current path and its siblings: the three stages of the figure', () => {
		// (a) Rimnicu Vilcea expanded with f_limit 415.
		expect(frameLines(r, stackAt(r, 4))).toEqual([
			'Arad [∞]: Sibiu 393, Timisoara 447, Zerind 449',
			'Sibiu [447]: Arad 646, Fagaras 415, Oradea 671, Rimnicu Vilcea 413',
			'Rimnicu Vilcea [415]: Craiova 526, Pitesti 417, Sibiu 553'
		]);
		// (b) Rimnicu Vilcea's subtree is forgotten and 417 backed up; Fagaras expanded with f_limit 417.
		expect(frameLines(r, stackAt(r, 5))).toEqual([
			'Arad [∞]: Sibiu 393, Timisoara 447, Zerind 449',
			'Sibiu [447]: Arad 646, Fagaras 415, Oradea 671, Rimnicu Vilcea 417'
		]);
		expect(frameLines(r, stackAt(r, 7))).toEqual([
			'Arad [∞]: Sibiu 393, Timisoara 447, Zerind 449',
			'Sibiu [447]: Arad 646, Fagaras 415, Oradea 671, Rimnicu Vilcea 417',
			'Fagaras [417]: Bucharest 450, Sibiu 591'
		]);
		// (c) Fagaras now 450; Rimnicu Vilcea re-expanded with f_limit min(447, 450) = 447, then Pitesti.
		expect(frameLines(r, stackAt(r, 12))).toEqual([
			'Arad [∞]: Sibiu 393, Timisoara 447, Zerind 449',
			'Sibiu [447]: Arad 646, Fagaras 450, Oradea 671, Rimnicu Vilcea 417',
			'Rimnicu Vilcea [447]: Craiova 526, Pitesti 417, Sibiu 553',
			'Pitesti [447]: Bucharest 418, Craiova 615, Rimnicu Vilcea 607'
		]);
		// The open calls stay on the stack while the solution is returned.
		expect(stackAt(r, 14).map((fr) => r.nodes[fr.node].label)).toEqual([
			'Arad',
			'Sibiu',
			'Rimnicu Vilcea',
			'Pitesti',
			'Bucharest'
		]);
		// Before the first step: the root's call, not yet expanded.
		expect(frameLines(r, stackAt(r, -1))).toEqual(['Arad [∞]: ']);
	});

	it('gives the current f of every stored node, backed-up values included', () => {
		const f = storedF(r, stackAt(r, 5));
		const byLabel = new Map([...f].map(([id, v]) => [r.nodes[id].label + r.nodes[id].depth, v]));
		expect(byLabel.get('Arad0')).toBe(366);
		expect(byLabel.get('Rimnicu Vilcea2')).toBe(417);
		expect(byLabel.get('Fagaras2')).toBe(415);
		expect(f.size).toBe(8);
		expect(storedF(r, [])).toEqual(new Map());
	});

	it('returns the optimal path Arad, Sibiu, Rimnicu Vilcea, Pitesti, Bucharest (cost 418)', () => {
		expect(r.failure).toBeNull();
		expect(r.solution?.states).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']);
		expect(r.solution?.actions).toEqual(['Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']);
		expect(r.solution?.cost).toBe(418);
		expect(r.solution?.depth).toBe(4);
		expect(rbfsPath(r.nodes, r.solution!.node)).toEqual(r.solution!.path);
		expect(r.order).toEqual([
			'Arad',
			'Sibiu',
			'Rimnicu Vilcea',
			'Fagaras',
			'Rimnicu Vilcea',
			'Pitesti',
			'Bucharest'
		]);
	});

	it('counts expansions, regenerations, depth, and memory', () => {
		expect(r.stats).toEqual({
			expanded: 6,
			reexpanded: 1, // Rimnicu Vilcea
			generated: 19,
			regenerated: 3, // Craiova, Pitesti, and Sibiu under Rimnicu Vilcea
			maxDepth: 4,
			maxStored: 14 // Arad + 3 + 4 + 3 + 3 successors while Pitesti is expanded
		});
		const again = r.nodes.filter((n) => n.regenerated).map((n) => n.label);
		expect(again).toEqual(['Craiova', 'Pitesti', 'Sibiu']);
		// A regenerated node shares its tree position with the forgotten one.
		const pitesti = r.nodes.filter((n) => n.label === 'Pitesti' && n.depth === 3);
		expect(pitesti).toHaveLength(2);
		expect(pitesti[0].position).toBe(pitesti[1].position);
		expect(pitesti[0].id).not.toBe(pitesti[1].id);
		// Counts after the return steps leave out the forgotten successors.
		expect(r.steps[4].counts.stored).toBe(11);
		expect(r.steps[5].counts.stored).toBe(8);
	});

	it('expands and generates more nodes than A* on the same problem, for the same cost', () => {
		const astar = search(romania, { strategy: 'astar', record: 'summary' });
		expect(astar.solution?.cost).toBe(418);
		expect(r.stats.expanded).toBeGreaterThan(astar.stats.expanded); // 6 > 5
		expect(r.stats.generated).toBeGreaterThan(astar.stats.generated); // 19 > 16
		expect(r.stats.maxStored).toBeGreaterThan(0);
	});
});

describe('RBFS on other lecture problems', () => {
	it('finds the short path of the greedy trap (Informed Search, slide 15)', () => {
		const r = rbfs(graphProblem(GREEDY_TRAP_PROBLEM));
		expect(r.solution?.states).toEqual(['S', 'T1', 'T2', 'G']);
		expect(r.solution?.cost).toBe(3);
		// The long path's backed-up value (4) climbs from B2 to B1.
		expect(r.steps.filter((s) => s.kind === 'return').map((s) => traceLine(r, s))).toEqual([
			'return B2 [3]: best B3 4 > limit, B2 3 → 4',
			'return B1 [3]: best B2 4 > limit, B1 2 → 4'
		]);
	});

	it('finds the optimal Iasi → Fagaras path where greedy tree search loops (slide 12)', () => {
		const p = graphProblem(ROMANIA_IASI_FAGARAS);
		const r = rbfs(p);
		const astar = search(p, { strategy: 'astar', record: 'summary' });
		expect(r.solution?.states).toEqual(['Iasi', 'Vaslui', 'Urziceni', 'Bucharest', 'Fagaras']);
		expect(r.solution?.cost).toBe(530);
		expect(r.solution?.cost).toBe(astar.solution?.cost);
		expect(r.stats.regenerated).toBeGreaterThan(astar.stats.expanded);
		expect(r.stats.expanded).toBeGreaterThan(astar.stats.expanded);
	});

	it('handles dead ends on the tiny search problem with h = 0 (cost 10)', () => {
		const r = rbfs(graphProblem(TINY_PROBLEM));
		expect(r.solution?.states).toEqual(['S', 'd', 'e', 'r', 'f', 'G']);
		expect(r.solution?.cost).toBe(10);
		const dead = r.steps.filter((s) => s.kind === 'dead-end');
		expect(dead.length).toBeGreaterThan(0);
		expect(new Set(dead.map((s) => r.nodes[s.node].label))).toEqual(new Set(['a']));
		// ∞ is backed up to a dead end.
		const i = r.steps.findIndex((s) => s.kind === 'dead-end');
		const node = r.steps[i].node;
		const parent = stackAt(r, i).at(-1)!;
		expect(parent.successors.find((e) => e.id === node)?.f).toBe(Infinity);
	});
});

describe('RBFS edge cases', () => {
	const spec = (text: Partial<GraphProblemSpec> & Pick<GraphProblemSpec, 'graph'>) =>
		({ start: 'S', goals: ['G'], ...text }) as GraphProblemSpec;

	it('returns the root when it is a goal, without expanding it', () => {
		const r = rbfs(graphProblem({ ...ROMANIA_PROBLEM, start: 'Bucharest' }));
		expect(r.steps.map((s) => s.kind)).toEqual(['goal']);
		expect(r.solution?.states).toEqual(['Bucharest']);
		expect(r.solution?.cost).toBe(0);
		expect(r.stats.expanded).toBe(0);
		expect(r.stats.generated).toBe(1);
		expect(r.order).toEqual(['Bucharest']);
	});

	it('fails when the root has no successors', () => {
		const r = rbfs(
			graphProblem(
				spec({ graph: { directed: true, nodes: [{ id: 'S' }, { id: 'G' }], edges: [] } })
			)
		);
		expect(r.steps.map((s) => s.kind)).toEqual(['dead-end', 'fail']);
		expect(r.failure).toBe('exhausted');
		expect(r.solution).toBeNull();
		expect(stackAt(r, 1)).toEqual([]);
		const dead = r.steps[0];
		expect(dead.kind === 'dead-end' && dead.previous).toBeNull();
	});

	it('fails when no goal is reachable and every path ends (directed, acyclic)', () => {
		const r = rbfs(
			graphProblem(
				spec({
					graph: {
						directed: true,
						nodes: ['S', 'A', 'B', 'C', 'G'].map((id) => ({ id })),
						edges: [
							{ from: 'S', to: 'A', cost: 1 },
							{ from: 'S', to: 'B', cost: 2 },
							{ from: 'A', to: 'C', cost: 1 },
							{ from: 'G', to: 'S', cost: 1 }
						]
					},
					h: { S: 1, A: 1 }
				})
			)
		);
		expect(r.failure).toBe('exhausted');
		expect(r.solution).toBeNull();
		expect(r.steps.map((s) => s.kind)).toEqual([
			'expand', // S: A 2, B 2
			'call', // A (first of the tie), alternative B 2
			'expand', // A: C 2
			'call',
			'dead-end', // C: ∞ backed up to C
			'return', // A: best C ∞, ∞ backed up to A
			'call', // B
			'dead-end',
			'return', // the root's best is ∞: failure even with f_limit = ∞
			'fail'
		]);
		const last = r.steps.at(-2)!;
		expect(last.kind === 'return' && last.bestF).toBe(Infinity);
		expect(last.kind === 'return' && last.previous).toBeNull();
		expect(stackAt(r, r.steps.length - 1)).toEqual([]);
		expect(r.order).toEqual(['S', 'A', 'C', 'B']);
	});

	it('stops at the expansion limit when tree search can go around a cycle forever', () => {
		const r = rbfs(
			graphProblem(
				spec({
					graph: {
						directed: false,
						nodes: ['S', 'A', 'G'].map((id) => ({ id })),
						edges: [{ from: 'S', to: 'A', cost: 1 }]
					}
				})
			),
			{ maxExpansions: 25 }
		);
		expect(r.failure).toBe('limit');
		expect(r.solution).toBeNull();
		expect(r.stats.expanded).toBe(25);
		const last = r.steps.at(-1)!;
		expect(last.kind).toBe('fail');
		expect(last.kind === 'fail' && last.reason).toBe('limit');
		expect(last.counts.expanded).toBe(25);
		// The open calls are kept when the limit stops the search.
		expect(stackAt(r, r.steps.length - 1).length).toBeGreaterThan(0);
	});

	it('records the same search without a trace', () => {
		const full = rbfs(romania);
		const bare = rbfs(romania, { record: false });
		expect(bare.steps).toEqual([]);
		expect(bare.stats).toEqual(full.stats);
		expect(bare.solution).toEqual(full.solution);
		expect(bare.order).toEqual(full.order);
		expect(bare.nodes.length).toBe(full.nodes.length);
	});

	it('uses h = 0 when the problem has no heuristic', () => {
		const r = rbfs(graphProblem(TINY_PROBLEM));
		expect(r.nodes.every((n) => n.h === 0)).toBe(true);
		expect(r.nodes[0].f).toBe(0);
	});
});

describe('bestAndAlternative', () => {
	const e = (...fs: number[]) => fs.map((f, id) => ({ id, f }));
	it('picks the lowest f, ties to the first in successor order', () => {
		expect(bestAndAlternative(e(5, 3, 3, 4))).toEqual({ best: 1, alternative: 2 });
		expect(bestAndAlternative(e(3, 5, 3))).toEqual({ best: 0, alternative: 2 });
		expect(bestAndAlternative(e(4, 2, 9))).toEqual({ best: 1, alternative: 0 });
		expect(bestAndAlternative(e(7))).toEqual({ best: 0, alternative: null });
		expect(bestAndAlternative(e(Infinity, Infinity))).toEqual({ best: 0, alternative: 1 });
	});
});

describe('normalizeRbfsOptions', () => {
	it('fills in defaults and makes the limit a whole number of at least 1', () => {
		expect(normalizeRbfsOptions()).toEqual({
			maxExpansions: DEFAULT_RBFS_MAX_EXPANSIONS,
			record: true
		});
		expect(normalizeRbfsOptions({ maxExpansions: NaN }).maxExpansions).toBe(
			DEFAULT_RBFS_MAX_EXPANSIONS
		);
		expect(normalizeRbfsOptions({ maxExpansions: 0 }).maxExpansions).toBe(1);
		expect(normalizeRbfsOptions({ maxExpansions: 7.9, record: false })).toEqual({
			maxExpansions: 7,
			record: false
		});
	});
});

// ---------------------------------------------------------------------------
// Properties on seeded random graphs
// ---------------------------------------------------------------------------

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

/** A random graph problem: 2–7 states, positive step costs, directed or not, a goal that may be unreachable. */
function randomSpec(seed: number): GraphProblemSpec {
	const r = rng(seed);
	const int = (n: number) => Math.floor(r() * n);
	const n = 2 + int(6);
	const ids = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
	const costs = [1, 1, 2, 3, 5];
	const edges = Array.from({ length: n + int(n + 2) }, () => ({
		from: ids[int(n)],
		to: ids[int(n)],
		cost: costs[int(costs.length)]
	}));
	return {
		graph: { directed: r() < 0.5, nodes: ids.map((id) => ({ id })), edges },
		start: ids[0],
		goals: [ids[n - 1]]
	};
}

/** h*(n) scaled by `factor` ≤ 1 (admissible); states that cannot reach the goal get 0. */
function scaled(spec: GraphProblemSpec, factor: number): Record<string, number> {
	return Object.fromEntries(
		[...trueCosts(spec)].map(([id, v]) => [id, Number.isFinite(v) ? Math.floor(v * factor) : 0])
	);
}

/** f of the top call's node: its entry in the parent's list, or the root's own f. */
function topF(r: RbfsResult, frames: readonly RbfsFrame[]): number {
	const k = frames.length - 1;
	if (k === 0) return r.nodes[frames[0].node].f;
	const parent = frames[k - 1];
	return parent.successors[parent.calling!].f;
}

/** Checks the trace against the replayed stack (one pass, linear); returns the violations. */
function traceErrors(p: SearchProblem<string>, r: RbfsResult): string[] {
	const errors: string[] = [];
	const check = (ok: boolean, msg: string) => {
		if (!ok) errors.push(msg);
	};
	const frames = initialStack(r);
	let stored = 1;
	r.steps.forEach((s, i) => {
		const top = frames.at(-1);
		const nodeF = top ? topF(r, frames) : NaN;
		const bestBefore =
			s.kind === 'call' ? top?.successors.find((e) => e.id === s.best)?.f : undefined;
		applyRbfsStep(r, frames, s);
		if (s.kind === 'expand') stored += s.children.length;
		if ((s.kind === 'return' || s.kind === 'dead-end') && top) stored -= top.successors.length;
		if (frames.length === 0) stored = 0;
		check(stored === s.counts.stored, `stored @${i}`);
		check(s.node === (top?.node ?? s.node), `node @${i}`);
		if (s.kind === 'call') {
			check(s.bestF <= s.fLimit && s.bestF <= s.alternativeF, `call @${i}`);
			check(s.limit === Math.min(s.fLimit, s.alternativeF), `limit @${i}`);
			check(bestBefore === s.bestF, `best f @${i}`);
		}
		if (s.kind === 'return') {
			check(s.bestF > s.fLimit || s.bestF === Infinity, `return @${i}`);
			// Backed-up values only grow: a call's node never has f above its f_limit.
			if (s.previous !== null) check(s.bestF > s.previous && s.previous === nodeF, `backup @${i}`);
		}
		if (s.kind === 'expand') {
			for (const c of s.children) {
				const n = r.nodes[c];
				check(n.f === Math.max(n.g + n.h, nodeF), `child f @${i}`);
				check(n.parent === s.node, `parent @${i}`);
			}
			check(
				s.children.map((c) => r.nodes[c].key).join() ===
					p
						.successors(r.nodes[s.node].key)
						.map((x) => x.state)
						.join(),
				`successor order @${i}`
			);
		}
	});
	return errors;
}

describe('RBFS properties on random graphs', () => {
	it('returns the same cost as A* tree search (and the cheapest path) when h is admissible', () => {
		let solved = 0;
		let unsolvable = 0;
		for (let seed = 1; seed <= 300; seed++) {
			const base = randomSpec(seed);
			const best = shortestPath(base);
			for (const factor of [0, 0.5, 1]) {
				const spec = { ...base, h: scaled(base, factor) };
				const p = graphProblem(spec);
				const r = rbfs(p, { maxExpansions: 3000 });
				const errs = traceErrors(p, r);
				expect(errs.slice(0, 5), `seed ${seed} × ${factor} (${errs.length})`).toEqual([]);
				if (!best) {
					// Tree search cannot reach the goal: it fails, or runs until the limit around a cycle.
					expect(r.solution, `seed ${seed}`).toBeNull();
					unsolvable++;
					continue;
				}
				if (r.failure === 'limit') continue;
				const astar = search(p, { strategy: 'astar', record: 'summary', maxExpansions: 200_000 });
				expect(r.solution?.cost, `seed ${seed} × ${factor}`).toBeCloseTo(best.cost, 9);
				expect(r.solution?.cost, `seed ${seed} × ${factor}`).toBeCloseTo(astar.solution!.cost, 9);
				expect(r.stats.expanded).toBeGreaterThanOrEqual(r.stats.reexpanded);
				expect(r.stats.generated).toBeGreaterThanOrEqual(r.stats.regenerated);
				solved++;
			}
		}
		expect(solved).toBeGreaterThan(400);
		expect(unsolvable).toBeGreaterThan(0);
	});

	it('records counts that agree with the replayed stack', () => {
		for (let seed = 1000; seed < 1040; seed++) {
			const base = randomSpec(seed);
			const p = graphProblem({ ...base, h: scaled(base, 0.7) });
			const r = rbfs(p, { maxExpansions: 300 });
			expect(traceErrors(p, r), `seed ${seed}`).toEqual([]);
			const last = r.steps.at(-1)!;
			expect(last.counts.expanded).toBe(r.stats.expanded);
			expect(last.counts.generated).toBe(r.stats.generated);
			expect(Math.max(...r.steps.map((s) => s.counts.stored))).toBeLessThanOrEqual(
				r.stats.maxStored
			);
		}
	});
});
