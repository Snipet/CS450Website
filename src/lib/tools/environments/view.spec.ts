import { describe, expect, it } from 'vitest';
import { DIMENSIONS, emptyPeas, environmentExample } from '$lib/theory/agents/environments';
import { EXAMPLE_PRESETS } from './presets';
import type { Column } from './state';
import {
	VALUE_LEGEND,
	announceColumn,
	columnSource,
	dimensionNote,
	profileSummary,
	setCount,
	valueTone
} from './view';

const custom: Column = {
	kind: 'custom',
	key: 'custom-1',
	name: 'Poker',
	values: {},
	peas: emptyPeas()
};

describe('value colors', () => {
	it('colors values by their position in the dimension', () => {
		expect(valueTone('observable', 'fully')).toBe(0);
		expect(valueTone('observable', 'partially')).toBe(2);
		expect(valueTone('deterministic', 'strategic')).toBe(3);
		expect(valueTone('static', 'semidynamic')).toBe(3);
		expect(valueTone('known', undefined)).toBe('muted');
	});

	it('lists every value in the legend under its color', () => {
		for (const d of DIMENSIONS) {
			d.values.forEach((v, i) => {
				const entry = VALUE_LEGEND.find((l) => l.tone === valueTone(d.id, v.id as never));
				expect(entry).toBeDefined();
				expect(entry!.values.split(', ')).toContain(v.label);
				expect(VALUE_LEGEND.indexOf(entry!)).toBe(i);
			});
		}
	});
});

describe('summaries', () => {
	it('summarizes the values that are set', () => {
		expect(profileSummary(environmentExample('chess-clock')!.profile)).toBe(
			'Fully · Strategic · Sequential · Semidynamic · Discrete · Multi'
		);
		expect(profileSummary({ known: 'unknown', agents: 'single' })).toBe('Single · Unknown');
		expect(profileSummary({})).toBe('');
		expect(setCount({ known: 'unknown', agents: 'single' })).toBe(2);
		expect(setCount(environmentExample('taxi')!.profile)).toBe(7);
	});

	it('tags where a column’s values come from', () => {
		expect(columnSource({ kind: 'example', key: 'scrabble' }).text).toBe('Slide 17');
		expect(columnSource({ kind: 'example', key: 'taxi' }).text).toBe('Site');
		expect(columnSource(custom).text).toBe('Custom');
		const edited = columnSource({ kind: 'example', key: 'scrabble', values: {} });
		expect(edited).toEqual({ text: 'Edited', title: 'Values changed from the slide 17 table' });
		expect(columnSource({ kind: 'example', key: 'taxi', values: {} }).title).toBe(
			'Values changed from this site’s classification'
		);
	});

	it('announces changes to the table', () => {
		const c: Column = { kind: 'example', key: 'scrabble' };
		expect(announceColumn('added', c)).toBe('Added Scrabble.');
		expect(announceColumn('removed', custom)).toBe('Removed Poker.');
		expect(announceColumn('selected', c)).toBe('Selected Scrabble.');
		expect(announceColumn('reset', c)).toBe('Scrabble: values reset.');
	});
});

describe('dimension notes', () => {
	it('gives an example’s reason for its own value', () => {
		const scrabble: Column = { kind: 'example', key: 'scrabble' };
		expect(dimensionNote(scrabble, 'deterministic')).toEqual({
			text: 'New tiles are drawn at random from the bag.'
		});
		expect(dimensionNote(scrabble, 'known')).toEqual({ text: 'Not in the slide 17 table.' });
	});

	it('defines a changed value and keeps the example’s own', () => {
		const chess: Column = {
			kind: 'example',
			key: 'chess-clock',
			values: { ...environmentExample('chess-clock')!.profile, static: 'static', known: 'known' }
		};
		expect(dimensionNote(chess, 'static')).toEqual({
			text: 'The world does not change while the agent is thinking.',
			original: 'Semidynamic'
		});
		expect(dimensionNote(chess, 'known')).toEqual({
			text: 'The rules of the environment (transition model and rewards associated with states) are known to the agent.',
			original: 'not set'
		});
		const cleared: Column = { kind: 'example', key: 'taxi', values: { observable: 'partially' } };
		expect(dimensionNote(cleared, 'known')).toEqual({ text: 'Not set.', original: 'Known' });
	});

	it('defines a custom column’s values', () => {
		const c: Column = { ...custom, values: { deterministic: 'strategic' } } as Column;
		expect(dimensionNote(c, 'deterministic').text).toBe(
			'The environment is deterministic except for the actions of other agents.'
		);
		expect(dimensionNote(c, 'known')).toEqual({ text: 'Not set.' });
	});
});

describe('example presets', () => {
	it('lists the slide 17 table first, then the site’s examples, each citing a slide', () => {
		expect(EXAMPLE_PRESETS.map((p) => [p.group, p.id])).toEqual([
			['Slide 17 table', 'word-jumble'],
			['Slide 17 table', 'chess-clock'],
			['Slide 17 table', 'scrabble'],
			['Slide 17 table', 'autonomous-driving'],
			['Classified on this site', 'vacuum'],
			['Classified on this site', 'romania'],
			['Classified on this site', 'eight-puzzle'],
			['Classified on this site', 'spam-filter'],
			['Classified on this site', 'taxi']
		]);
		for (const p of EXAMPLE_PRESETS) {
			expect(p.value).toBe(p.id);
			expect(p.cite).toBeDefined();
			expect(p.description).toBe(profileSummary(environmentExample(p.id)!.profile));
		}
		expect(EXAMPLE_PRESETS[0].cite).toEqual({ deck: 'agents', slide: 17 });
		expect(EXAMPLE_PRESETS.find((p) => p.id === 'taxi')!.cite).toEqual({
			deck: 'agents',
			slide: 7
		});
	});
});
