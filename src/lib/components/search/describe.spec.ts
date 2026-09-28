import { describe, expect, it } from 'vitest';
import {
	ASTAR_WRONG_PROBLEM,
	BINARY_TREE_PROBLEM,
	ROMANIA_PROBLEM,
	TINY_PROBLEM,
	graphProblem,
	type GraphProblemSpec
} from '$lib/theory/graphs';
import { search, type SearchOptions, type StrategyId } from '$lib/theory/search';
import {
	annotationText,
	defaultAnnotation,
	describeResult,
	describeStep,
	formatCount,
	formatNumber,
	priorityLabel,
	priorityPhrase,
	prioritySymbol,
	queueName,
	strategyName,
	strategyShort
} from './describe';

const run = (spec: GraphProblemSpec, options: SearchOptions) => search(graphProblem(spec), options);
const sentences = (spec: GraphProblemSpec, options: SearchOptions) => {
	const r = run(spec, options);
	return r.steps.map((_, i) => describeStep(r, i));
};

const ALL: StrategyId[] = ['bfs', 'dfs', 'dls', 'ids', 'ucs', 'greedy', 'astar', 'wastar'];

describe('names', () => {
	it('strategy names and short forms (§3.1)', () => {
		expect(ALL.map(strategyName)).toEqual([
			'Breadth-first search',
			'Depth-first search',
			'Depth-limited search',
			'Iterative deepening search',
			'Uniform-cost search',
			'Greedy best-first search',
			'A* search',
			'Weighted A* search'
		]);
		expect(ALL.map(strategyShort)).toEqual([
			'BFS',
			'DFS',
			'DLS',
			'IDS',
			'UCS',
			'Greedy',
			'A*',
			'Weighted A*'
		]);
	});

	it('queue names', () => {
		expect(ALL.map(queueName)).toEqual([
			'FIFO queue',
			'LIFO queue',
			'LIFO queue',
			'LIFO queue',
			'Priority queue ordered by g(n)',
			'Priority queue ordered by h(n)',
			'Priority queue ordered by f(n) = g(n) + h(n)',
			'Priority queue ordered by g(n) + α·h(n)'
		]);
	});

	it('priority symbols and default annotations', () => {
		expect(ALL.map(prioritySymbol)).toEqual([null, null, null, null, 'g', 'h', 'f', 'f']);
		expect(ALL.map(defaultAnnotation)).toEqual([
			'none',
			'none',
			'none',
			'none',
			'g',
			'h',
			'fgh',
			'fgh'
		]);
	});
});

describe('numbers', () => {
	it('formats integers plainly and other numbers with up to two decimals', () => {
		expect(formatNumber(418)).toBe('418');
		expect(formatNumber(0)).toBe('0');
		expect(formatNumber(-0.001)).toBe('0');
		expect(formatNumber(Math.SQRT2)).toBe('1.41');
		expect(formatNumber(2.5)).toBe('2.5');
		expect(formatNumber(1 + 2 * Math.SQRT2)).toBe('3.83');
		expect(formatNumber(Infinity)).toBe('∞');
		expect(formatNumber(-Infinity)).toBe('−∞');
		expect(formatNumber(NaN)).toBe('–');
		expect(formatCount(10000)).toBe('10,000');
		expect(formatCount(7)).toBe('7');
	});
});

