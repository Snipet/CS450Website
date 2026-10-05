import { describe, expect, it } from 'vitest';
import { ROMANIA_PROBLEM, graphProblem } from '$lib/theory/graphs';
import { rbfs, type RbfsStep } from '$lib/theory/search/rbfs';
import { RBFS_CODE, linesOf, tokenizeCode } from './pseudocode';

describe('RBFS pseudocode', () => {
	it('lists Figure 3.26 line by line with unique ids', () => {
		const ids = RBFS_CODE.map((l) => l.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(RBFS_CODE.find((l) => l.id === 'f-set')?.text).toBe('s.f ← max(s.g + s.h, node.f)');
		expect(RBFS_CODE.find((l) => l.id === 'recurse')?.text).toBe(
			'result, best.f ← RBFS(problem, best, min(f_limit, alternative))'
		);
		expect(RBFS_CODE.filter((l) => l.head).map((l) => l.id)).toEqual(['search-head', 'head']);
	});

	it('maps each step to the lines it runs', () => {
		const r = rbfs(graphProblem(ROMANIA_PROBLEM));
		const main = r.steps.map((s) => linesOf(s).main);
		expect(main.slice(0, 6)).toEqual(['f-set', 'recurse', 'f-set', 'recurse', 'f-set', 'test']);
		expect(main.at(-1)).toBe('goal');
		expect(linesOf(undefined)).toEqual({ lines: ['search-call'], main: 'search-call' });
		const counts = { expanded: 0, reexpanded: 0, generated: 1, regenerated: 0, stored: 1 };
		const dead: RbfsStep = { kind: 'dead-end', node: 0, fLimit: 3, previous: 2, counts };
		expect(linesOf(dead).main).toBe('empty');
		const fail: RbfsStep = { kind: 'fail', reason: 'exhausted', node: 0, fLimit: Infinity, counts };
		expect(linesOf(fail).main).toBe('search-call');
		expect(linesOf({ ...fail, reason: 'limit' })).toEqual({ lines: [], main: null });
		for (const s of r.steps) {
			const { lines, main } = linesOf(s);
			if (main) expect(lines).toContain(main);
			for (const l of lines) expect(RBFS_CODE.some((c) => c.id === l)).toBe(true);
		}
	});

	it('tokenizes keywords and names', () => {
		expect(tokenizeCode('if problem.GOAL-TEST(node.STATE) then return SOLUTION(node)')).toEqual([
			{ text: 'if', kind: 'keyword' },
			{ text: ' problem.', kind: 'text' },
			{ text: 'GOAL-TEST', kind: 'name' },
			{ text: '(node.', kind: 'text' },
			{ text: 'STATE', kind: 'name' },
			{ text: ') ', kind: 'text' },
			{ text: 'then', kind: 'keyword' },
			{ text: ' ', kind: 'text' },
			{ text: 'return', kind: 'keyword' },
			{ text: ' ', kind: 'text' },
			{ text: 'SOLUTION', kind: 'name' },
			{ text: '(node)', kind: 'text' }
		]);
		expect(tokenizeCode('s.f ← max(s.g + s.h, node.f)').every((t) => t.kind === 'text')).toBe(true);
	});
});
