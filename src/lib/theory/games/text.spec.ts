import { describe, expect, it } from 'vitest';
import {
	formatGameTree,
	formatTuple,
	formatUtility,
	formatValue,
	highlightGameTree,
	parseGameTree,
	parsePlayerOrder,
	playerTone,
	withPlayerOrder,
	withRootPlayer
} from './text';
import { MAX_NODES, buildGameTree, nestedTree, randomGameTree, type GameTree } from './tree';

const SLIDE_TEXT = '[[3 12 8] [2 4 6] [14 5 2]]';
const MULTI_TEXT = `order: 1 3 2
[
  [[(1,2,6) (4,3,2)] [(6,1,2) (7,4,1)]]
  [[(5,1,1) (1,5,2)] [(7,7,1) (5,4,5)]]
]`;

const ok = (text: string): GameTree => {
	const { tree, diagnostics } = parseGameTree(text);
	expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(tree).not.toBeNull();
	return tree!;
};

const errorOf = (text: string) => {
	const { tree, diagnostics } = parseGameTree(text);
	expect(tree).toBeNull();
	const e = diagnostics.find((d) => d.severity === 'error');
	expect(e).toBeDefined();
	return { message: e!.message, at: e!.span ? text.slice(e!.span.start, e!.span.end) : null };
};

describe('parseGameTree', () => {
	it('reads the slide tree', () => {
		const t = ok(SLIDE_TEXT);
		expect(t).toEqual(
			nestedTree([
				[3, 12, 8],
				[2, 4, 6],
				[14, 5, 2]
			])
		);
	});

	it('reads the root player, labels, comments, and commas', () => {
		const t = ok(`# a comment
MIN: [left: [3, 12], "go right": [2 4,],]  # trailing comment`);
		expect(t.root).toBe('min');
		expect(t.nodes.map((n) => n.action)).toEqual([
			null,
			'left',
			'A11',
			'A12',
			'go right',
			'A21',
			'A22'
		]);
		expect(t.nodes[3].utility).toBe(12);
	});

	it('reads evaluation values, decimals, negatives, and exponents', () => {
		const t = ok('{5}[{-2.5}[1 -3] {1e3}[+4 −2]]');
		expect(t.nodes[0].eval).toBe(5);
		expect(t.nodes[1].eval).toBe(-2.5);
		expect(t.nodes[4].eval).toBe(1000);
		expect(t.nodes.filter((n) => n.utility !== null).map((n) => n.utility)).toEqual([1, -3, 4, -2]);
	});

	it('reads tuples and the player order (slide 13)', () => {
		const t = ok(MULTI_TEXT);
		expect(t.tuples).toBe(true);
		expect(t.players).toBe(3);
		expect(t.order).toEqual([1, 3, 2]);
		expect(t.nodes[3].utility).toEqual([1, 2, 6]);
		expect(ok('[(1 2) (3, 4)]').nodes[2].utility).toEqual([3, 4]);
		expect(ok('[{1,2}[(1,2)] {(3 4)}[(3,4)]]').nodes[3].eval).toEqual([3, 4]);
	});

	it('accepts a lone terminal node', () => {
		const t = ok('7');
		expect(t.nodes).toHaveLength(1);
		expect(t.nodes[0].utility).toBe(7);
	});

	it('reports problems with spans', () => {
		expect(errorOf('')).toMatchObject({ message: expect.stringContaining('empty') });
		expect(errorOf('   # only a comment\n')).toMatchObject({ at: null });
		expect(errorOf('[3 % 4]')).toEqual({ message: 'Unexpected character "%".', at: '%' });
		expect(errorOf('[[3 4] [5')).toMatchObject({ at: '[', message: expect.stringContaining(']') });
		expect(errorOf('[3 4]]')).toMatchObject({ at: ']' });
		expect(errorOf('[[3] []]')).toMatchObject({
			at: '[]',
			message: expect.stringContaining('Empty')
		});
		expect(errorOf('[3, , 4]')).toMatchObject({ at: ',' });
		expect(errorOf('[3 x 4]')).toMatchObject({
			at: 'x',
			message: expect.stringContaining('colon')
		});
		expect(errorOf('[3 "open: 4]')).toMatchObject({ message: expect.stringContaining('quote') });
		expect(errorOf('["": 3]')).toMatchObject({ message: 'Empty label.' });
		expect(errorOf('[a: ]')).toMatchObject({ message: 'Expected a node after the label.' });
		expect(errorOf('[3] [4]')).toMatchObject({
			at: '[',
			message: expect.stringContaining('after the end')
		});
		expect(errorOf('foo: [3]')).toMatchObject({
			at: 'foo',
			message: expect.stringContaining('Unknown directive')
		});
		expect(ok('[3 [max: 4]]').nodes[3].action).toBe('max');
		expect(errorOf('[3 [min 4]]')).toMatchObject({
			message: expect.stringContaining('before the tree')
		});
		expect(errorOf('max: min: [3]')).toMatchObject({ at: 'min:' });
		expect(errorOf('max:')).toMatchObject({ message: expect.stringContaining('missing') });
		expect(errorOf('[3 (4)]')).toMatchObject({
			at: '(4)',
			message: expect.stringContaining('write 4')
		});
		expect(errorOf('[3 ()]')).toMatchObject({ at: '()' });
		expect(errorOf('[3 (4, x)]')).toMatchObject({ at: 'x' });
		expect(errorOf('[3 (4, 5]')).toMatchObject({ at: ']' });
		expect(errorOf('[(1,2) 3]')).toMatchObject({
			at: '3',
			message: expect.stringContaining('tuple')
		});
		expect(errorOf('[3 (1,2)]')).toMatchObject({ at: '(1,2)' });
		expect(errorOf('[(1,2) (1,2,3)]')).toMatchObject({ at: '(1,2,3)' });
		expect(errorOf('[1e999]')).toMatchObject({ message: expect.stringContaining('finite') });
		expect(errorOf('[{} [3]]')).toMatchObject({ at: '{}' });
		expect(errorOf('[{1 [3]]')).toMatchObject({ at: '[' });
		expect(errorOf('[{1,2}[3]]')).toMatchObject({
			at: '{1,2}',
			message: expect.stringContaining('numbers')
		});
		expect(errorOf('[{1}[(1,2)]]')).toMatchObject({
			at: '{1}',
			message: expect.stringContaining('tuples of 2')
		});
		expect(errorOf('order: [(1,2)]')).toMatchObject({
			message: expect.stringContaining('player numbers')
		});
		expect(errorOf('order: 1 3 [(1,2)]')).toMatchObject({
			at: '3',
			message: expect.stringContaining('1 to 2')
		});
	});

	it('reports a label on the root', () => {
		expect(errorOf('A: [3]')).toMatchObject({
			message: expect.stringContaining('no action label')
		});
	});

	it('enforces the depth and size limits', () => {
		const deep = `${'['.repeat(11)}1${']'.repeat(11)}`;
		expect(errorOf(deep)).toMatchObject({ message: expect.stringContaining('deeper than 10') });
		expect(ok(`${'['.repeat(10)}1${']'.repeat(10)}`).nodes).toHaveLength(11);
		const wide = `[${Array.from({ length: MAX_NODES }, () => '1').join(' ')}]`;
		expect(errorOf(wide)).toMatchObject({ message: expect.stringContaining('2000') });
		// Very deep input does not overflow the stack.
		expect(errorOf(`${'['.repeat(100_000)}1`)).toMatchObject({
			message: expect.stringContaining('deeper')
		});
	});

	it('warns about ignored parts', () => {
		const leafEval = parseGameTree('[{3}4 5]');
		expect(leafEval.tree).not.toBeNull();
		expect(leafEval.tree!.nodes[1].eval).toBeNull();
		expect(leafEval.diagnostics).toMatchObject([{ severity: 'warning' }]);
		const order = parseGameTree('order: 2 1 [3 4]');
		expect(order.tree!.order).toBeNull();
		expect(order.diagnostics[0].message).toContain('ignored');
		const root = parseGameTree('min: [(1,2) (2,1)]');
		expect(root.tree!.root).toBe('max');
		expect(root.diagnostics[0]).toMatchObject({ severity: 'warning', span: { start: 0, end: 4 } });
		const twice = parseGameTree('order: 1 order: 2 1 [(1,2)]');
		expect(twice.tree!.order).toEqual([2, 1]);
		expect(twice.diagnostics[0].severity).toBe('warning');
	});
});

