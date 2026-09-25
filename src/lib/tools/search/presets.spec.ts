import { describe, expect, it } from 'vitest';
import { annotationText } from '$lib/components/search/describe';
import { decks } from '$lib/lectures';
import { formatGraphText, parseGraphText, shortestPath } from '$lib/theory/graphs';
import type { SearchResult } from '$lib/theory/search';
import { SEARCH_PRESETS, matchPreset, sameScenario } from './presets';
import { defaultSearchState, isSavedSearchState, settingsOf, type SearchScenario } from './state';
import { optimality, runSearch, stoppedBy } from './view';

const preset = (id: string) => {
	const p = SEARCH_PRESETS.find((x) => x.id === id);
	if (!p) throw new Error(`no preset ${id}`);
	return p.value;
};

const specOf = (s: SearchScenario) => parseGraphText(s.graph).spec!;

function run(id: string, patch: Partial<SearchScenario> = {}): SearchResult {
	const s = { ...preset(id), ...patch };
	return runSearch(specOf(s), s);
}

const order = (r: SearchResult) => r.order.join(',');

/** Children of each expanded node, "Parent: child child …", in expansion order. */
function expansions(r: SearchResult): string[] {
	return r.steps
		.filter((s) => s.kind === 'expand')
		.map((s) => `${r.nodes[s.node!].label}: ${s.children.map((c) => r.nodes[c].label).join(', ')}`);
}

describe('search tool presets', () => {
	it('have unique ids and configurations, valid state, and slide citations', () => {
		const ids = SEARCH_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(SEARCH_PRESETS).toHaveLength(15);
		for (const p of SEARCH_PRESETS) {
			expect(matchPreset(p.value)?.id, p.id).toBe(p.id);
			expect(isSavedSearchState({ ...p.value, step: 0 }), p.id).toBe(true);
			expect(p.cite, p.id).toBeDefined();
			const [a, b] =
				typeof p.cite!.slide === 'number' ? [p.cite!.slide, p.cite!.slide] : p.cite!.slide!;
			expect(a, p.id).toBeGreaterThanOrEqual(1);
			expect(b, p.id).toBeLessThanOrEqual(decks[p.cite!.deck].slides);
			expect(p.description, p.id).toBeTruthy();
		}
	});

	it('store graph text that parses cleanly and round-trips', () => {
		for (const p of SEARCH_PRESETS) {
			const { spec, diagnostics } = parseGraphText(p.value.graph);
			expect(diagnostics, p.id).toEqual([]);
			expect(formatGraphText(spec!, { positions: true }), p.id).toBe(p.value.graph);
		}
	});

	it('draw the Romania map with squares and the other graphs with circles', () => {
		for (const p of SEARCH_PRESETS) {
			const romania = specOf(p.value).graph.nodes.some((n) => n.id === 'Bucharest');
			expect(p.value.shape, p.id).toBe(romania ? 'square' : 'circle');
		}
	});

	it('match the default state with "A* search example"', () => {
		const d = defaultSearchState();
		expect(matchPreset({ graph: d.graph, ...settingsOf(d) })?.id).toBe('astar');
		expect(sameScenario(preset('astar'), { ...preset('astar'), annotation: 'g' })).toBe(false);
	});
});

