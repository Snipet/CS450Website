/**
 * The "Add example" menu: every example environment, the slide 17 table first.
 * Choosing one adds it to the table (if it is not there yet) and selects it.
 */
import type { Preset } from '$lib/components/ui/types';
import { ENVIRONMENT_EXAMPLES } from '$lib/theory/agents/environments';
import { profileSummary } from './view';

export const EXAMPLE_PRESETS: readonly Preset<string>[] = ENVIRONMENT_EXAMPLES.map((e) => ({
	id: e.id,
	label: e.name,
	group: e.source === 'slide' ? 'Slide 17 table' : 'Classified on this site',
	description: profileSummary(e.profile),
	cite: e.cite ?? e.appears[0],
	value: e.id
}));