describe('node labels (Informed Search, slides 17–22)', () => {
	const astar = run(ROMANIA_PROBLEM, { strategy: 'astar' });
	const labels = (step: number, s: StrategyId = 'astar') =>
		astar.steps[step].children.map((id) => priorityLabel(s, astar.nodes[id]));

	it('A* writes f=g+h under each node', () => {
		expect(labels(1)).toEqual(['393=140+253', '447=118+329', '449=75+374']);
		expect(labels(2)).toEqual(['646=280+366', '415=239+176', '671=291+380', '413=220+193']);
		expect(labels(5)).toEqual(['418=418+0', '615=455+160', '607=414+193']);
		expect(priorityLabel('astar', astar.nodes[0])).toBe('366=0+366');
	});

	it('UCS writes g, greedy writes h, BFS and DFS nothing', () => {
		const sibiu = astar.nodes[astar.steps[1].children[0]];
		expect(priorityLabel('ucs', sibiu)).toBe('140');
		expect(priorityLabel('greedy', sibiu)).toBe('253');
		expect(priorityLabel('bfs', sibiu)).toBe('');
		expect(priorityLabel('dfs', sibiu)).toBe('');
		expect(priorityLabel('ids', sibiu)).toBe('');
	});

	it('weighted A* writes the weighted sum', () => {
		const w = run(ROMANIA_PROBLEM, { strategy: 'wastar', weight: 2 });
		const sibiu = w.nodes[w.steps[1].children[0]];
		expect(priorityLabel('wastar', sibiu, 2)).toBe('646=140+2·253');
		expect(priorityLabel('wastar', sibiu, 1.5)).toBe('519.5=140+1.5·253');
		expect(annotationText(sibiu, 'fgh', 'wastar', 2)).toBe('646=140+2·253');
		expect(annotationText(sibiu, 'f', 'wastar', 2)).toBe('646');
		expect(priorityPhrase('wastar', sibiu, 2)).toBe('f = 646');
	});

	it('annotations', () => {
		const sibiu = astar.nodes[astar.steps[1].children[0]];
		expect(annotationText(sibiu, 'none', 'astar')).toBe('');
		expect(annotationText(sibiu, 'g', 'astar')).toBe('140');
		expect(annotationText(sibiu, 'h', 'astar')).toBe('253');
		expect(annotationText(sibiu, 'f', 'astar')).toBe('393');
		expect(annotationText(sibiu, 'fgh', 'astar')).toBe('393=140+253');
		// No heuristic: h is left blank, f is g.
		const bfs = run(TINY_PROBLEM, { strategy: 'bfs' });
		const d = bfs.nodes[1];
		expect(annotationText(d, 'h', 'bfs')).toBe('');
		expect(annotationText(d, 'f', 'bfs')).toBe('3');
		expect(annotationText(d, 'fgh', 'ucs')).toBe('3=3+0');
	});

	it('priority phrases', () => {
		const sibiu = astar.nodes[astar.steps[1].children[0]];
		expect(priorityPhrase('astar', sibiu)).toBe('f = 393');
		expect(priorityPhrase('ucs', sibiu)).toBe('g = 140');
		expect(priorityPhrase('greedy', sibiu)).toBe('h = 253');
		expect(priorityPhrase('bfs', sibiu)).toBeNull();
	});
});