describe('formatGameTree', () => {
	it('writes the slide tree on one line', () => {
		expect(
			formatGameTree(
				nestedTree([
					[3, 12, 8],
					[2, 4, 6],
					[14, 5, 2]
				])
			)
		).toBe(SLIDE_TEXT);
	});

	it('writes the header, labels that differ from the defaults, and evaluation values', () => {
		const t = ok('min: [A1: {4}[3 12] right: [2 "x y": 4 "q\\"": 5]]');
		expect(formatGameTree(t)).toBe('min: [{4}[3 12] right: [2 "x y": 4 "q\\"": 5]]');
		expect(formatGameTree(ok(MULTI_TEXT))).toBe(MULTI_TEXT);
	});

	it('breaks long lines one child per line', () => {
		const t = randomGameTree({ branching: 3, depth: 3, seed: 2 });
		const text = formatGameTree(t, { width: 30 });
		expect(text.split('\n').every((line) => line.length <= 30)).toBe(true);
		expect(text.startsWith('[\n  [\n    [')).toBe(true);
		expect(parseGameTree(text).tree).toEqual(t);
	});

	it('round-trips every tree exactly', () => {
		const trees: GameTree[] = [
			nestedTree(0),
			nestedTree(
				[
					[-0, 1.5],
					[-3, 1e21]
				],
				'min'
			),
			ok('[x: {-1}[1 2] "a b": [3 {2}[4 5]]]'),
			ok(MULTI_TEXT),
			ok('[(1,2) (2,1)]'),
			buildGameTree({ children: Array.from({ length: 12 }, (_, i) => ({ utility: i })) }),
			buildGameTree({
				children: [
					{ action: 'A2', utility: 1 },
					{ action: 'A1', utility: 2 }
				]
			})
		];
		for (let seed = 1; seed <= 30; seed++)
			trees.push(
				randomGameTree({
					branching: 1 + (seed % 4),
					depth: 1 + (seed % 5),
					seed,
					min: -50,
					max: 50,
					root: seed % 2 ? 'max' : 'min'
				})
			);
		for (const t of trees) {
			for (const width of [10, 64, 1000]) {
				const text = formatGameTree(t, { width });
				const back = parseGameTree(text);
				expect(back.diagnostics).toEqual([]);
				expect(back.tree).toEqual(t);
			}
		}
	});

	it('formats values', () => {
		expect(formatValue(-0)).toBe('0');
		expect(formatValue(2.5)).toBe('2.5');
		expect(formatTuple([4, 3, 2])).toBe('4,3,2');
		expect(formatUtility([4, 3, 2])).toBe('(4,3,2)');
		expect(formatUtility(-7)).toBe('-7');
	});
});

