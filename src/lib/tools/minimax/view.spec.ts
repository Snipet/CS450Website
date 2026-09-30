import { describe, expect, it } from 'vitest';
import { nodeName, parseGameTree, type GameTree } from '$lib/theory/games';
import { SLIDE_TREE } from './state';
import { CUTOFF_TREE, MULTI_TREE, ORDERING_TREE } from './presets';
import { boundLabel, countsTable, runCounts, runGame, viewAt, type GameRun } from './view';

const tree = (text: string): GameTree => parseGameTree(text).tree!;
const SLIDE = tree(SLIDE_TREE);

/** The value labels by node name after a step. */
function labels(run: GameRun, step: number): Record<string, string> {
	const v = viewAt(run, step);
	const out: Record<string, string> = {};
	run.result.tree.nodes.forEach((n) => {
		const l = v.display.labels[n.id];
		if (l) out[nodeName(run.result.tree, n.id)] = l.text;
	});
	return out;
}

/** Index of the first step matching a predicate. */
const stepWhere = (run: GameRun, ok: (s: GameRun['result']['steps'][number]) => boolean) =>
	(run.result.steps as GameRun['result']['steps'][number][]).findIndex(ok);

describe('runGame', () => {
	it('runs the algorithm the settings ask for, and max-n for tuple trees', () => {
		expect(runGame(SLIDE, { algorithm: 'minimax', ordering: 'given', cutoff: null }).kind).toBe(
			'minimax'
		);
		const ab = runGame(SLIDE, { algorithm: 'alphabeta', ordering: 'best-first', cutoff: null });
		expect(ab.kind).toBe('alphabeta');
		expect(ab.result.tree.nodes[3].action).toBe('A13');
		expect(
			runGame(tree(MULTI_TREE), { algorithm: 'alphabeta', ordering: 'given', cutoff: null }).kind
		).toBe('maxn');
	});
});

describe('viewAt, alpha-beta on the slide tree (slides 15–19)', () => {
	const run = runGame(SLIDE, { algorithm: 'alphabeta', ordering: 'given', cutoff: null });

	it('shows nothing before the search starts', () => {
		const v = viewAt(run, 0);
		expect(v.display.status.every((s) => s === 'unvisited')).toBe(true);
		expect(v.display.current).toBe(0);
		expect(v.display.bounds).toBeNull();
		expect(v.stack).toEqual([]);
		expect(v.progress).toEqual({ visited: 0, evaluated: 0, pruned: 0 });
	});

	it('bounds the first MIN node while it is searched, then shows 3 and ≥3 at the root (slide 15)', () => {
		const afterA11 = stepWhere(run, (s) => s.kind === 'update' && s.node === 1);
		expect(labels(run, afterA11)).toEqual({ A1: '≤3' });
		const returned = stepWhere(run, (s) => s.kind === 'return' && s.node === 1);
		expect(labels(run, returned)).toEqual({ A1: '3' });
		expect(labels(run, returned + 1)).toEqual({ root: '≥3', A1: '3' });
	});

	it('prunes A22 and A23 and keeps ≤2 at the second MIN node (slide 16)', () => {
		const prune = stepWhere(run, (s) => s.kind === 'prune' && s.node === 5);
		const v = viewAt(run, prune);
		expect(labels(run, prune)).toEqual({ root: '≥3', A1: '3', A2: '≤2' });
		expect([...v.display.cut].map((id) => nodeName(SLIDE, id))).toEqual(['A22', 'A23']);
		expect(v.display.status[7]).toBe('pruned');
		expect(v.display.status[8]).toBe('pruned');
		expect(v.display.status[5]).toBe('done');
		expect(v.display.bounds).toEqual({ node: 5, alpha: 3, beta: Infinity });
		expect(v.progress.pruned).toBe(2);
	});

	it('shows ≤14, then ≤5, then 2 at the third MIN node (slides 17–19)', () => {
		const updates = (run.result.steps as GameRun['result']['steps'][number][])
			.map((s, i) => [s, i] as const)
			.filter(([s]) => s.kind === 'update' && s.node === 9)
			.map(([, i]) => labels(run, i).A3);
		expect(updates).toEqual(['≤14', '≤5', '2']);
		const end = run.result.steps.length - 1;
		expect(labels(run, end)).toEqual({ root: '3', A1: '3', A2: '≤2', A3: '2' });
		const v = viewAt(run, end);
		expect(v.display.best).toBe(1);
		expect(v.progress).toEqual({ visited: 11, evaluated: 7, pruned: 2 });
	});

	it('shows α and β of the call being processed and the open calls', () => {
		const leaf = stepWhere(run, (s) => s.kind === 'leaf' && s.node === 11);
		const v = viewAt(run, leaf);
		// A leaf is called with its parent's α and β; they are drawn at the parent.
		expect(v.display.bounds).toEqual({ node: 9, alpha: 3, beta: 14 });
		expect(v.stack.map((f) => [nodeName(SLIDE, f.node), f.fn, f.alpha, f.beta, f.v])).toEqual([
			['root', 'max', 3, Infinity, 3],
			['A3', 'min', 3, 14, 14]
		]);
		const update = stepWhere(run, (s) => s.kind === 'update' && s.node === 9);
		expect(viewAt(run, update).display.emphasis).toEqual({ child: 10, kind: 'returned' });
	});

	it('clamps the step', () => {
		expect(viewAt(run, 999).display.best).toBe(1);
		expect(viewAt(run, -5).display.current).toBe(0);
	});
});

