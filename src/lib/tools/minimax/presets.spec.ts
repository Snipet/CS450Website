import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { alphaBeta, minimax, maxN, parseGameTree, treeFacts } from '$lib/theory/games';
import { MINIMAX_PRESETS, RANDOM_SETTINGS, matchPreset, randomTreeText } from './presets';
import { defaultMinimaxState, isSavedMinimaxState } from './state';

const byId = (id: string) => MINIMAX_PRESETS.find((p) => p.id === id)!;
const treeOf = (id: string) => parseGameTree(byId(id).value.tree).tree!;

describe('minimax presets', () => {
	it('are valid saved states with unique ids and slide citations', () => {
		const ids = MINIMAX_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of MINIMAX_PRESETS) {
			expect(parseGameTree(p.value.tree).diagnostics).toEqual([]);
			expect(isSavedMinimaxState(p.value)).toBe(true);
			expect(p.cite?.deck).toBe('adversarial');
			const slides = p.cite!.slide!;
			const [a, b] = typeof slides === 'number' ? [slides, slides] : slides;
			expect(a).toBeGreaterThanOrEqual(1);
			expect(b).toBeLessThanOrEqual(decks.adversarial.slides);
		}
	});

	it('match the default page and themselves', () => {
		const d = defaultMinimaxState();
		expect(matchPreset(d, false)?.id).toBe('slide-alphabeta');
		for (const p of MINIMAX_PRESETS) {
			const tuples = parseGameTree(p.value.tree).tree!.tuples;
			expect(matchPreset(p.value, tuples)?.id).toBe(p.id);
		}
		expect(matchPreset({ ...byId('slide-minimax').value, ordering: 'best-first' }, false)?.id).toBe(
			'slide-minimax'
		);
		expect(matchPreset({ ...byId('multi-player').value, algorithm: 'minimax' }, true)?.id).toBe(
			'multi-player'
		);
		expect(matchPreset({ ...d, tree: '[1 2]' }, false)).toBeUndefined();
	});

	it('say what the slides show', () => {
		expect(minimax(treeOf('slide-minimax')).value).toBe(3);
		expect(minimax(treeOf('optimality')).value).toBe(10);
		const min = alphaBeta(treeOf('min-root'));
		expect(min.value).toBe(6);
		expect(min.steps.flatMap((s) => (s.kind === 'prune' ? s.skipped : [])).length).toBe(2);
		const ordering = treeOf('best-first');
		expect(alphaBeta(ordering, { ordering: 'best-first' }).stats.leaves).toBe(11);
		expect(alphaBeta(ordering, { ordering: 'worst-first' }).stats).toMatchObject({
			leaves: 27,
			pruned: 0
		});
		expect(byId('worst-first').value.tree).toBe(byId('best-first').value.tree);
		const cut = treeOf('cutoff');
		expect(treeFacts(cut).cutoffDepths).toEqual([1, 2, 3]);
		for (const [c, value, action] of [
			[1, 5, 'A1'],
			[2, 5, 'A1'],
			[3, 3, 'A2'],
			[null, 3, 'A2']
		] as const) {
			const r = minimax(cut, { cutoff: c });
			expect([r.value, r.bestAction]).toEqual([value, action]);
		}
		const multi = maxN(treeOf('multi-player'));
		expect(multi.value).toEqual([4, 3, 2]);
		expect(multi.order).toEqual([1, 3, 2]);
	});

	it('builds the random tree from its settings', () => {
		const p = byId('random');
		expect(p.value.tree).toBe(randomTreeText(RANDOM_SETTINGS));
		expect(treeFacts(parseGameTree(p.value.tree).tree!).uniform).toEqual({ b: 3, d: 4 });
		expect(p.value.actions).toBe(false);
	});
});
