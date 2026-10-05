import { describe, expect, it } from 'vitest';
import { ROMANIA_PROBLEM, TINY_PROBLEM, graphProblem } from '$lib/theory/graphs';
import { rbfs } from '$lib/theory/search/rbfs';
import { graphHighlightAt, problemFacts, progressAt, runRbfs, treeAt, type TreeView } from './view';

const romania = rbfs(graphProblem(ROMANIA_PROBLEM));

/** "Name f [status role limit]" per node, root first. */
function lines(view: TreeView): string[] {
	return view.nodes.map((n) => {
		const tags = [
			n.status,
			n.role ?? '',
			n.limit !== null ? `limit ${n.limit}` : '',
			n.backedUp ? 'backed' : '',
			n.previousF !== null ? `was ${n.previousF}` : '',
			n.isNew ? 'new' : ''
		].filter(Boolean);
		return `${n.label} ${n.f} [${tags.join(' ')}]`;
	});
}

describe('treeAt', () => {
	it('shows the root expanded at the first step', () => {
		const v = treeAt(romania, 0);
		expect(lines(v)).toEqual([
			'Arad 366 [current limit Infinity]',
			'Sibiu 393 [stored new]',
			'Timisoara 447 [stored new]',
			'Zerind 449 [stored new]'
		]);
		expect(v.path).toEqual([0]);
		expect(v.current).toBe(0);
	});

	it('marks the best successor and the alternative at a call', () => {
		const v = treeAt(romania, 3);
		const by = new Map(v.nodes.map((n) => [n.label + n.parent, n]));
		expect(v.nodes.find((n) => n.id === v.current)?.label).toBe('Sibiu');
		const rv = v.nodes.find((n) => n.label === 'Rimnicu Vilcea')!;
		expect(rv.role).toBe('best');
		expect(rv.limit).toBe(415);
		expect(rv.status).toBe('open');
		expect(v.nodes.find((n) => n.label === 'Fagaras')?.role).toBe('alternative');
		expect(v.path.map((id) => romania.nodes[id].label)).toEqual([
			'Arad',
			'Sibiu',
			'Rimnicu Vilcea'
		]);
		expect(by.size).toBe(v.nodes.length);
	});

	it('shows what a return forgets and the backed-up value (stage a → b)', () => {
		const v = treeAt(romania, 5);
		expect(lines(v)).toEqual([
			'Arad 366 [open limit Infinity]',
			'Sibiu 393 [open limit 447]',
			'Timisoara 447 [stored]',
			'Zerind 449 [stored]',
			'Arad 646 [stored]',
			'Fagaras 415 [stored]',
			'Oradea 671 [stored]',
			'Rimnicu Vilcea 417 [current limit 415 backed was 413]',
			'Craiova 526 [forgotten]',
			'Pitesti 417 [forgotten exceeds]',
			'Sibiu 553 [forgotten]'
		]);
		expect(v.path.map((id) => romania.nodes[id].label)).toEqual(['Arad', 'Sibiu']);
		// The next step no longer draws them.
		expect(treeAt(romania, 6).nodes.some((n) => n.status === 'forgotten')).toBe(false);
	});

	it('keeps backed-up values on stored successors (stage c)', () => {
		const v = treeAt(romania, 12);
		const fag = v.nodes.find((n) => n.label === 'Fagaras')!;
		expect(fag.f).toBe(450);
		expect(fag.backedUp).toBe(true);
		expect(fag.status).toBe('stored');
		const rv = v.nodes.find(
			(n) => n.label === 'Rimnicu Vilcea' && n.parent !== null && n.limit !== null
		)!;
		expect(rv.f).toBe(417);
		expect(rv.limit).toBe(447);
	});

	it('marks the goal and the solution path', () => {
		const v = treeAt(romania, 14);
		const goal = v.nodes.find((n) => n.status === 'goal')!;
		expect(goal.label).toBe('Bucharest');
		expect(goal.f).toBe(418);
		expect(v.nodes.filter((n) => n.onSolution).map((n) => n.label)).toEqual([
			'Arad',
			'Sibiu',
			'Rimnicu Vilcea',
			'Pitesti',
			'Bucharest'
		]);
	});

	it('marks inherited f values (max(g + h, f of the parent))', () => {
		const r = rbfs(graphProblem(TINY_PROBLEM));
		const i = r.steps.findIndex(
			(s) =>
				s.kind === 'expand' && s.children.some((c) => r.nodes[c].f > r.nodes[c].g + r.nodes[c].h)
		);
		expect(i).toBeGreaterThan(0);
		expect(treeAt(r, i).nodes.some((n) => n.inherited)).toBe(true);
	});

	it('shows the root alone after the root call fails, and the root before any step', () => {
		const r = rbfs(
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
		const kinds = r.steps.map((s) => s.kind);
		expect(kinds).toEqual(['expand', 'call', 'dead-end', 'return', 'fail']);
		const ret = treeAt(r, 3);
		expect(ret.nodes.map((n) => `${n.label} ${n.status}`)).toEqual(['S current', 'A forgotten']);
		expect(ret.path).toEqual([]);
		const fail = treeAt(r, 4);
		expect(fail.nodes.map((n) => `${n.label} ${n.status}`)).toEqual(['S current']);
		expect(treeAt(r, -1).nodes.map((n) => n.label)).toEqual(['S']);
	});
});

describe('graphHighlightAt', () => {
	it('draws the path down to the current call and the stored successors', () => {
		expect(graphHighlightAt(treeAt(romania, 4))).toEqual({
			current: 'Rimnicu Vilcea',
			path: ['Arad', 'Sibiu'],
			// Open calls are not stored successors; the Sibiu under Rimnicu Vilcea is.
			frontier: ['Timisoara', 'Zerind', 'Arad', 'Fagaras', 'Oradea', 'Craiova', 'Pitesti', 'Sibiu']
		});
		// A call: the caller is current; the path stops before it.
		expect(graphHighlightAt(treeAt(romania, 3)).path).toEqual(['Arad']);
		// A return: the returning call is current; the path is what stays open.
		expect(graphHighlightAt(treeAt(romania, 5))).toMatchObject({
			current: 'Rimnicu Vilcea',
			path: ['Arad', 'Sibiu']
		});
	});

	it('draws the solution path at the goal step', () => {
		const h = graphHighlightAt(treeAt(romania, 14));
		expect(h.current).toBeUndefined();
		expect(h.path).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']);
	});
});

describe('progressAt', () => {
	it('counts up to a step', () => {
		expect(progressAt(romania, -1)).toEqual({
			expanded: 0,
			reexpanded: 0,
			generated: 1,
			regenerated: 0,
			stored: 1,
			maxStored: 1,
			depth: 0,
			maxDepth: 0
		});
		expect(progressAt(romania, 5)).toEqual({
			expanded: 3,
			reexpanded: 0,
			generated: 11,
			regenerated: 0,
			stored: 8,
			maxStored: 11,
			depth: 2,
			maxDepth: 2
		});
		expect(progressAt(romania, 14)).toEqual({
			expanded: 6,
			reexpanded: 1,
			generated: 19,
			regenerated: 3,
			stored: 14,
			maxStored: 14,
			depth: 4,
			maxDepth: 4
		});
		expect(progressAt(romania, 999)).toEqual(progressAt(romania, 14));
	});
});

describe('runRbfs and problemFacts', () => {
	it('runs RBFS and A* tree search on the same problem', () => {
		const run = runRbfs(ROMANIA_PROBLEM, 500);
		expect(run.result.solution?.cost).toBe(418);
		expect(run.astar.solution?.cost).toBe(418);
		expect(run.astar.stats.expanded).toBe(5);
		expect(run.astar.steps).toEqual([]);
		expect(run.best?.cost).toBe(418);
		expect(run.heuristic.admissible).toBe(true);
		expect(runRbfs(ROMANIA_PROBLEM, 2).result.failure).toBe('limit');
	});

	it('states the problem', () => {
		expect(problemFacts(ROMANIA_PROBLEM)).toEqual({
			start: 'Arad',
			goals: ['Bucharest'],
			states: 20,
			edges: 23,
			directed: false,
			hCount: 20,
			hText: 'Straight-line distance to Bucharest'
		});
		expect(problemFacts(TINY_PROBLEM).hText).toBe('None (h = 0 for every state)');
		expect(problemFacts({ ...TINY_PROBLEM, h: { S: 1 } }).hText).toBe('Given for 1 of 12 states');
	});
});