describe('describeStep (golden, §3.3)', () => {
	it('A* on Romania (Informed Search, slides 17–22)', () => {
		expect(sentences(ROMANIA_PROBLEM, { strategy: 'astar' })).toEqual([
			'Initialize the frontier with Arad.',
			'Take Arad off the frontier (f = 366). Not a goal; expand it: Sibiu, Timisoara, Zerind.',
			'Take Sibiu off the frontier (f = 393). Not a goal; expand it: Arad, Fagaras, Oradea, Rimnicu Vilcea.',
			'Take Rimnicu Vilcea off the frontier (f = 413). Not a goal; expand it: Craiova, Pitesti, Sibiu.',
			'Take Fagaras off the frontier (f = 415). Not a goal; expand it: Bucharest, Sibiu.',
			'Take Pitesti off the frontier (f = 417). Not a goal; expand it: Bucharest, Craiova, Rimnicu Vilcea.',
			'Take Bucharest off the frontier. It contains the goal state: return the solution Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418).'
		]);
	});

	it('greedy best-first on Romania (Informed Search, slides 8–11)', () => {
		expect(sentences(ROMANIA_PROBLEM, { strategy: 'greedy' })).toEqual([
			'Initialize the frontier with Arad.',
			'Take Arad off the frontier (h = 366). Not a goal; expand it: Sibiu, Timisoara, Zerind.',
			'Take Sibiu off the frontier (h = 253). Not a goal; expand it: Arad, Fagaras, Oradea, Rimnicu Vilcea.',
			'Take Fagaras off the frontier (h = 176). Not a goal; expand it: Bucharest, Sibiu.',
			'Take Bucharest off the frontier. It contains the goal state: return the solution Arad → Sibiu → Fagaras → Bucharest (cost 450).'
		]);
	});

	it('UCS graph search on Romania: explored set, frontier check, replacement', () => {
		const s = sentences(ROMANIA_PROBLEM, { strategy: 'ucs', mode: 'graph' });
		expect(s[1]).toBe(
			'Take Arad off the frontier (g = 0). Not a goal; expand it: Sibiu, Timisoara, Zerind.'
		);
		expect(s[2]).toBe(
			'Take Zerind off the frontier (g = 75). Not a goal; expand it: Arad, Oradea. Arad is in the explored set; not added.'
		);
		expect(s[4]).toBe(
			'Take Sibiu off the frontier (g = 140). Not a goal; expand it: Arad, Fagaras, Oradea, Rimnicu Vilcea. Arad is in the explored set; not added. Oradea is already on the frontier with a lower path cost (146); not added.'
		);
		expect(s[5]).toBe(
			'Take Oradea off the frontier (g = 146). Not a goal; expand it: Sibiu, Zerind. Sibiu and Zerind are in the explored set; not added.'
		);
		expect(s[10]).toBe(
			'Take Pitesti off the frontier (g = 317). Not a goal; expand it: Bucharest, Craiova, Rimnicu Vilcea. Bucharest (path cost 418) replaces Bucharest (path cost 450) on the frontier. Craiova is already on the frontier with a lower path cost (366); not added. Rimnicu Vilcea is in the explored set; not added.'
		);
		expect(s.at(-1)).toBe(
			'Take Bucharest off the frontier. It contains the goal state: return the solution Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418).'
		);
	});

	it('a frontier node with the same path cost', () => {
		const spec: GraphProblemSpec = {
			graph: {
				directed: true,
				nodes: ['S', 'A', 'B', 'C'].map((id) => ({ id })),
				edges: [
					{ from: 'S', to: 'A', cost: 1 },
					{ from: 'S', to: 'B', cost: 1 },
					{ from: 'A', to: 'C', cost: 1 },
					{ from: 'B', to: 'C', cost: 1 }
				]
			},
			start: 'S',
			goals: ['C']
		};
		expect(sentences(spec, { strategy: 'ucs', mode: 'graph' })[3]).toBe(
			'Take B off the frontier (g = 1). Not a goal; expand it: C. C is already on the frontier with the same path cost (2); not added.'
		);
	});

	it('BFS and DFS on the tiny search problem (Uninformed Search, slides 4 and 6)', () => {
		const bfs = sentences(TINY_PROBLEM, { strategy: 'bfs' });
		expect(bfs[0]).toBe('Initialize the frontier with S.');
		expect(bfs[1]).toBe('Take S off the frontier. Not a goal; expand it: d, e, p.');
		expect(bfs[10]).toBe('Take q off the frontier. Not a goal, and it has no successors.');
		expect(bfs.at(-1)).toBe(
			'Take G off the frontier. It contains the goal state: return the solution S → e → r → f → G (cost 14).'
		);
		const dfs = sentences(TINY_PROBLEM, { strategy: 'dfs' });
		expect(dfs[2]).toBe('Take d off the frontier. Not a goal; expand it: b, c, e.');
		expect(dfs[3]).toBe('Take b off the frontier. Not a goal; expand it: a.');
		// BFS graph search without priorities: the frontier check drops without comparing costs.
		const graph = sentences(TINY_PROBLEM, { strategy: 'bfs', mode: 'graph' });
		expect(graph[2]).toBe(
			'Take d off the frontier. Not a goal; expand it: b, c, e. e is already on the frontier; not added.'
		);
		expect(graph[7]).toBe(
			'Take h off the frontier. Not a goal; expand it: p, q. p is in the explored set; not added. q is already on the frontier; not added.'
		);
	});

	it('goal test at generation', () => {
		const s = sentences(TINY_PROBLEM, { strategy: 'bfs', goalTest: 'generate' });
		expect(s.at(-2)).toBe(
			'Take f off the frontier. Not a goal; expand it: c, G. G contains the goal state.'
		);
		expect(s.at(-1)).toBe(
			'G contains the goal state (tested when generated): return the solution S → e → r → f → G (cost 14).'
		);
		const root = sentences(
			{ ...TINY_PROBLEM, goals: ['S'] },
			{ strategy: 'bfs', goalTest: 'generate' }
		);
		expect(root).toEqual([
			'Initialize the frontier with S.',
			'S contains the goal state (tested when generated): return the solution S (cost 0).'
		]);
	});

	it('path check (avoid repeated states along path)', () => {
		const s = sentences(ROMANIA_PROBLEM, { strategy: 'dfs', mode: 'path' });
		expect(s[2]).toBe(
			'Take Sibiu off the frontier. Not a goal; expand it: Arad, Fagaras, Oradea, Rimnicu Vilcea. Arad is already on this path; not added.'
		);
	});

	it('IDS on the binary tree (Uninformed Search, slides 34–37)', () => {
		const s = sentences(BINARY_TREE_PROBLEM, { strategy: 'ids' });
		expect(s.slice(0, 5)).toEqual([
			'Start iteration with depth limit 0: initialize the frontier with A.',
			'Take A off the frontier. Not a goal. A is at the depth limit 0; not expanded.',
			'The frontier is empty and nodes were cut off at the depth limit 0: start again with depth limit 1.',
			'Start iteration with depth limit 1: initialize the frontier with A.',
			'Take A off the frontier. Not a goal; expand it: B, C.'
		]);
		expect(s[8]).toBe('Start iteration with depth limit 2: initialize the frontier with A.');
		expect(s[12]).toBe(
			'Take E off the frontier. Not a goal. E is at the depth limit 2; not expanded.'
		);
		expect(s.at(-1)).toBe(
			'Take M off the frontier. It contains the goal state: return the solution A → C → F → M (cost 3).'
		);
		const short = sentences(BINARY_TREE_PROBLEM, { strategy: 'ids', depthLimit: 1 });
		expect(short.at(-1)).toBe(
			'The frontier is empty and nodes were cut off at the depth limit 1, the largest limit: stop without a solution.'
		);
		const none = sentences({ ...BINARY_TREE_PROBLEM, goals: ['Z'] }, { strategy: 'ids' });
		expect(none.at(-1)).toBe(
			'The frontier is empty and no node was cut off at the depth limit 4: return failure (no solution).'
		);
	});

	it('depth-limited search', () => {
		const s = sentences(TINY_PROBLEM, { strategy: 'dls', depthLimit: 1 });
		expect(s[0]).toBe('Initialize the frontier with S (depth limit 1).');
		expect(s[2]).toBe(
			'Take d off the frontier. Not a goal. d is at the depth limit 1; not expanded.'
		);
		expect(s.at(-1)).toBe(
			'The frontier is empty and nodes were cut off at the depth limit 1: no solution within the limit.'
		);
	});

	it('A* graph search with an inconsistent heuristic (Informed Search, slides 27–29)', () => {
		const s = sentences(ASTAR_WRONG_PROBLEM, { strategy: 'astar', mode: 'graph' });
		expect(s[4]).toBe(
			'Take A off the frontier (f = 5). Not a goal; expand it: C. C is in the explored set; not added.'
		);
		expect(s[5]).toBe(
			'Take G off the frontier. It contains the goal state: return the solution S → B → C → G (cost 6).'
		);
	});

	it('limits and an empty frontier', () => {
		const limited = sentences(TINY_PROBLEM, { strategy: 'bfs', maxExpansions: 3 });
		expect(limited.at(-1)).toBe(
			'Stop after taking 3 nodes off the frontier (the limit for this run); no solution found yet.'
		);
		const nodes = sentences(TINY_PROBLEM, { strategy: 'bfs', maxNodes: 5 });
		expect(nodes.at(-1)).toBe(
			'Stop after generating 7 nodes (the limit for this run); no solution found yet.'
		);
		const empty = sentences({ ...TINY_PROBLEM, goals: ['Z'] }, { strategy: 'bfs', mode: 'graph' });
		expect(empty.at(-1)).toBe('The frontier is empty: return failure (no solution).');
	});

	it('custom labels and out-of-range steps', () => {
		const r = run(ROMANIA_PROBLEM, { strategy: 'astar' });
		expect(describeStep(r, 1, { label: (n) => n.label.toUpperCase() })).toBe(
			'Take ARAD off the frontier (f = 366). Not a goal; expand it: SIBIU, TIMISOARA, ZERIND.'
		);
		expect(describeStep(r, -1)).toBe('');
		expect(describeStep(r, 99)).toBe('');
	});
});

