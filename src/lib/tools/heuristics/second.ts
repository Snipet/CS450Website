/**
 * The second heuristic h2 that the tool compares h (= h1) with: h = 0, the
 * true cost h*, the preset's heuristic, a scaled copy of h1, or a copy with
 * values of its own.
 */
import type { GraphProblemSpec } from '$lib/theory/graphs';
import type { SecondChoice, SecondKind } from './analysis';
import {
	formatFactor,
	fullHeuristic,
	perfectHeuristic,
	scaleHeuristic,
	zeroHeuristic,
	type Heuristic
} from './edit';

export interface ResolvedSecond {
	h: Record<string, number>;
	/** What h2 is, e.g. "h = 0" or "0.5 × h1". */
	label: string;
}

/** Names of the choices as the menu lists them. */
export const SECOND_NAMES: Record<SecondKind, string> = {
	zero: 'h = 0',
	perfect: 'h*(n), the true cost',
	preset: 'The preset’s heuristic',
	scaled: 'A multiple of h1',
	custom: 'Values of your own'
};

/**
 * h2 for a choice. `preset` is the preset's heuristic (null when the problem
 * comes from no preset; h2 is then h = 0). A custom h2 keeps its values for
 * the graph's states; states it has no value for get h1's value.
 */
export function resolveSecond(
	choice: SecondChoice,
	spec: GraphProblemSpec,
	h1: Heuristic,
	preset: { h: Heuristic; label: string | undefined } | null
): ResolvedSecond {
	switch (choice.kind) {
		case 'zero':
			return { h: zeroHeuristic(spec), label: 'h = 0' };
		case 'perfect':
			return { h: perfectHeuristic(spec), label: 'h*(n)' };
		case 'preset':
			return preset
				? { h: fullHeuristic(spec, preset.h), label: preset.label ?? 'The preset’s h' }
				: { h: zeroHeuristic(spec), label: 'h = 0' };
		case 'scaled':
			return {
				h: scaleHeuristic(spec, h1, choice.factor),
				label: `${formatFactor(choice.factor)} × h1`
			};
		case 'custom': {
			const base = fullHeuristic(spec, h1);
			const own = choice.h;
			return {
				h: Object.fromEntries(
					Object.entries(base).map(([id, v]) => [id, Object.hasOwn(own, id) ? own[id] : v])
				),
				label: 'Your values'
			};
		}
	}
}
