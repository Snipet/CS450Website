import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { parseGraphText, TINY_PROBLEM, ASTAR_WRONG_PROBLEM } from '$lib/theory/graphs';
import { COMPLEXITY_SYMBOLS, STRATEGY_PROPERTIES } from '$lib/theory/search';
import {
	ASTAR_WRONG_TEXT,
	COMPLEXITIES,
	DECK_ROWS,
	GRID_EXAMPLE,
	GRID_HEURISTIC_ROWS,
	GRID_MOVES_4,
	GRID_MOVES_8,
	PUZZLE_VALUES,
	RESULT_EXAMPLE,
	ROMANIA_SIZE,
	SECTIONS,
	SIBIU,
	SNAPSHOTS,
	STEP_EXAMPLE_DEFS,
	STRATEGY_ORDER,
	STRATEGY_ROWS,
	SYMBOLS,
	TINY_TEXT,
	COMPONENTS,
	TERMS,
	allCitations,
	citationExists,
	codeParts,
	highlightSegments,
	mathParts,
	diagnosticExamples,
	linkable,
	runSearch,
	runTitle,
	snapshotStep,
	stepExamples,
	traceChecks
} from './notation';

describe('sections', () => {
	it('have unique ids and titles', () => {
		expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
		expect(new Set(SECTIONS.map((s) => s.title)).size).toBe(SECTIONS.length);
	});
});

describe('citations', () => {
	it('every cited slide exists in its deck', () => {
		const all = allCitations();
		expect(all.length).toBeGreaterThan(40);
		for (const c of all) expect(citationExists(c), JSON.stringify(c)).toBe(true);
	});

	it('citationExists rejects slides past the end of a deck and reversed ranges', () => {
		expect(citationExists({ deck: 'agents', slide: decks.agents.slides })).toBe(true);
		expect(citationExists({ deck: 'agents', slide: decks.agents.slides + 1 })).toBe(false);
		expect(citationExists({ deck: 'informed', slide: [0, 3] })).toBe(false);
		expect(citationExists({ deck: 'informed', slide: [9, 4] })).toBe(false);
		expect(citationExists({ deck: 'informed' })).toBe(true);
	});

	it('lists every deck in lecture order with its title', () => {
		expect(DECK_ROWS.map((d) => d.id)).toEqual([
			'intro',
			'agents',
			'search',
			'uninformed',
			'informed'
		]);
		expect(DECK_ROWS[3].example).toBe('Uninformed Search · slide 2');
	});
});

describe('search problems', () => {
	it('list the five components of slide 5 with the Romania example', () => {
		expect(COMPONENTS.map((c) => c.name)).toEqual([
			'Initial state',
			'Actions',
			'Transition model',
			'Goal state',
			'Path cost'
		]);
		expect(COMPONENTS[0].romania).toBe('Arad');
	});

	it('never call the frontier a fringe or an open list', () => {
		for (const t of TERMS) expect(t.meaning).not.toMatch(/fringe|open list/i);
	});
});

describe('codeParts', () => {
	it('splits text at backticks', () => {
		expect(codeParts('uses `->` here')).toEqual([
			{ text: 'uses ', code: false },
			{ text: '->', code: true },
			{ text: ' here', code: false }
		]);
		expect(codeParts('`#`')).toEqual([{ text: '#', code: true }]);
		expect(codeParts('plain')).toEqual([{ text: 'plain', code: false }]);
	});
});

describe('mathParts', () => {
	it('subscripts the index of h1, h2, and hm', () => {
		expect(mathParts('h2(n) ≥ h1(n)')).toEqual([
			{ text: 'h' },
			{ text: '2', sub: true },
			{ text: '(n) ≥ h' },
			{ text: '1', sub: true },
			{ text: '(n)' }
		]);
		expect(mathParts('max{h1(n), …, hm(n)}').filter((p) => p.sub)).toEqual([
			{ text: '1', sub: true },
			{ text: 'm', sub: true }
		]);
	});

	it('leaves other text alone', () => {
		expect(mathParts('f(n) = g(n) + h(n)')).toEqual([{ text: 'f(n) = g(n) + h(n)' }]);
		expect(mathParts('h*(n)')).toEqual([{ text: 'h*(n)' }]);
		expect(mathParts('')).toEqual([]);
	});
});

describe('symbols', () => {
	it('include every symbol of the strategy tables', () => {
		const written = SYMBOLS.map((s) => s.symbol);
		for (const { symbol } of COMPLEXITY_SYMBOLS) expect(written).toContain(symbol);
		for (const s of ['ε', 'h(n)', 'h*(n)', 'f(n) = g(n) + h(n)', 'α', 'h1(n), h2(n)'])
			expect(written).toContain(s);
	});

	it('list every complexity class used in the properties table', () => {
		const written = new Set(COMPLEXITIES.map((c) => c.written));
		for (const row of STRATEGY_PROPERTIES) {
			for (const text of [row.time, row.space]) {
				for (const m of text.matchAll(/O\([^)]*\)/g)) expect(written).toContain(m[0]);
			}
		}
	});
});