describe('viewAt, minimax and max-n', () => {
	it('backs up exact values and marks the path of the recursion', () => {
		const run = runGame(SLIDE, { algorithm: 'minimax', ordering: 'given', cutoff: null });
		const a12 = stepWhere(run, (s) => s.kind === 'leaf' && s.node === 3);
		const v = viewAt(run, a12);
		expect(v.display.status.slice(0, 5)).toEqual(['open', 'open', 'done', 'done', 'unvisited']);
		expect(labels(run, a12)).toEqual({});
		const backup = stepWhere(run, (s) => s.kind === 'backup' && s.node === 1);
		expect(labels(run, backup)).toEqual({ A1: '3' });
		expect(viewAt(run, backup).display.emphasis).toEqual({ child: 2, kind: 'chosen' });
		expect(labels(run, run.result.steps.length - 1)).toEqual({
			root: '3',
			A1: '3',
			A2: '2',
			A3: '2'
		});
	});

	it('marks evaluation values at the cutoff and the nodes beyond it', () => {
		const run = runGame(tree(CUTOFF_TREE), { algorithm: 'minimax', ordering: 'given', cutoff: 2 });
		const v = viewAt(run, run.result.steps.length - 1);
		const t = run.result.tree;
		const a11 = t.nodes.find((n) => n.action === 'A11')!.id;
		const a111 = t.nodes.find((n) => n.action === 'A111')!.id;
		expect(v.display.labels[a11]).toEqual({ text: '6', kind: 'eval' });
		expect(v.display.status[a111]).toBe('beyond');
		expect(viewAt(run, 0).display.status[a111]).toBe('beyond');
		expect(labels(run, run.result.steps.length - 1).root).toBe('5');
	});

	it('labels multi-player nodes with their tuples', () => {
		const run = runGame(tree(MULTI_TREE), {
			algorithm: 'minimax',
			ordering: 'given',
			cutoff: null
		});
		const v = viewAt(run, run.result.steps.length - 1);
		expect(v.display.labels[0]).toEqual({ text: '4,3,2', kind: 'exact', tuple: [4, 3, 2] });
		expect(v.display.best).toBe(1);
		expect(v.stack).toEqual([]);
	});
});

describe('boundLabel', () => {
	it('prefers ≥ at MAX nodes and ≤ at MIN nodes', () => {
		expect(boundLabel(true, 3, 3)).toEqual({ text: '3', kind: 'exact' });
		expect(boundLabel(true, 3, Infinity)).toEqual({ text: '≥3', kind: 'lower' });
		expect(boundLabel(true, -Infinity, 5)).toEqual({ text: '≤5', kind: 'upper' });
		expect(boundLabel(false, 1, 5)).toEqual({ text: '≤5', kind: 'upper' });
		expect(boundLabel(true, 1, 5)).toEqual({ text: '≥1', kind: 'lower' });
		expect(boundLabel(false, -Infinity, Infinity)).toBeNull();
	});
});

describe('counts', () => {
	it('compares minimax with each move ordering', () => {
		const table = countsTable(tree(ORDERING_TREE), null)!;
		expect(table.minimax).toEqual({
			visited: 40,
			total: 40,
			evaluated: 27,
			positions: 27,
			pruned: 0
		});
		expect(table.orderings.map((o) => [o.ordering, o.counts.evaluated])).toEqual([
			['given', 18],
			['best-first', 11],
			['worst-first', 27]
		]);
		expect(table.uniform).toEqual({ b: 3, d: 3, all: 27, perfect: 11 });
		expect(countsTable(tree(MULTI_TREE), null)).toBeNull();
	});

	it('uses the cutoff depth for uniform trees cut off early', () => {
		const table = countsTable(tree(CUTOFF_TREE), 2)!;
		expect(table.uniform).toEqual({ b: 2, d: 2, all: 4, perfect: 3 });
		expect(table.minimax.evaluated).toBe(4);
	});

	it('counts one run', () => {
		const ab = runGame(SLIDE, { algorithm: 'alphabeta', ordering: 'given', cutoff: null });
		expect(runCounts(ab)).toEqual({
			visited: 11,
			total: 13,
			evaluated: 7,
			positions: 9,
			pruned: 2
		});
		const mm = runGame(SLIDE, { algorithm: 'minimax', ordering: 'given', cutoff: null });
		expect(runCounts(mm)).toEqual({
			visited: 13,
			total: 13,
			evaluated: 9,
			positions: 9,
			pruned: 0
		});
	});
});