describe('describeResult', () => {
	it('solution with counts', () => {
		expect(describeResult(run(ROMANIA_PROBLEM, { strategy: 'astar' }))).toBe(
			'Solution: Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest (cost 418). 6 nodes taken off the frontier, 5 expanded, 16 generated.'
		);
		expect(describeResult(run(BINARY_TREE_PROBLEM, { strategy: 'ids' }))).toBe(
			'Solution: A → C → F → M (cost 3). Found in the iteration with depth limit 3. 23 nodes taken off the frontier, 10 expanded, 24 generated.'
		);
	});

	it('failures', () => {
		expect(describeResult(run(TINY_PROBLEM, { strategy: 'bfs', maxExpansions: 3 }))).toBe(
			'No solution found before the limit of 3 nodes taken off the frontier. 3 nodes taken off the frontier, 3 expanded, 9 generated.'
		);
		expect(describeResult(run(TINY_PROBLEM, { strategy: 'bfs', maxNodes: 5 }))).toMatch(
			/^No solution found before the limit of 5 generated nodes\./
		);
		expect(describeResult(run(TINY_PROBLEM, { strategy: 'dls', depthLimit: 1 }))).toBe(
			'No solution within the depth limit 1; nodes were cut off. 4 nodes taken off the frontier, 1 expanded, 4 generated.'
		);
		expect(describeResult(run(BINARY_TREE_PROBLEM, { strategy: 'ids', depthLimit: 1 }))).toMatch(
			/^No solution up to the largest depth limit, 1; nodes were still cut off\./
		);
		expect(
			describeResult(run({ ...BINARY_TREE_PROBLEM, goals: ['Z'] }, { strategy: 'ids' }))
		).toMatch(/^No solution: the frontier emptied without cutting off any node\./);
		const single = run({ ...TINY_PROBLEM, goals: ['Z'] }, { strategy: 'bfs', mode: 'graph' });
		expect(describeResult(single)).toMatch(/^No solution: the frontier emptied\. 12 nodes/);
		expect(describeResult(run({ ...TINY_PROBLEM, goals: ['S'] }, { strategy: 'bfs' }))).toBe(
			'Solution: S (cost 0). 1 node taken off the frontier, 0 expanded, 1 generated.'
		);
	});
});
