import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '../diagnostics';
import * as builtins from './builtins';
import { MAX_EDGES, MAX_STATES, formatGraphText, highlightGraphText, parseGraphText } from './text';
import type { GraphProblemSpec, WeightedGraph } from './types';

const spec = (text: string) => {
	const { spec, diagnostics } = parseGraphText(text);
	expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	return spec!;
};
const messages = (text: string, severity?: Diagnostic['severity']) =>
	parseGraphText(text)
		.diagnostics.filter((d) => !severity || d.severity === severity)
		.map((d) => d.message);
/** The one diagnostic of `severity`, with the text its span covers. */
const only = (text: string, severity: Diagnostic['severity'] = 'error') => {
	const ds = parseGraphText(text).diagnostics.filter((d) => d.severity === severity);
	expect(ds).toHaveLength(1);
	const d = ds[0];
	return { message: d.message, at: d.span ? text.slice(d.span.start, d.span.end) : null };
};
const ids = (s: GraphProblemSpec) => s.graph.nodes.map((n) => n.id);
const edgeList = (s: GraphProblemSpec) =>
	s.graph.edges.map((e) => `${e.from}${s.graph.directed ? '>' : '-'}${e.to}:${e.cost}`);

describe('parseGraphText', () => {
	it('reads the format of ARCHITECTURE §4.2.1', () => {
		const text = [
			'undirected                 # or: directed',
			'start: Arad',
			'goal: Bucharest',
			'Arad - Sibiu 140           # an undirected edge with its cost',
			'Sibiu Bucharest 278',
			'h: Arad=366, Sibiu=253',
			'at: Arad 26 233',
			'node: Lonely'
		].join('\n');
		const { spec: s, diagnostics } = parseGraphText(text);
		expect(diagnostics).toEqual([]);
		expect(s).toEqual({
			graph: {
				directed: false,
				nodes: [
					{ id: 'Arad', x: 26, y: 233 },
					{ id: 'Bucharest' },
					{ id: 'Sibiu' },
					{ id: 'Lonely' }
				],
				edges: [
					{ from: 'Arad', to: 'Sibiu', cost: 140 },
					{ from: 'Sibiu', to: 'Bucharest', cost: 278 }
				]
			},
			start: 'Arad',
			goals: ['Bucharest'],
			h: { Arad: 366, Sibiu: 253 }
		});
		expect(s).not.toHaveProperty('hLabel');
		expect(s!.graph.nodes[1]).not.toHaveProperty('x');
	});

	it('accepts every edge form; the cost defaults to 1', () => {
		const s = spec('start: A\ngoal: F\nA - B 5\nA -- C 2\nC D 7\nD - E: 3\nE F\nB - F: 0.5');
		expect(s.graph.directed).toBe(false);
		expect(edgeList(s)).toEqual(['A-B:5', 'A-C:2', 'C-D:7', 'D-E:3', 'E-F:1', 'B-F:0.5']);
	});

	it('makes the graph directed when an edge has an arrow; "-" then adds both directions', () => {
		const s = spec('start: S\ngoal: G\nS -> A 1\nA - G 2\nA → B 4\nB->G');
		expect(s.graph.directed).toBe(true);
		expect(edgeList(s)).toEqual(['S>A:1', 'A>G:2', 'G>A:2', 'A>B:4', 'B>G:1']);
	});

	it('makes arrowless edges two-way in a graph declared directed', () => {
		const s = spec('directed\nstart: A\ngoal: B\nA B 3');
		expect(edgeList(s)).toEqual(['A>B:3', 'B>A:3']);
	});

	it('orders states by first appearance on start, goal, edge, node and at lines', () => {
		const s = spec('at: P 0 0\nstart: S\nh: Z=1\ngoal: G\nnode: N\nS - A 1\nA - G 1\nZ - S 2');
		expect(ids(s)).toEqual(['P', 'S', 'G', 'N', 'A', 'Z']);
	});

	it('reads quoted names with escapes and names in any script', () => {
		const s = spec(
			[
				'start: "Rimnicu Vilcea"',
				'goal: Zürich',
				'"Rimnicu Vilcea" - Zürich 1',
				'Zürich - "say \\"hi\\"" 2',
				"東京 - q' 3",
				'a.b - x_1 4',
				'"back\\\\slash" - x_1 1',
				'"A#1" - x_1 1'
			].join('\n')
		);
		expect(ids(s)).toEqual([
			'Rimnicu Vilcea',
			'Zürich',
			'say "hi"',
			'東京',
			"q'",
			'a.b',
			'x_1',
			'back\\slash',
			'A#1'
		]);
	});

	it('reads directives in any case; goals accumulate without repeats', () => {
		const s = spec(
			'UNDIRECTED\nStart: A\nGoals: B C\nGOAL: D, B\nNode: E\nNODES: F G\nH: A=1\nAT: A 1 2\nA - B\nA - C\nA - D'
		);
		expect(s.goals).toEqual(['B', 'C', 'D']);
		expect(ids(s)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
		expect(s.h).toEqual({ A: 1 });
		expect(s.graph.nodes[0]).toEqual({ id: 'A', x: 1, y: 2 });
	});

	it('ignores comments and blank lines, and reads CRLF line endings', () => {
		const s = spec('# a comment\r\n\r\nstart: A # the start\r\ngoal: B\r\n  A - B 2  # a road\r\n');
		expect(edgeList(s)).toEqual(['A-B:2']);
		expect(s.start).toBe('A');
	});

	it('reads h values separated by commas or spaces, with quoted names and decimals', () => {
		const s = spec(
			'start: A\ngoal: C\nA - "B c" 1\n"B c" - C 1\nh: A=1 "B c"=2.5, C = 0\nh: A=1.25'
		);
		expect(s.h).toEqual({ A: 1.25, 'B c': 2.5, C: 0 });
	});

	it('reads positions with negative and decimal coordinates', () => {
		const s = spec('start: A\ngoal: B\nA - B\nat: A -10 2.5\nat: B 3, -.5');
		expect(s.graph.nodes).toEqual([
			{ id: 'A', x: -10, y: 2.5 },
			{ id: 'B', x: 3, y: -0.5 }
		]);
	});

	it('reads "# h: <label>" on the first line as hLabel', () => {
		const text = '\n# h: Straight-line distance to Bucharest  \nstart: A\ngoal: B\nA - B 1';
		expect(spec(text).hLabel).toBe('Straight-line distance to Bucharest');
		expect(spec('#H:x\nstart: A\ngoal: B\nA - B').hLabel).toBe('x');
		expect(spec('start: A\n# h: later\ngoal: B\nA - B')).not.toHaveProperty('hLabel');
		expect(spec('# heuristic\nstart: A\ngoal: B\nA - B')).not.toHaveProperty('hLabel');
		expect(spec('# h:\nstart: A\ngoal: B\nA - B')).not.toHaveProperty('hLabel');
	});

	it('treats a name like start, goal or directed as a state when the edge has an operator', () => {
		const s = spec('start: start\ngoal: directed\nstart - directed 2\ndirected -> h 1\nh - goal 1');
		expect(ids(s)).toEqual(['start', 'directed', 'h', 'goal']);
		expect(s.graph.directed).toBe(true);
	});

	it('keeps h values for states named like object properties as own properties', () => {
		const s = spec(
			'start: constructor\ngoal: __proto__\nconstructor - __proto__ 1\nh: constructor=3'
		);
		expect(Object.keys(s.h!)).toEqual(['constructor']);
		expect(Object.hasOwn(s.h!, '__proto__')).toBe(false);
		const both = spec('start: A\ngoal: __proto__\nA - __proto__\nh: __proto__=0, A=1');
		expect(Object.getOwnPropertyDescriptor(both.h, '__proto__')!.value).toBe(0);
		expect(Object.getPrototypeOf(both.h)).toBe(Object.prototype);
		expect(parseGraphText(formatGraphText(both)).spec).toEqual(both);
	});

	it('reads an arrowless edge from a state named h', () => {
		expect(edgeList(spec('start: h\ngoal: p\nh p 4'))).toEqual(['h-p:4']);
	});

	it('keeps self-loops as a single edge, with a note', () => {
		const text = 'directed\nstart: A\ngoal: B\nA - A 2\nA -> B 1';
		expect(edgeList(spec(text))).toEqual(['A>A:2', 'A>B:1']);
		expect(only(text, 'info')).toEqual({
			message: 'Self-loop on A: this edge leads back to the same state.',
			at: 'A - A 2'
		});
	});
});

describe('parseGraphText diagnostics', () => {
	it('reports an unknown directive with the directive in the span', () => {
		const text = 'start: A\ngoal: B\ngoa: B\nA - B 1';
		expect(only(text)).toEqual({
			message:
				'Unknown directive "goa:". Expected start:, goal:, h:, at:, node:, directed, or undirected.',
			at: 'goa:'
		});
		expect(parseGraphText(text).spec).toBeNull();
		expect(messages('start: A\ngoa: B\nA - B 1', 'error')).toEqual([
			'Unknown directive "goa:". Expected start:, goal:, h:, at:, node:, directed, or undirected.',
			'No goal state. Add a line like "goal: G".'
		]);
	});

	it('reports bad and negative costs', () => {
		const base = 'start: A\ngoal: B\n';
		expect(only(base + 'A - B 5x')).toEqual({
			message: 'Bad cost "5x". Costs are numbers ≥ 0, like 5 or 2.5.',
			at: '5x'
		});
		expect(only(base + 'A - B 1.2.3').at).toBe('1.2.3');
		expect(only(base + 'A - B -5')).toEqual({
			message: 'Negative cost -5. Step costs must be ≥ 0.',
			at: '-5'
		});
		expect(only(base + 'A -> B: -0.5').message).toBe('Negative cost -0.5. Step costs must be ≥ 0.');
		expect(only(base + `A - B 1${'0'.repeat(400)}`).message).toMatch(/^Bad cost/);
		expect(only(base + 'A - B:').message).toBe('Expected a cost after ":".');
		expect(spec(base + 'A - B -0').graph.edges[0].cost).toBe(0);
	});

	it('suggests quotes for names with spaces', () => {
		const base = 'start: Arad\ngoal: Pitesti\n';
		expect(only(base + 'Arad - Rimnicu Vilcea 97')).toEqual({
			message:
				'Expected a cost after Rimnicu, found "Vilcea". Names with spaces need quotes, like "Rimnicu Vilcea".',
			at: 'Vilcea'
		});
		expect(only(base + 'Rimnicu Vilcea - Pitesti 97')).toEqual({
			message:
				'Unexpected "-" after the edge. Names with spaces need quotes, like "Rimnicu Vilcea".',
			at: '- Pitesti 97'
		});
		expect(only(base + 'Arad - Pitesti 5 6').message).toBe('Unexpected "6" after the edge.');
	});

	it('reports a missing start or goal', () => {
		expect(messages('A - B 1', 'error')).toEqual([
			'No start state. Add a line like "start: A".',
			'No goal state. Add a line like "goal: G".'
		]);
		const d = parseGraphText('start: A\nA - B').diagnostics;
		expect(d).toEqual([
			{ severity: 'error', message: 'No goal state. Add a line like "goal: G".' }
		]);
	});

	it('reports more than one start state', () => {
		expect(only('start: A\nstart: B\ngoal: B\nA - B')).toEqual({
			message: 'More than one start state: A and B.',
			at: 'B'
		});
		expect(only('start: A, B C\ngoal: B\nA - B')).toEqual({
			message: 'More than one start state: A and B.',
			at: 'B C'
		});
		expect(only('start: A\nstart: A\ngoal: B\nA - B', 'info')).toEqual({
			message: 'The start state is already A (line 1).',
			at: 'A'
		});
	});

	it('warns about h values for unknown states and ignores them', () => {
		const text = 'start: A\ngoal: B\nA - B\nh: A=1, Q=4';
		expect(only(text, 'warning')).toEqual({
			message: 'h is given for Q, which is not a state of the graph; ignored.',
			at: 'Q=4'
		});
		expect(parseGraphText(text).spec!.h).toEqual({ A: 1 });
	});

	it('reports negative, non-numeric and missing h values', () => {
		const base = 'start: A\ngoal: B\nA - B\n';
		expect(only(base + 'h: A=-2')).toEqual({
			message: 'h(A) = -2 is negative. Heuristic values must be ≥ 0.',
			at: '-2'
		});
		expect(only(base + 'h: A=x, B=0')).toEqual({
			message: 'h(A) must be a number, found "x".',
			at: 'x'
		});
		expect(only(base + 'h: A 5 B 3')).toEqual({
			message: 'Expected "=" after A (write A=5).',
			at: 'A'
		});
		expect(only(base + 'h: A=, B=1').message).toBe('h(A) needs a value after "=".');
		expect(only(base + 'h: = 3').message).toBe('Expected a state name in h:, found "=".');
		expect(only(base + 'h:').message).toBe('h: needs values like A=5.');
		expect(spec(base + 'h: A=-0').h).toEqual({ A: 0 });
	});

	it('warns about repeated h values and positions; the later one is used', () => {
		const text = 'start: A\ngoal: B\nA - B\nh: A=1\nh: A=2\nat: A 0 0\nat: A 5 5';
		expect(messages(text, 'warning')).toEqual([
			'h(A) is given twice; the later value 2 is used.',
			'The position of A is given twice; the later one is used.'
		]);
		const s = parseGraphText(text).spec!;
		expect(s.h).toEqual({ A: 2 });
		expect(s.graph.nodes[0]).toEqual({ id: 'A', x: 5, y: 5 });
	});

	it('reports bad positions', () => {
		const base = 'start: A\ngoal: B\nA - B\n';
		expect(only(base + 'at: A 1 y').message).toBe(
			'Expected a number for the position of A, found "y".'
		);
		expect(only(base + 'at: A 1').message).toBe('at: needs a position for A, like "at: A 10 20".');
		expect(only(base + 'at:').message).toBe(
			'at: needs a state name and a position, like "at: A 10 20".'
		);
		expect(only(base + 'at: A 1 2 3').message).toBe('Unexpected "3" after the position.');
	});

	it('warns about duplicate edges; the later line replaces the earlier one', () => {
		const text = 'start: A\ngoal: C\nA - B 5\nB - C 1\nB - A 7';
		expect(only(text, 'warning')).toEqual({
			message: 'Edge B - A is already listed on line 3; this line replaces it.',
			at: 'B - A 7'
		});
		expect(edgeList(parseGraphText(text).spec!)).toEqual(['B-C:1', 'B-A:7']);

		const directed = 'start: A\ngoal: B\nA -> B 1\nB -> A 1\nA - B 2';
		expect(only(directed, 'warning').message).toBe(
			'Edge A - B is already listed on line 3; this line replaces it.'
		);
		expect(edgeList(parseGraphText(directed).spec!)).toEqual(['A>B:2', 'B>A:2']);
		expect(messages('start: A\ngoal: B\nA -> B 1\nB -> A 1')).toEqual([]);
	});

	it('warns about a start or goal without edges', () => {
		const text = 'start: A\ngoal: G, B\nA - B 1';
		expect(only(text, 'warning')).toEqual({ message: 'Goal state G has no edges.', at: 'G' });
		expect(only('start: S\ngoal: B\nA - B 1', 'warning')).toEqual({
			message: 'Start state S has no edges.',
			at: 'S'
		});
		expect(messages('start: S\ngoal: S', 'warning')).toEqual(['Start state S has no edges.']);
		expect(parseGraphText('start: S\ngoal: S').spec!.graph.nodes).toEqual([{ id: 'S' }]);
	});

	it('reports empty input', () => {
		for (const text of ['', '   \n\t\n', '# just a comment\n\n# another']) {
			expect(parseGraphText(text)).toEqual({
				spec: null,
				diagnostics: [
					{
						severity: 'error',
						message: 'The graph is empty. Write edges like "A - B 5", then start: and goal: lines.'
					}
				]
			});
		}
	});

	it(`accepts ${MAX_STATES} states and reports more`, () => {
		const names = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);
		const text = (n: number) => `start: s0\ngoal: s1\ns0 - s1\nnode: ${names(n).join(' ')}`;
		expect(spec(text(MAX_STATES)).graph.nodes).toHaveLength(MAX_STATES);
		expect(only(text(MAX_STATES + 1))).toEqual({
			message: 'More than 300 states. The limit is 300.',
			at: 's300'
		});
	});

	it(`accepts ${MAX_EDGES} edges and reports more`, () => {
		const lines = ['start: v0', 'goal: v1'];
		for (let i = 0; i < 60; i++)
			for (let j = 0; j < 60; j++) if (i !== j) lines.push(`v${i} -> v${j}`);
		const text = (n: number) => lines.slice(0, 2 + n).join('\n');
		expect(spec(text(MAX_EDGES)).graph.edges).toHaveLength(MAX_EDGES);
		expect(only(text(MAX_EDGES + 1))).toEqual({
			message: 'More than 3000 edges. The limit is 3000.',
			at: lines[2 + MAX_EDGES]
		});
		// Two directions per arrowless edge count as two edges.
		const pairs = ['directed', 'start: v0', 'goal: v1'];
		for (let i = 0; i < 60; i++) for (let j = i + 1; j < 60; j++) pairs.push(`v${i} v${j}`);
		expect(messages(pairs.join('\n'), 'error')).toEqual([
			'More than 3000 edges. The limit is 3000.'
		]);
	});

	it('reports arrows in a graph declared undirected, and conflicting declarations', () => {
		expect(only('undirected\nstart: A\ngoal: B\nA → B 1')).toEqual({
			message:
				'"→" makes a directed edge, but the graph is declared undirected. Use "-" or remove "undirected".',
			at: '→'
		});
		expect(only('undirected\nstart: A\ngoal: B\nA - B\ndirected')).toEqual({
			message: 'The graph is declared both directed and undirected.',
			at: 'directed'
		});
		expect(only('directed: yes\nstart: A\ngoal: B\nA - B').message).toBe(
			'Unexpected "yes" after directed.'
		);
	});

	it('reports lexical problems', () => {
		const base = 'start: A\ngoal: B\n';
		expect(only(base + 'A - "B 1')).toEqual({
			message: 'This quoted name has no closing quote (").',
			at: '"B 1'
		});
		expect(only(base + 'A - "" 1').message).toBe('Empty state name.');
		expect(only(base + 'A - B 1 ;;')).toEqual({ message: 'Unexpected character ";;".', at: ';;' });
		expect(only(base + 'A - B 1 😀').at).toBe('😀');
	});

	it('reports malformed lines', () => {
		const base = 'start: A\ngoal: B\nA - B\n';
		expect(only(base + 'start A')).toEqual({ message: 'Missing ":" after start.', at: 'start' });
		expect(only(base + 'Goal B').message).toBe('Missing ":" after Goal.');
		expect(only(base + 'Arad')).toEqual({
			message: '"Arad" is not an edge or a directive. Write edges like "A - B 5".',
			at: 'Arad'
		});
		expect(only(base + 'A ->')).toEqual({ message: 'Expected a state after "->".', at: '->' });
		expect(only(base + 'A - = 3').message).toBe('Expected a state name, found "=".');
		expect(only(base + ': A').message).toBe('Expected a state name, found ":".');
		expect(only(base + 'node:').message).toBe('node: needs a state name.');
		expect(only(base + 'goals:').message).toBe('goals: needs a state name.');
		expect(only(base + 'start:').message).toBe('start: needs a state name.');
		expect(only(base + 'goal: A = B').message).toBe(
			'Unexpected "=". Separate state names with commas.'
		);
	});

	it('returns a null spec exactly when there is an error', () => {
		for (const text of ['start: A\ngoal: B\nA - B -1', 'start: A\ngoal: B\nA - B\nh: Q=1']) {
			const { spec: s, diagnostics } = parseGraphText(text);
			expect(s === null).toBe(diagnostics.some((d) => d.severity === 'error'));
		}
	});

	it('lists located diagnostics in text order, then the rest; spans have source null', () => {
		const text = 'goal: G\nnope: 1\nA - B -1\nA - A';
		const ds = parseGraphText(text).diagnostics;
		expect(ds.map((d) => d.message)).toEqual([
			'Goal state G has no edges.',
			'Unknown directive "nope:". Expected start:, goal:, h:, at:, node:, directed, or undirected.',
			'Negative cost -1. Step costs must be ≥ 0.',
			'Self-loop on A: this edge leads back to the same state.',
			'No start state. Add a line like "start: A".'
		]);
		for (const d of ds) if (d.span) expect(d.span.source).toBeNull();
	});
});

