import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { parseWorldName, simulate } from '$lib/theory/agents/vacuum';
import { VACUUM_PRESETS, matchVacuumPreset } from './presets';
import { completeVacuumState, decodeTable, defaultVacuumState, isSavedVacuumState } from './state';

describe('vacuum presets', () => {
	it('have unique ids, valid states, and citations within the decks', () => {
		const ids = VACUUM_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of VACUUM_PRESETS) {
			expect(isSavedVacuumState(p.value)).toBe(true);
			expect(completeVacuumState(p.value)).toEqual(p.value);
			expect(p.cite).toBeDefined();
			const slide = p.cite!.slide as number;
			expect(slide).toBeGreaterThanOrEqual(1);
			expect(slide).toBeLessThanOrEqual(decks[p.cite!.deck].slides);
		}
	});

	it('reproduce the slide 5 comparison: 18 vs 10 and 17 under the move penalty', () => {
		const total = (id: string) => {
			const v = VACUUM_PRESETS.find((p) => p.id === id)!.value;
			return simulate({
				program: v.program,
				table: decodeTable(v.table)!,
				initial: parseWorldName(v.initial)!,
				steps: v.steps,
				dirtProbability: v.p,
				measure: v.measure,
				seed: v.seed
			}).total;
		};
		expect(total('slide-3')).toBe(18);
		expect(total('move-penalty')).toBe(10);
		expect(total('with-state')).toBe(17);
		expect(total('table-reflex')).toBe(18);
		// Never moves from B: B is cleaned at t = 1, A stays dirty.
		expect(total('table-stays')).toBe(10);
	});

	it('are recognized from a configuration, so a reloaded link marks its preset', () => {
		expect(matchVacuumPreset(defaultVacuumState())?.id).toBe('slide-3');
		for (const p of VACUUM_PRESETS) expect(matchVacuumPreset({ ...p.value })?.id).toBe(p.id);
		expect(matchVacuumPreset({ ...defaultVacuumState(), seed: 2 })).toBeNull();
		expect(matchVacuumPreset({ ...defaultVacuumState(), initial: 'B CC' })).toBeNull();
	});
});