describe('highlightGameTree', () => {
	const classes = (text: string) =>
		highlightGameTree(text).map((t) => [text.slice(t.from, t.to), t.className]);

	it('colors directives, labels, numbers, evaluation values, and comments', () => {
		expect(classes('min: [a: {5}[3] 4] # c')).toEqual([
			['min', 'hl-keyword'],
			[':', 'hl-punct'],
			['[', 'hl-paren'],
			['a', 'hl-name'],
			[':', 'hl-punct'],
			['{', 'hl-special'],
			['5', 'hl-special'],
			['}', 'hl-special'],
			['[', 'hl-paren'],
			['3', 'hl-number'],
			[']', 'hl-paren'],
			['4', 'hl-number'],
			[']', 'hl-paren'],
			['# c', 'hl-comment']
		]);
	});

	it('colors tuple entries by player (1 red, 2 blue, 3 green)', () => {
		expect(classes('[(4,3,2)]').filter(([, c]) => c.startsWith('hl-tok'))).toEqual([
			['4', 'hl-tok-4'],
			['3', 'hl-tok-0'],
			['2', 'hl-tok-1']
		]);
		expect(playerTone(1)).toBe(4);
		expect(playerTone(7)).toBe(4);
		expect(classes('order: 1 3 2 [(1,2)]').slice(0, 2)).toEqual([
			['order', 'hl-keyword'],
			[':', 'hl-punct']
		]);
		expect(classes('["q": 1]')[1]).toEqual(['"q"', 'hl-string']);
	});
});

describe('header edits', () => {
	it('sets the root player', () => {
		expect(withRootPlayer('[3 4]', 'min')).toBe('min: [3 4]');
		expect(withRootPlayer('[3 4]', 'max')).toBe('[3 4]');
		expect(withRootPlayer('MIN: [3 4]', 'max')).toBe('max: [3 4]');
		expect(withRootPlayer('# c\n[\n  3\n]', 'min')).toBe('# c\nmin:\n[\n  3\n]');
		expect(withRootPlayer('order: 1 2 [3]', 'min')).toBe('order: 1 2 min: [3]');
		expect(withRootPlayer('', 'min')).toBe('min: ');
	});

	it('sets, adds, and removes the player order', () => {
		expect(withPlayerOrder(MULTI_TEXT, [1, 2, 3])).toBe(MULTI_TEXT.replace('1 3 2', '1 2 3'));
		expect(withPlayerOrder('[(1,2) (2,1)]', [2, 1])).toBe('order: 2 1 [(1,2) (2,1)]');
		expect(withPlayerOrder('[\n(1,2)]', [2, 1])).toBe('order: 2 1\n[\n(1,2)]');
		expect(withPlayerOrder(MULTI_TEXT, null)).toBe(MULTI_TEXT.slice(MULTI_TEXT.indexOf('[')));
		expect(withPlayerOrder('[(1,2)]', null)).toBe('[(1,2)]');
		expect(withPlayerOrder('order: 1, 2 [(1,2)]', [2])).toBe('order: 2 [(1,2)]');
	});

	it('reads player numbers typed in a field', () => {
		expect(parsePlayerOrder('1 3 2', 3)).toEqual([1, 3, 2]);
		expect(parsePlayerOrder(' 2, 1 ', 2)).toEqual([2, 1]);
		expect(parsePlayerOrder('1 4', 3)).toBeNull();
		expect(parsePlayerOrder('1 x', 3)).toBeNull();
		expect(parsePlayerOrder('0', 3)).toBeNull();
		expect(parsePlayerOrder('', 3)).toBeNull();
	});
});
