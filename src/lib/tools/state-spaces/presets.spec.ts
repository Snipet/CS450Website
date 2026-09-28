import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { STATE_SPACE_PRESETS, matchPreset } from './presets';
import { completeStateSpaces, isSavedStateSpaces } from './state';

describe('state spaces presets', () => {
	it('have unique ids and cite existing slides', () => {
		const ids = STATE_SPACE_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of STATE_SPACE_PRESETS) {
			expect(p.cite, p.id).toBeDefined();
			const slides = typeof p.cite!.slide === 'number' ? [p.cite!.slide] : [...p.cite!.slide!];
			for (const s of slides) expect(s).toBeLessThanOrEqual(decks[p.cite!.deck].slides);
		}
	});

	it('are valid saved states and match themselves', () => {
		for (const p of STATE_SPACE_PRESETS) {
			expect(isSavedStateSpaces(p.value), p.id).toBe(true);
			expect(completeStateSpaces(p.value)).toMatchObject(p.value);
			expect(matchPreset(p.value)?.id, p.id).toBe(p.id);
		}
	});

	it('ignore the strategy for problems without a drawn search', () => {
		expect(matchPreset({ problem: 'puzzle', squares: 2, strategy: 'ucs' })?.id).toBe('puzzle');
		expect(matchPreset({ problem: 'vacuum', squares: 3, strategy: 'ucs' })).toBeNull();
	});
});