describe('the presets reproduce the slides', () => {
	it('Tree search example (Solving Problems by Searching, slides 29–35)', () => {
		const s = preset('tree-search');
		expect(s).toMatchObject({ strategy: 'astar', mode: 'tree', annotation: 'none' });
		const r = run('tree-search');
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Fagaras', 'Pitesti', 'Bucharest']);
		// Repeated states stay in the tree (slide 35).
		expect(expansions(r)).toEqual([
			'Arad: Sibiu, Timisoara, Zerind',
			'Sibiu: Arad, Fagaras, Oradea, Rimnicu Vilcea',
			'Rimnicu Vilcea: Craiova, Pitesti, Sibiu',
			'Fagaras: Bucharest, Sibiu',
			'Pitesti: Bucharest, Craiova, Rimnicu Vilcea'
		]);
		expect(r.nodes.every((n) => n.outcome === null || n.outcome === 'added')).toBe(true);
	});

	it('Search without repeated states (Solving Problems by Searching, slides 37–43)', () => {
		const r = run('no-repeated-states');
		expect(preset('no-repeated-states')).toMatchObject({ mode: 'graph', annotation: 'g' });
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Fagaras', 'Pitesti', 'Bucharest']);
		const crossed = r.nodes
			.filter((n) => n.outcome === 'explored' || n.outcome === 'frontier' || n.replacedAt !== null)
			.map((n) => `${n.label} ${n.g}`);
		// The crossed-out nodes and their path costs on slide 43.
		expect(crossed.sort()).toEqual(
			[
				'Arad 280',
				'Bucharest 450',
				'Craiova 455',
				'Rimnicu Vilcea 414',
				'Sibiu 300',
				'Sibiu 338'
			].sort()
		);
		const g = new Map(r.nodes.map((n) => [`${n.label} ${n.g}`, n]));
		for (const label of [
			'Timisoara 118',
			'Zerind 75',
			'Oradea 291',
			'Craiova 366',
			'Bucharest 418'
		])
			expect(g.has(label), label).toBe(true);
		expect(r.solution?.cost).toBe(418);
	});

	it('BFS expansion order (Uninformed Search, slide 4)', () => {
		expect(order(run('bfs-order'))).toBe('S,d,e,p,b,c,e,h,r,q,a,a,h,r,p,q,f,p,q,f,q,c,G');
	});

	it('DFS expansion order (Uninformed Search, slide 6)', () => {
		const r = run('dfs-order');
		// The slide lists the order after the start state S.
		expect(r.order.slice(1).join(',')).toBe('d,b,a,c,a,e,h,p,q,q,r,f,c,a,G');
		expect(r.order[0]).toBe('S');
	});

	it('Uniform-cost search example (Uninformed Search, slide 41)', () => {
		const r = run('ucs-example');
		expect(order(r)).toBe('S,p,d,b,e,a,r,f,e,G');
		expect(r.solution?.cost).toBe(10);
	});

	it('BFS is not always cheapest (Uninformed Search, slide 39)', () => {
		const s = preset('bfs-not-cheapest');
		expect(s).toMatchObject({ strategy: 'bfs', annotation: 'g' });
		const r = run('bfs-not-cheapest');
		expect(r.solution?.states).toEqual(['S', 'e', 'r', 'f', 'G']);
		expect(r.solution?.cost).toBe(14);
		const o = optimality(r, specOf(s));
		expect(o.cheapest).toBe(false);
		expect(o.best).toEqual({ cost: 10, states: ['S', 'd', 'e', 'r', 'f', 'G'] });
	});

	it('Iterative deepening (Uninformed Search, slides 34–37)', () => {
		const r = run('iterative-deepening');
		expect(r.iterations.map((i) => i.order.join(''))).toEqual([
			'A',
			'ABC',
			'ABDECFG',
			'ABDHIEJKCFLM'
		]);
		expect(r.solution?.states).toEqual(['A', 'C', 'F', 'M']);
	});

	it('Uniform-cost graph search is Dijkstra’s algorithm (Uninformed Search, slide 40)', () => {
		const s = preset('ucs-graph');
		const r = run('ucs-graph');
		expect(r.order).toEqual([
			'Arad',
			'Zerind',
			'Timisoara',
			'Sibiu',
			'Oradea',
			'Rimnicu Vilcea',
			'Lugoj',
			'Fagaras',
			'Mehadia',
			'Pitesti',
			'Craiova',
			'Dobreta',
			'Bucharest'
		]);
		expect(r.solution?.cost).toBe(shortestPath(specOf(s))?.cost);
	});

	it('DFS with a path check (Uninformed Search, slide 32)', () => {
		const r = run('dfs-path-check');
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
		expect(r.nodes.filter((n) => n.outcome === 'on-path').map((n) => n.label)).toEqual([
			'Arad',
			'Sibiu'
		]);
		// Without the check, DFS tree search goes back and forth until the limit.
		const loop = run('dfs-path-check', { mode: 'tree' });
		expect(loop.order.slice(0, 4)).toEqual(['Arad', 'Sibiu', 'Arad', 'Sibiu']);
		expect(stoppedBy(loop)).toBe('expansions');
	});

	it('Greedy best-first search (Informed Search, slides 8–11)', () => {
		const r = run('greedy');
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
		expect(r.solution?.cost).toBe(450);
		expect(expansions(r)[1]).toBe('Sibiu: Arad, Fagaras, Oradea, Rimnicu Vilcea');
	});

	it('Greedy search loops (Informed Search, slide 12)', () => {
		expect(preset('greedy-loops')).toMatchObject({
			strategy: 'greedy',
			mode: 'tree',
			maxExpansions: 30
		});
		const r = run('greedy-loops');
		expect(r.solution).toBeNull();
		expect(stoppedBy(r)).toBe('expansions');
		expect(r.stats.popped).toBe(30);
		expect(r.order).toEqual(Array.from({ length: 30 }, (_, i) => (i % 2 ? 'Neamt' : 'Iasi')));
	});

	it('Greedy vs. A* (Informed Search, slide 15)', () => {
		expect(run('greedy-vs-astar').solution?.cost).toBe(6);
		expect(run('greedy-vs-astar', { strategy: 'astar' }).solution?.cost).toBe(3);
	});

	it('A* search example (Informed Search, slides 17–22)', () => {
		const r = run('astar');
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Rimnicu Vilcea', 'Fagaras', 'Pitesti', 'Bucharest']);
		const labels = r.nodes.map((n) => `${n.label} ${annotationText(n, 'fgh', 'astar')}`);
		expect(labels).toEqual([
			'Arad 366=0+366',
			'Sibiu 393=140+253',
			'Timisoara 447=118+329',
			'Zerind 449=75+374',
			'Arad 646=280+366',
			'Fagaras 415=239+176',
			'Oradea 671=291+380',
			'Rimnicu Vilcea 413=220+193',
			'Craiova 526=366+160',
			'Pitesti 417=317+100',
			'Sibiu 553=300+253',
			'Bucharest 450=450+0',
			'Sibiu 591=338+253',
			'Bucharest 418=418+0',
			'Craiova 615=455+160',
			'Rimnicu Vilcea 607=414+193'
		]);
		expect(r.solution?.cost).toBe(418);
	});

	it('A* gone wrong (Informed Search, slides 27–29)', () => {
		const graph = run('astar-wrong');
		expect(order(graph)).toBe('S,B,C,A,G');
		expect(graph.solution?.cost).toBe(6);
		const tree = run('astar-wrong', { mode: 'tree' });
		expect(tree.solution?.cost).toBe(5);
	});

	it('Weighted A* (Informed Search, slide 38)', () => {
		const s = preset('weighted-astar');
		expect(s).toMatchObject({ strategy: 'wastar', weight: 2 });
		const r = run('weighted-astar');
		const a = run('astar');
		expect(r.order).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
		expect(r.stats.popped).toBe(4);
		expect(a.stats.popped).toBe(6);
		const best = shortestPath(specOf(s))!.cost;
		expect(r.solution?.cost).toBe(450);
		expect(r.solution!.cost).toBeLessThanOrEqual(s.weight * best);
	});
});
