import { describe, expect, it } from 'vitest';
import { parseGameTree, type GameTree } from '$lib/theory/games';
import { CUTOFF_TREE, MIN_ROOT_TREE, MULTI_TREE } from './presets';
import { SLIDE_TREE } from './state';
import { codeFor, lineOf, tokenizeCode } from './pseudocode';
import { runGame, type Algorithm } from './view';

const tree = (text: string): GameTree => parseGameTree(text).tree!;
const run = (text: string, algorithm: Algorithm, cutoff: number | null = null) =>
	runGame(tree(text), { algorithm, ordering: 'given', cutoff });

describe('codeFor', () => {
	it('shows the slide 22 pseudocode for a MAX root, Max-Value first', () => {
		const code = codeFor(run(SLIDE_TREE, 'alphabeta'));
		expect(code.title).toBe('Alpha-beta pruning');
		expect(code.lines.map((l) => l.text)).toEqual([
			'Function action = Alpha-Beta-Search(node)',
			'v = Max-Value(node, −∞, ∞)',
			'return the action from node with value v',
			'Function v = Max-Value(node, α, β)',
			'if Terminal(node) return Utility(node)',
			'v = −∞',
			'for each action from node',
			'v = Max(v, Min-Value(Succ(node, action), α, β))',
			'if v ≥ β return v',
			'α = Max(α, v)',
			'end for',
			'return v',
			'Function v = Min-Value(node, α, β)',
			'if Terminal(node) return Utility(node)',
			'v = +∞',
			'for each action from node',
			'v = Min(v, Max-Value(Succ(node, action), α, β))',
			'if v ≤ α return v',
			'β = Min(β, v)',
			'end for',
			'return v'
		]);
	});

	it('starts with Min-Value for a MIN root (slide 21) and adds the cutoff line (slide 24)', () => {
		const min = codeFor(run(MIN_ROOT_TREE, 'alphabeta'));
		expect(min.lines[1].text).toBe('v = Min-Value(node, −∞, ∞)');
		expect(min.lines[3].text).toBe('Function v = Min-Value(node, α, β)');
		const cut = codeFor(run(CUTOFF_TREE, 'alphabeta', 2));
		expect(cut.lines.filter((l) => l.text === 'if Cutoff(node) return Eval(node)')).toHaveLength(2);
		expect(codeFor(run(CUTOFF_TREE, 'minimax', 2)).lines.map((l) => l.id)).toContain('mm-cutoff');
		expect(codeFor(run(MULTI_TREE, 'minimax')).title).toBe('Backing up utility tuples');
	});

	it('gives every line a unique id', () => {
		for (const r of [
			run(SLIDE_TREE, 'alphabeta'),
			run(SLIDE_TREE, 'minimax', null),
			run(MULTI_TREE, 'minimax')
		]) {
			const ids = codeFor(r).lines.map((l) => l.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});
});

describe('lineOf', () => {
	it('maps every alpha-beta step to a line of the listing', () => {
		const r = run(SLIDE_TREE, 'alphabeta');
		const ids = new Set(codeFor(r).lines.map((l) => l.id));
		const lines = r.result.steps.map((s) => lineOf(r, s));
		expect(lines.every((l) => l !== null && ids.has(l))).toBe(true);
		expect(lines.slice(0, 6)).toEqual([
			'ab-search-call',
			'max-init',
			'min-init',
			'max-terminal',
			'min-update',
			'min-bound'
		]);
		expect(lines).toContain('min-test');
		expect(lines).toContain('min-return');
		expect(lines.at(-1)).toBe('ab-search-return');
		expect(lineOf(r, undefined)).toBeNull();
	});

	it('maps minimax and max-n steps to their definitions', () => {
		const mm = run(SLIDE_TREE, 'minimax');
		expect([...new Set(mm.result.steps.map((s) => lineOf(mm, s)))]).toEqual([
			'mm-head',
			'mm-terminal',
			'mm-min',
			'mm-max',
			'mm-strategy'
		]);
		const cut = run(CUTOFF_TREE, 'minimax', 2);
		expect(cut.result.steps.map((s) => lineOf(cut, s))).toContain('mm-cutoff');
		const n = run(MULTI_TREE, 'minimax');
		expect([...new Set(n.result.steps.map((s) => lineOf(n, s)))]).toEqual([
			'n-head',
			'n-terminal',
			'n-backup',
			'n-choose'
		]);
	});
});

describe('tokenizeCode', () => {
	it('colors Max-Value with α and Min-Value with β, as on the slides', () => {
		expect(tokenizeCode('v = Max(v, Min-Value(Succ(node, action), α, β))')).toEqual([
			{ text: 'v = ', kind: 'text' },
			{ text: 'Max', kind: 'function' },
			{ text: '(v, ', kind: 'text' },
			{ text: 'Min-Value', kind: 'min' },
			{ text: '(', kind: 'text' },
			{ text: 'Succ', kind: 'function' },
			{ text: '(node, action), ', kind: 'text' },
			{ text: 'α', kind: 'alpha' },
			{ text: ', ', kind: 'text' },
			{ text: 'β', kind: 'beta' },
			{ text: '))', kind: 'text' }
		]);
		expect(tokenizeCode('if v ≥ β return v').map((t) => t.kind)).toEqual([
			'keyword',
			'text',
			'beta',
			'text',
			'keyword',
			'text'
		]);
	});

	it('writes max_action with a subscript and leaves keywords in prose alone', () => {
		expect(tokenizeCode('max_action Minimax(x)')[0]).toEqual({
			text: 'max',
			kind: 'function',
			sub: 'action'
		});
		expect(tokenizeCode('backed up from children', true)).toEqual([
			{ text: 'backed up from children', kind: 'text' }
		]);
	});
});
