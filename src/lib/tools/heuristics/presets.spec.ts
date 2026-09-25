import { describe, expect, it } from 'vitest';
import { decks } from '$lib/lectures';
import { hasErrors } from '$lib/theory/diagnostics';
import {
	ASTAR_WRONG_PROBLEM,
	ROMANIA_PROBLEM,
	SLD_BUCHAREST,
	SLD_FAGARAS,
	parseGraphText
} from '$lib/theory/graphs';
import { setStateH, specText } from './edit';
import {
	HEURISTIC_PRESETS,
	INFLATED_SLD,
	matchPreset,
	presetById,
	presetForSpec,
	presetHeuristic
} from './presets';

const specOf = (id: string) => parseGraphText(presetById(id)!.value.graph).spec!;

describe('heuristics presets', () => {
	it('parse without errors and cite existing slides', () => {
		for (const p of HEURISTIC_PRESETS) {
			expect(hasErrors(parseGraphText(p.value.graph).diagnostics), p.id).toBe(false);
			const cite = p.cite!;
			const slides = typeof cite.slide === 'number' ? [cite.slide] : [...(cite.slide ?? [])];
			for (const s of slides) expect(s).toBeLessThanOrEqual(decks[cite.deck].slides);
		}
		expect(new Set(HEURISTIC_PRESETS.map((p) => p.id)).size).toBe(HEURISTIC_PRESETS.length);
	});

	it('carry the lecture problems and heuristics', () => {
		expect(specOf('romania-sld')).toEqual(ROMANIA_PROBLEM);
		expect(specOf('astar-wrong').h).toEqual(ASTAR_WRONG_PROBLEM.h);
		expect(specOf('iasi-fagaras')).toMatchObject({
			start: 'Iasi',
			goals: ['Fagaras'],
			h: SLD_FAGARAS
		});
		expect(specOf('romania-inflated').h).toEqual(INFLATED_SLD);
		expect(INFLATED_SLD.Arad).toBe(2 * SLD_BUCHAREST.Arad);
		const tiny = specOf('tiny-zero');
		expect(Object.values(tiny.h!).every((v) => v === 0)).toBe(true);
		expect(tiny.hLabel).toBe('h = 0');
	});

	it('say nothing about teaching', () => {
		for (const p of HEURISTIC_PRESETS) {
			expect(p.description).not.toMatch(/learn|explore|discover|understand|intuition|student/i);
		}
	});

	it('are found by text, then by graph, start and goals', () => {
		const text = presetById('romania-inflated')!.value.graph;
		expect(matchPreset(text)?.id).toBe('romania-inflated');
		const edited = setStateH(parseGraphText(text).spec!, 'Arad', 1);
		expect(matchPreset(specText(edited))).toBeUndefined();
		expect(presetForSpec(specText(edited), edited)?.id).toBe('romania-sld');
		const other = { ...edited, start: 'Zerind' };
		expect(presetForSpec(specText(other), other)).toBeUndefined();
	});

	it('expose their heuristic and label', () => {
		const p = presetHeuristic(presetById('romania-sld')!);
		expect(p.h).toEqual(SLD_BUCHAREST);
		expect(p.label).toBe('Straight-line distance to Bucharest');
		expect(presetById(null)).toBeUndefined();
		expect(presetById('nope')).toBeUndefined();
	});
});