describe('strategies', () => {
	it('have one row each, with the frontier structures of the lectures', () => {
		expect(STRATEGY_ROWS.map((r) => r.id)).toEqual(STRATEGY_ORDER);
		const byId = Object.fromEntries(STRATEGY_ROWS.map((r) => [r.id, r]));
		expect(byId.bfs.frontier).toBe('FIFO queue');
		expect(byId.dfs.frontier).toBe('LIFO queue');
		expect(byId.ucs.frontier).toBe('Priority queue ordered by g(n)');
		expect(byId.astar.short).toBe('A*');
	});

	it('annotate the Sibiu node as the slides do', () => {
		expect(SIBIU.g).toBe(140);
		expect(SIBIU.h).toBe(253);
		const notes = Object.fromEntries(STRATEGY_ROWS.map((r) => [r.id, r.annotation]));
		expect(notes).toEqual({
			bfs: '',
			dfs: '',
			dls: '',
			ids: '',
			ucs: '140',
			greedy: '253',
			astar: '393=140+253',
			wastar: '646=140+2·253'
		});
	});
});

describe('runs', () => {
	it('titles name the strategy, the mode, and the problem', () => {
		expect(runTitle({ problem: 'romania', options: { strategy: 'astar' } })).toBe(
			'A* tree search on Romania'
		);
		expect(runTitle({ problem: 'romania', options: { strategy: 'dfs', mode: 'path' } })).toBe(
			'DFS with the path check on Romania'
		);
		expect(runTitle({ problem: 'binary', options: { strategy: 'ids' } })).toBe(
			'IDS on the binary tree'
		);
		expect(runTitle({ problem: 'binary', options: { strategy: 'dls', depthLimit: 1 } })).toBe(
			'DLS (limit 1) on the binary tree'
		);
		expect(
			runTitle({
				problem: 'tiny',
				options: { strategy: 'bfs', mode: 'graph', goalTest: 'generate' }
			})
		).toBe('BFS graph search (goal test at generation) on the tiny search problem');
	});

	it('are linkable only when a search-tool link can reproduce them', () => {
		expect(linkable({ problem: 'romania', options: { strategy: 'ucs', mode: 'graph' } })).toBe(
			true
		);
		expect(linkable({ problem: 'binary', options: { strategy: 'dls', depthLimit: 1 } })).toBe(
			false
		);
		expect(linkable({ problem: 'tiny', options: { strategy: 'bfs', goalTest: 'generate' } })).toBe(
			false
		);
	});

	it('are computed once', () => {
		const run = { problem: 'tiny' as const, options: { strategy: 'bfs' as const } };
		expect(runSearch(run)).toBe(runSearch({ ...run }));
	});
});

describe('step examples', () => {
	const examples = Object.fromEntries(stepExamples().map((e) => [e.id, e]));

	it('find a step for every example', () => {
		expect(Object.keys(examples)).toHaveLength(STEP_EXAMPLE_DEFS.length);
		for (const e of Object.values(examples)) {
			expect(e.step, e.id).toBeGreaterThanOrEqual(0);
			expect(e.sentence, e.id).not.toBe('');
		}
	});

	it('use the lecture wording (§3.3)', () => {
		expect(examples.init.sentence).toBe('Initialize the frontier with Arad.');
		expect(examples['expand-f'].sentence).toBe(
			'Take Sibiu off the frontier (f = 393). Not a goal; expand it: Arad, Fagaras, Oradea, Rimnicu Vilcea.'
		);
		expect(examples.goal.sentence).toBe(
			'Take Bucharest off the frontier. It contains the goal state: return the solution Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418).'
		);
		expect(examples.explored.sentence).toContain('Arad is in the explored set; not added.');
		expect(examples.cutoff.sentence).toBe(
			'Take B off the frontier. Not a goal. B is at the depth limit 1; not expanded.'
		);
		expect(examples['ids-next'].sentence).toBe(
			'The frontier is empty and nodes were cut off at the depth limit 1: start again with depth limit 2.'
		);
		expect(examples.replaced.sentence).toContain(
			'Bucharest (path cost 418) replaces Bucharest (path cost 450) on the frontier.'
		);
		expect(examples['on-path'].sentence).toContain('Arad is already on this path; not added.');
		expect(examples.frontier.sentence).toContain(
			'Oradea is already on the frontier with a lower path cost (146); not added.'
		);
		expect(examples.exhausted.sentence).toBe(
			'The frontier is empty: return failure (no solution).'
		);
		expect(examples['goal-generate'].sentence).toContain('(tested when generated)');
		expect(examples['dls-fail'].sentence).toContain('no solution within the limit');
		expect(examples.leaf.sentence).toContain('Not a goal, and it has no successors.');
	});

	it('summarize a finished search', () => {
		expect(RESULT_EXAMPLE.text).toBe(
			'Solution: Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418). 6 nodes taken off the frontier, 5 expanded, 16 generated.'
		);
	});
});