describe('formatGraphText', () => {
	const small: GraphProblemSpec = {
		graph: {
			directed: false,
			nodes: [{ id: 'S' }, { id: 'G' }, { id: 'A' }, { id: 'Lone' }],
			edges: [
				{ from: 'S', to: 'A', cost: 2 },
				{ from: 'A', to: 'G', cost: 1 / 3 }
			]
		},
		start: 'S',
		goals: ['G'],
		h: { S: 2, A: 0.25, G: 0, Nowhere: 9 }
	};

	it('writes the canonical text', () => {
		expect(formatGraphText(small)).toBe(
			[
				'undirected',
				'start: S',
				'goal: G',
				'S - A 2',
				'A - G 0.333',
				'node: Lone',
				'h: S=2, G=0, A=0.25'
			].join('\n')
		);
	});

	it('writes directed edges with arrows, several goals, quoted names and trimmed numbers', () => {
		const s: GraphProblemSpec = {
			graph: {
				directed: true,
				nodes: [{ id: 'my start' }, { id: 'G1' }, { id: 'say "hi"' }, { id: 'a\\b' }],
				edges: [
					{ from: 'my start', to: 'G1', cost: 7.0000001 },
					{ from: 'my start', to: 'say "hi"', cost: 2.5 },
					{ from: 'my start', to: 'a\\b', cost: -0 },
					{ from: 'a\\b', to: 'G1', cost: 1e-7 }
				]
			},
			start: 'my start',
			goals: ['G1', 'say "hi"']
		};
		const text = formatGraphText(s);
		expect(text).toBe(
			[
				'directed',
				'start: "my start"',
				'goal: G1, "say \\"hi\\""',
				'"my start" -> G1 7',
				'"my start" -> "say \\"hi\\"" 2.5',
				'"my start" -> "a\\\\b" 0',
				'"a\\\\b" -> G1 0'
			].join('\n')
		);
		expect(ids(parseGraphText(text).spec!)).toEqual(ids(s));
	});

	it('writes six h values per line in graph order', () => {
		const nodes = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}` }));
		const s: GraphProblemSpec = {
			graph: { directed: false, nodes, edges: [{ from: 'n0', to: 'n1', cost: 1 }] },
			start: 'n0',
			goals: ['n1'],
			h: Object.fromEntries(nodes.map((n, i) => [n.id, 7 - i]).reverse())
		};
		const hLines = formatGraphText(s)
			.split('\n')
			.filter((l) => l.startsWith('h:'));
		expect(hLines).toEqual(['h: n0=7, n1=6, n2=5, n3=4, n4=3, n5=2', 'h: n6=1, n7=0']);
	});

	it('writes at: lines only with positions, for nodes that have x and y', () => {
		const s: GraphProblemSpec = {
			graph: {
				directed: false,
				nodes: [
					{ id: 'A', x: 1.5, y: -2 },
					{ id: 'B', x: 3 },
					{ id: 'C', x: 0, y: 0 }
				],
				edges: [
					{ from: 'A', to: 'B', cost: 1 },
					{ from: 'B', to: 'C', cost: 1 }
				]
			},
			start: 'A',
			goals: ['C']
		};
		expect(formatGraphText(s)).not.toContain('at:');
		expect(formatGraphText(s, { positions: true }).split('\n').slice(-2)).toEqual([
			'at: A 1.5 -2',
			'at: C 0 0'
		]);
	});

	it('declares the node order before start: when first appearance would change it', () => {
		const text = formatGraphText(builtins.ASTAR_WRONG_PROBLEM);
		expect(text.split('\n').slice(0, 4)).toEqual([
			'directed',
			'node: S, A, B, C, G',
			'start: S',
			'goal: G'
		]);
		expect(formatGraphText(builtins.TINY_PROBLEM).split('\n').slice(1, 3)).toEqual([
			'node: S, a, b, c, d, e',
			'node: f, G, h, p, q, r'
		]);
	});

	it('writes hLabel as a first-line comment on one line', () => {
		const text = formatGraphText({ ...small, hLabel: 'Two\nlines  here' });
		expect(text.split('\n')[0]).toBe('# h: Two lines here');
		expect(parseGraphText(text).spec!.hLabel).toBe('Two lines here');
		expect(formatGraphText({ ...small, hLabel: '  ' }).split('\n')[0]).toBe('undirected');
	});

	it('writes the Romania problem as the lecture map', () => {
		const lines = formatGraphText(builtins.ROMANIA_PROBLEM, { positions: true }).split('\n');
		expect(lines.slice(0, 2)).toEqual(['# h: Straight-line distance to Bucharest', 'undirected']);
		expect(lines).toContain('Sibiu - "Rimnicu Vilcea" 80');
		expect(lines).toContain(
			'h: Oradea=380, Pitesti=100, "Rimnicu Vilcea"=193, Sibiu=253, Timisoara=329, Urziceni=80'
		);
		expect(lines).toContain('at: "Rimnicu Vilcea" 403 452');
		expect(lines).toHaveLength(2 + 4 + 2 + 23 + 4 + 20);
	});

	it('round-trips every builtin problem and graph', () => {
		const specs: [string, GraphProblemSpec][] = [];
		for (const [name, value] of Object.entries(builtins)) {
			if (typeof value !== 'object' || value === null) continue;
			if ('graph' in value) specs.push([name, value as GraphProblemSpec]);
			else if ('edges' in value) {
				const graph = value as WeightedGraph;
				const last = graph.nodes[graph.nodes.length - 1].id;
				specs.push([name, { graph, start: graph.nodes[0].id, goals: [last] }]);
			}
		}
		expect(specs.map(([name]) => name)).toEqual(
			expect.arrayContaining([
				'ROMANIA_PROBLEM',
				'ROMANIA_IASI_FAGARAS',
				'TINY_GRAPH',
				'BINARY_TREE'
			])
		);
		expect(specs.length).toBeGreaterThanOrEqual(11);
		for (const [name, s] of specs) {
			const { spec: back, diagnostics } = parseGraphText(formatGraphText(s, { positions: true }));
			expect(diagnostics, name).toEqual([]);
			expect(back, name).toStrictEqual(JSON.parse(JSON.stringify(s)));
		}
	});

	it('round-trips random specs with names that look like directives, numbers or operators', () => {
		const NAMES = [
			'A',
			'b',
			'start',
			'goal',
			'h',
			'at',
			'node',
			'directed',
			'undirected',
			'5',
			'1.5',
			'.5',
			"'",
			'St.',
			'Rimnicu Vilcea',
			'a"b',
			'c\\d',
			'#x',
			'x-y',
			'p->q',
			'k:v',
			'm,n',
			'e=f',
			'→',
			'Ω',
			'q10',
			'q2',
			'__proto__',
			'constructor',
			' pad ',
			'0',
			'١٢'
		];
		let a = 1;
		const random = () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const int = (n: number) => Math.floor(random() * n);
		for (let round = 0; round < 1500; round++) {
			const pool = [...NAMES].sort(() => random() - 0.5).slice(0, 1 + int(8));
			const directed = random() < 0.5;
			const seen = new Set<string>();
			const edges = [];
			for (let k = int(10); k > 0; k--) {
				const from = pool[int(pool.length)];
				const to = pool[int(pool.length)];
				const key = directed || from < to ? `${from}\0${to}` : `${to}\0${from}`;
				if (seen.has(key)) continue; // the text format has no parallel edges
				seen.add(key);
				edges.push({ from, to, cost: [0, 1, 2.5, 0.125, 1000, 3.333][int(6)] });
			}
			const s: GraphProblemSpec = {
				graph: {
					directed,
					nodes: pool.map((id) =>
						random() < 0.5 ? { id, x: int(200) - 50 + [0, 0.5, 0.25][int(3)], y: int(200) } : { id }
					),
					edges
				},
				start: pool[int(pool.length)],
				goals: pool.filter((_, i) => i === 0 || random() < 0.3)
			};
			const h = pool.filter(() => random() < 0.6).map((id) => [id, int(9) + [0, 0.5][int(2)]]);
			if (h.length) s.h = Object.fromEntries(h);
			if (random() < 0.3) s.hLabel = ['Straight-line distance', 'h: odd # label'][int(2)];
			const text = formatGraphText(s, { positions: true });
			const { spec: back, diagnostics } = parseGraphText(text);
			expect(
				diagnostics.filter((d) => d.severity === 'error'),
				text
			).toEqual([]);
			expect(back, text).toStrictEqual(JSON.parse(JSON.stringify(s)));
			expect(formatGraphText(back!, { positions: true })).toBe(text);
		}
	});

	it('is stable on parsed text: formatting a parsed spec again gives the same text', () => {
		const text = 'A - B 2\nB -> C 1.5\nC - A\nstart: A\ngoal: C\nnode: Z\nh: B=1\nat: A 0 0';
		const once = formatGraphText(spec(text), { positions: true });
		const twice = formatGraphText(spec(once), { positions: true });
		expect(twice).toBe(once);
		expect(spec(once)).toEqual(spec(text));
	});
});

describe('highlightGraphText', () => {
	const classes = (text: string) =>
		highlightGraphText(text).map((t) => [text.slice(t.from, t.to), t.className]);

	it('classifies directives, names, numbers, operators, strings, punctuation and comments', () => {
		expect(classes('Start: A # the start')).toEqual([
			['Start', 'hl-keyword'],
			[':', 'hl-punct'],
			['A', 'hl-name'],
			['# the start', 'hl-comment']
		]);
		expect(classes('A - "B c": 5')).toEqual([
			['A', 'hl-name'],
			['-', 'hl-operator'],
			['"B c"', 'hl-string'],
			[':', 'hl-punct'],
			['5', 'hl-number']
		]);
		expect(classes('S → d\nh: S=2, d=-1\nat: S -3 4\ndirected\ngoal: a, b')).toEqual([
			['S', 'hl-name'],
			['→', 'hl-operator'],
			['d', 'hl-name'],
			['h', 'hl-keyword'],
			[':', 'hl-punct'],
			['S', 'hl-name'],
			['=', 'hl-operator'],
			['2', 'hl-number'],
			[',', 'hl-punct'],
			['d', 'hl-name'],
			['=', 'hl-operator'],
			['-', 'hl-number'],
			['1', 'hl-number'],
			['at', 'hl-keyword'],
			[':', 'hl-punct'],
			['S', 'hl-name'],
			['-', 'hl-number'],
			['3', 'hl-number'],
			['4', 'hl-number'],
			['directed', 'hl-keyword'],
			['goal', 'hl-keyword'],
			[':', 'hl-punct'],
			['a', 'hl-name'],
			[',', 'hl-punct'],
			['b', 'hl-name']
		]);
	});

	it('reads numbers as names where a state is expected', () => {
		expect(classes('1 -> 2 3')).toEqual([
			['1', 'hl-name'],
			['->', 'hl-operator'],
			['2', 'hl-name'],
			['3', 'hl-number']
		]);
	});

	it('leaves unknown directives and unexpected characters plain', () => {
		expect(classes('goa: B\nA - B ; # c')).toEqual([
			['A', 'hl-name'],
			['-', 'hl-operator'],
			['B', 'hl-name'],
			['# c', 'hl-comment']
		]);
		expect(highlightGraphText('')).toEqual([]);
	});

	it('returns ascending, non-overlapping ranges', () => {
		const text = formatGraphText(builtins.ROMANIA_PROBLEM, { positions: true });
		const tokens = highlightGraphText(text);
		expect(tokens.length).toBeGreaterThan(300);
		for (let i = 0; i < tokens.length; i++) {
			expect(tokens[i].from).toBeLessThan(tokens[i].to);
			if (i) expect(tokens[i].from).toBeGreaterThanOrEqual(tokens[i - 1].to);
		}
	});
});

describe('robustness', () => {
	/** Deterministic pseudo-random numbers (mulberry32). */
	function rng(seed: number) {
		return () => {
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	const PIECES = [
		'A',
		'B',
		'S',
		'G',
		'x1',
		'Zürich',
		'"q r"',
		'"',
		'\\',
		'#',
		'-',
		'--',
		'->',
		'→',
		':',
		',',
		'=',
		'5',
		'-3',
		'2.5',
		'.',
		"'",
		'start:',
		'goal:',
		'goals:',
		'h:',
		'at:',
		'node:',
		'directed',
		'undirected',
		'start',
		' ',
		' ',
		'\t',
		'\n',
		'\n',
		'\r\n',
		'😀',
		'(',
		']',
		'1e5',
		'NaN',
		'-',
		'"\\"'
	];

	it('never throws on random input and always explains a null spec', () => {
		const next = rng(450);
		for (let round = 0; round < 1500; round++) {
			const n = Math.floor(next() * 40);
			let text = '';
			for (let i = 0; i < n; i++) text += PIECES[Math.floor(next() * PIECES.length)];
			if (round % 3 === 0) text = `start: S\ngoal: G\nS - G 1\n${text}`;
			const { spec: s, diagnostics } = parseGraphText(text);
			expect(s === null).toBe(diagnostics.some((d) => d.severity === 'error'));
			for (const d of diagnostics) {
				expect(d.message).toMatch(/\S/);
				if (!d.span) continue;
				expect(d.span.start).toBeGreaterThanOrEqual(0);
				expect(d.span.end).toBeLessThanOrEqual(text.length);
				expect(d.span.start).toBeLessThanOrEqual(d.span.end);
			}
			let last = 0;
			for (const t of highlightGraphText(text)) {
				expect(t.from).toBeGreaterThanOrEqual(last);
				expect(t.to).toBeGreaterThan(t.from);
				last = t.to;
			}
			expect(last).toBeLessThanOrEqual(text.length);
			if (s) expect(parseGraphText(formatGraphText(s, { positions: true })).spec).not.toBeNull();
		}
	});

	it(`parses and highlights a graph at the limits quickly`, () => {
		const lines = ['start: n0', 'goal: n299'];
		for (let i = 0; i < MAX_STATES; i++) {
			for (let j = 1; j <= 10; j++)
				lines.push(`n${i} - n${(i + j * 7) % MAX_STATES} ${(i * j) % 97}`);
		}
		lines.push('h: ' + Array.from({ length: MAX_STATES }, (_, i) => `n${i}=${i % 50}`).join(', '));
		const text = lines.join('\n');
		parseGraphText(text); // warm up
		const t0 = performance.now();
		const { spec: s } = parseGraphText(text);
		highlightGraphText(text);
		const elapsed = performance.now() - t0;
		expect(s!.graph.nodes).toHaveLength(MAX_STATES);
		expect(s!.graph.edges).toHaveLength(MAX_EDGES);
		expect(elapsed).toBeLessThan(250);
	});
});
