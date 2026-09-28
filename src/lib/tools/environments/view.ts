/**
 * Display helpers for the task-environments tool: value colors, summaries,
 * source tags, and the sentences announced when the table changes.
 */
import type { Tone } from '$lib/components/ui/types';
import {
	DIMENSION_IDS,
	valueIndex,
	valueInfo,
	type Dimension,
	type DimensionValues,
	type EnvironmentProfile
} from '$lib/theory/agents/environments';
import { columnExample, columnName, columnProfile, isEdited, type Column } from './state';

/**
 * Categorical palette index per value position: the first value of each
 * "X vs. Y" pair, the second, and the third value that slide 20 adds in
 * parentheses (strategic, semidynamic).
 */
const VALUE_TONES: readonly number[] = [0, 2, 3];

/** Tone of a value in the table: by its position in the dimension; 'muted' when unset. */
export function valueTone<D extends Dimension>(d: D, value: DimensionValues[D] | undefined): Tone {
	const i = valueIndex(d, value);
	return i < 0 ? 'muted' : VALUE_TONES[i];
}

/** The legend for the value colors, in palette order. */
export const VALUE_LEGEND: readonly { tone: number; label: string; values: string }[] = [
	{
		tone: VALUE_TONES[0],
		label: 'First value',
		values: 'Fully, Deterministic, Episodic, Static, Discrete, Single, Known'
	},
	{
		tone: VALUE_TONES[1],
		label: 'Second value',
		values: 'Partially, Stochastic, Sequential, Dynamic, Continuous, Multi, Unknown'
	},
	{ tone: VALUE_TONES[2], label: 'In parentheses on slide 20', values: 'Strategic, Semidynamic' }
];

/** "Fully · Strategic · Sequential …": the short labels of the values that are set. */
export function profileSummary(profile: EnvironmentProfile): string {
	return DIMENSION_IDS.map((d) => valueInfo(d, profile[d])?.label)
		.filter((l): l is string => l !== undefined)
		.join(' · ');
}

/** Number of dimensions a profile sets. */
export function setCount(profile: EnvironmentProfile): number {
	return DIMENSION_IDS.filter((d) => profile[d] !== undefined).length;
}

export interface SourceTag {
	/** Short tag text shown under the column name. */
	text: string;
	/** Longer description for tooltips and screen readers. */
	title: string;
}

/** Where a column's values come from. */
export function columnSource(column: Column): SourceTag {
	if (column.kind === 'custom') {
		return { text: 'Custom', title: 'An environment described on this page' };
	}
	const example = columnExample(column);
	if (isEdited(column)) {
		return {
			text: 'Edited',
			title:
				example?.source === 'slide'
					? 'Values changed from the slide 17 table'
					: 'Values changed from this site’s classification'
		};
	}
	return example?.source === 'slide'
		? { text: 'Slide 17', title: 'Values from the slide 17 table' }
		: { text: 'Site', title: 'Values classified on this site' };
}

/** Sentence announced after a column is added, removed, or selected. */
export function announceColumn(
	action: 'added' | 'removed' | 'selected' | 'reset',
	column: Column
): string {
	const name = columnName(column);
	switch (action) {
		case 'added':
			return `Added ${name}.`;
		case 'removed':
			return `Removed ${name}.`;
		case 'reset':
			return `${name}: values reset.`;
		default:
			return `Selected ${name}.`;
	}
}

export interface DimensionNote {
	/** The reason for an example's value, the definition of a value, or "Not set.". */
	text: string;
	/** For an edited example: its own value's short label ("Semidynamic"), or "not set". */
	original?: string;
}

/**
 * The line under a dimension's control: an example's reason for its value;
 * the value's definition for a custom column or a changed value (with the
 * example's own value); or what an unset value means.
 */
export function dimensionNote(column: Column, d: Dimension): DimensionNote {
	const value = columnProfile(column)[d];
	const example = columnExample(column);
	const own = example?.profile[d];
	const original = example && value !== own ? (valueInfo(d, own)?.label ?? 'not set') : undefined;
	if (value === undefined) {
		const text =
			example?.source === 'slide' && d === 'known' && !original
				? 'Not in the slide 17 table.'
				: 'Not set.';
		return original ? { text, original } : { text };
	}
	const reason = example && value === own ? example.reasons[d] : undefined;
	const text = reason ?? valueInfo(d, value)?.definition ?? '';
	return original ? { text, original } : { text };
}