describe('snapshots', () => {
	it('each pick a step of their run', () => {
		for (const s of SNAPSHOTS) {
			const step = snapshotStep(s);
			expect(step, s.id).toBeGreaterThanOrEqual(0);
			expect(step).toBeLessThan(runSearch(s.run).steps.length);
		}
	});
});

describe('slide traces', () => {
	it('are reproduced by the default conventions', () => {
		const checks = traceChecks();
		expect(checks.map((c) => c.id)).toEqual(['bfs', 'dfs', 'ucs', 'ids', 'romania']);
		for (const c of checks) expect(c.matches, `${c.id}: ${c.produced}`).toBe(true);
	});

	it('report a mismatch', () => {
		const [bfs] = traceChecks();
		expect(bfs.produced.startsWith('S,d,e,p')).toBe(true);
		const wrong = traceChecks([
			{
				id: 'x',
				label: 'x',
				run: { problem: 'tiny', options: { strategy: 'bfs' } },
				slide: '',
				expected: 'S',
				read: (r) => r.order.join(','),
				cite: { deck: 'uninformed', slide: 4 }
			}
		]);
		expect(wrong[0].matches).toBe(false);
	});
});

describe('graph text', () => {
	it('examples parse back to the lecture problems', () => {
		const tiny = parseGraphText(TINY_TEXT);
		expect(tiny.diagnostics).toEqual([]);
		expect(tiny.spec?.graph.edges).toEqual(TINY_PROBLEM.graph.edges);
		expect(tiny.spec?.graph.directed).toBe(true);
		const wrong = parseGraphText(ASTAR_WRONG_TEXT);
		expect(wrong.spec?.h).toEqual(ASTAR_WRONG_PROBLEM.h);
	});

	it('highlight segments cover the text exactly', () => {
		const segs = highlightSegments(TINY_TEXT);
		expect(segs.map((s) => s.text).join('')).toBe(TINY_TEXT);
		expect(segs.find((s) => s.text === 'directed')?.className).toBe('hl-keyword');
		expect(segs.find((s) => s.text === '->')?.className).toBe('hl-operator');
		expect(highlightSegments('')).toEqual([]);
	});

	it('diagnostic examples each produce a message', () => {
		const examples = diagnosticExamples();
		for (const e of examples) {
			expect(e.diagnostic, e.line).not.toBeNull();
			expect(e.diagnostic!.message.length).toBeGreaterThan(10);
		}
		const severities = new Set(examples.map((e) => e.diagnostic!.severity));
		expect(severities).toEqual(new Set(['error', 'warning', 'info']));
		expect(examples[0].diagnostic!.message).toContain('Unknown directive "strat:"');
		const byLine = Object.fromEntries(examples.map((e) => [e.line, e.diagnostic!.message]));
		expect(byLine['A - B -3']).toContain('Negative cost');
		expect(byLine['Rimnicu Vilcea - B 5']).toContain('Names with spaces need quotes');
		expect(byLine['start: A']).toContain('No goal state');
	});
});

describe('agents and problems', () => {
	it('size the Romania state space from the map', () => {
		expect(ROMANIA_SIZE).toEqual({ states: 20, roads: 23 });
	});
});

describe('8-puzzle', () => {
	it('reproduces the slide 32 values', () => {
		expect(PUZZLE_VALUES.h1).toBe(8);
		expect(PUZZLE_VALUES.h2).toBe(18);
		expect(PUZZLE_VALUES.h2Terms).toBe('3+1+2+2+2+3+3+2');
	});
});

describe('grid', () => {
	it('lists the moves clockwise from Up', () => {
		expect(GRID_MOVES_4).toEqual(['Up', 'Right', 'Down', 'Left']);
		expect(GRID_MOVES_8[0]).toBe('Up');
		expect(GRID_MOVES_8).toHaveLength(8);
	});

	it('computes each heuristic for the example offset', () => {
		expect(GRID_EXAMPLE).toEqual({ dx: 3, dy: 2 });
		const ex = Object.fromEntries(GRID_HEURISTIC_ROWS.map((r) => [r.id, r.example]));
		expect(ex).toEqual({
			manhattan: '5',
			euclidean: '3.61',
			octile: '3.83',
			chebyshev: '3',
			zero: '0'
		});
		const manhattan = GRID_HEURISTIC_ROWS.find((r) => r.id === 'manhattan')!;
		expect([manhattan.admissible4, manhattan.admissible8]).toEqual([true, false]);
	});
});
