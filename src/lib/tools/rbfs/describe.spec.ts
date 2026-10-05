import { describe, expect, it } from 'vitest';
import {
	GREEDY_TRAP_PROBLEM,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	graphProblem
} from '$lib/theory/graphs';
import { rbfs } from '$lib/theory/search/rbfs';
import { callText, describeResult, describeStep } from './describe';

const romania = rbfs(graphProblem(ROMANIA_PROBLEM));

describe('describeStep (golden: Figure 3.27)', () => {
	it('describes every step of the Romania run', () => {
		expect(romania.steps.map((_, i) => describeStep(romania, i))).toEqual([
			'RBFS(Arad, f_limit = ∞): Arad is not a goal; expand it: Sibiu (f = 393), Timisoara (f = 447), Zerind (f = 449).',
			'RBFS(Arad, f_limit = ∞): best Sibiu (f = 393) is within the limit; alternative Timisoara (f = 447). Call RBFS(Sibiu, f_limit = min(∞, 447) = 447).',
			'RBFS(Sibiu, f_limit = 447): Sibiu is not a goal; expand it: Arad (f = 646), Fagaras (f = 415), Oradea (f = 671), Rimnicu Vilcea (f = 413).',
			'RBFS(Sibiu, f_limit = 447): best Rimnicu Vilcea (f = 413) is within the limit; alternative Fagaras (f = 415). Call RBFS(Rimnicu Vilcea, f_limit = min(447, 415) = 415).',
			'RBFS(Rimnicu Vilcea, f_limit = 415): Rimnicu Vilcea is not a goal; expand it: Craiova (f = 526), Pitesti (f = 417), Sibiu (f = 553).',
			'RBFS(Rimnicu Vilcea, f_limit = 415): best Pitesti (f = 417) exceeds the limit; return failure and back up f = 417 to Rimnicu Vilcea.',
			'RBFS(Sibiu, f_limit = 447): best Fagaras (f = 415) is within the limit; alternative Rimnicu Vilcea (f = 417). Call RBFS(Fagaras, f_limit = min(447, 417) = 417).',
			'RBFS(Fagaras, f_limit = 417): Fagaras is not a goal; expand it: Bucharest (f = 450), Sibiu (f = 591).',
			'RBFS(Fagaras, f_limit = 417): best Bucharest (f = 450) exceeds the limit; return failure and back up f = 450 to Fagaras.',
			'RBFS(Sibiu, f_limit = 447): best Rimnicu Vilcea (f = 417) is within the limit; alternative Fagaras (f = 450). Call RBFS(Rimnicu Vilcea, f_limit = min(447, 450) = 447).',
			'RBFS(Rimnicu Vilcea, f_limit = 447): Rimnicu Vilcea is not a goal; expand it again (its successors were forgotten): Craiova (f = 526), Pitesti (f = 417), Sibiu (f = 553).',
			'RBFS(Rimnicu Vilcea, f_limit = 447): best Pitesti (f = 417) is within the limit; alternative Craiova (f = 526). Call RBFS(Pitesti, f_limit = min(447, 526) = 447).',
			'RBFS(Pitesti, f_limit = 447): Pitesti is not a goal; expand it: Bucharest (f = 418), Craiova (f = 615), Rimnicu Vilcea (f = 607).',
			'RBFS(Pitesti, f_limit = 447): best Bucharest (f = 418) is within the limit; alternative Rimnicu Vilcea (f = 607). Call RBFS(Bucharest, f_limit = min(447, 607) = 447).',
			'RBFS(Bucharest, f_limit = 447): Bucharest is a goal; return the solution Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418).'
		]);
		expect(describeStep(romania, 15)).toBe('');
		expect(describeStep(romania, -1)).toBe('');
	});

	it('names a call', () => {
		expect(callText('Sibiu', 447)).toBe('RBFS(Sibiu, f_limit = 447)');
		expect(callText('Arad', Infinity)).toBe('RBFS(Arad, f_limit = ∞)');
	});
});

describe('describeStep (other cases)', () => {
	it('shows a successor whose f is raised to its parent’s f, and a single successor', () => {
		const trap = rbfs(graphProblem(GREEDY_TRAP_PROBLEM));
		const text = trap.steps.map((_, i) => describeStep(trap, i));
		expect(text).toContain(
			'RBFS(B1, f_limit = 3): best B2 (f = 3) is within the limit; no alternative (∞). Call RBFS(B2, f_limit = min(3, ∞) = 3).'
		);
		expect(text).toContain(
			'RBFS(B1, f_limit = 3): best B2 (f = 4) exceeds the limit; return failure and back up f = 4 to B1.'
		);
		const tiny = rbfs(graphProblem(TINY_PROBLEM));
		const all = tiny.steps.map((_, i) => describeStep(tiny, i)).join('\n');
		expect(all).toMatch(/\(f = max\(\d+, \d+\) = \d+\)/);
		expect(all).toContain(
			'a is not a goal and has no successors; return failure and back up f = ∞ to a.'
		);
	});

	it('describes failure at the root and the expansion limit', () => {
		const dead = rbfs(
			graphProblem({
				graph: {
					directed: true,
					nodes: [{ id: 'S' }, { id: 'A' }, { id: 'G' }],
					edges: [{ from: 'S', to: 'A', cost: 1 }]
				},
				start: 'S',
				goals: ['G']
			})
		);
		expect(dead.steps.map((_, i) => describeStep(dead, i)).slice(2)).toEqual([
			'RBFS(A, f_limit = ∞): A is not a goal and has no successors; return failure and back up f = ∞ to A.',
			'RBFS(S, f_limit = ∞): every successor has f = ∞ (no goal below it); return failure, ∞.',
			'RBFS(S, f_limit = ∞) returned failure: no solution.'
		]);
		expect(describeResult(dead)).toBe(
			'No solution: the root’s call returned failure. 2 expansions, 2 nodes generated, deepest call at depth 1, at most 2 nodes stored.'
		);

		const lone = rbfs(
			graphProblem({
				graph: { directed: true, nodes: [{ id: 'S' }, { id: 'G' }], edges: [] },
				start: 'S',
				goals: ['G']
			})
		);
		expect(describeStep(lone, 0)).toBe(
			'RBFS(S, f_limit = ∞): S is not a goal and has no successors; return failure, ∞.'
		);

		const capped = rbfs(graphProblem(ROMANIA_PROBLEM), { maxExpansions: 3 });
		expect(describeStep(capped, capped.steps.length - 1)).toBe(
			'Stop after 3 expansions (the limit for this run); no solution found yet.'
		);
		expect(describeResult(capped)).toMatch(/^No solution within 3 expansions\. /);
	});
});

describe('describeResult', () => {
	it('summarizes the run', () => {
		expect(describeResult(romania)).toBe(
			'Solution: Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418). 6 expansions (1 repeated), 19 nodes generated (3 regenerated), deepest call at depth 4, at most 14 nodes stored.'
		);
	});
});
