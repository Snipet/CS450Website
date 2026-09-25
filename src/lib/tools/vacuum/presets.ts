/**
 * Presets for the vacuum tool: a program, environment, and performance
 * measure, citing the slides they follow.
 */
import type { Preset } from '$lib/components/ui/types';
import { defaultVacuumState, type VacuumToolState } from './state';

const FIELDS = Object.keys(defaultVacuumState()) as (keyof VacuumToolState)[];

const scenario = (s: Partial<VacuumToolState>): VacuumToolState => ({
	...defaultVacuumState(),
	...s
});

export const VACUUM_PRESETS: readonly Preset<VacuumToolState>[] = [
	{
		id: 'slide-3',
		group: 'Deterministic environment',
		label: 'Reflex agent, both squares dirty',
		description: 'The slide 3 program starting in A with dirt in A and B, 10 time steps.',
		cite: { deck: 'agents', slide: 3 },
		value: scenario({})
	},
	{
		id: 'move-penalty',
		group: 'Deterministic environment',
		label: 'Reflex agent with a move penalty',
		description:
			'The same run scored +1 per clean square and −1 per move: the agent keeps moving once both squares are clean.',
		cite: { deck: 'agents', slide: 5 },
		value: scenario({ measure: 'clean-minus-moves' })
	},
	{
		id: 'with-state',
		group: 'Deterministic environment',
		label: 'Reflex agent with state, move penalty',
		description:
			'Remembers what it has seen and returns NoOp once it believes both squares are clean.',
		cite: { deck: 'agents', slide: 5 },
		value: scenario({ program: 'reflex-state', measure: 'clean-minus-moves' })
	},
	{
		id: 'table-reflex',
		group: 'Deterministic environment',
		label: 'Table-driven agent with the slide 3 rules',
		description:
			'The reflex program written as a percept → action table; edit the table to change it.',
		cite: { deck: 'agents', slide: 3 },
		value: scenario({ program: 'table', table: 'RSLS' })
	},
	{
		id: 'table-stays',
		group: 'Deterministic environment',
		label: 'Table-driven agent that never moves',
		description: 'Suck on dirt, NoOp otherwise: it never reaches the other square.',
		cite: { deck: 'agents', slide: 3 },
		value: scenario({ program: 'table', table: 'NSNS', initial: 'B DD' })
	},
	{
		id: 'random',
		group: 'Deterministic environment',
		label: 'Random agent',
		description: 'Left, Right, Suck, or NoOp uniformly at random (seeded), 20 time steps.',
		cite: { deck: 'agents', slide: 3 },
		value: scenario({ program: 'random', steps: 20 })
	},
	{
		id: 'dirt-returns-state',
		group: 'Stochastic dirt',
		label: 'Dirt reappears: reflex agent with state',
		description:
			'Each clean square becomes dirty with probability 0.1 after each step; the agent stops checking once it believes both squares are clean.',
		cite: { deck: 'agents', slide: 11 },
		value: scenario({ program: 'reflex-state', p: 0.1, steps: 40, seed: 3 })
	},
	{
		id: 'dirt-returns-reflex',
		group: 'Stochastic dirt',
		label: 'Dirt reappears: reflex agent',
		description: 'The same environment and seed; the reflex agent keeps visiting both squares.',
		cite: { deck: 'agents', slide: 11 },
		value: scenario({ program: 'reflex', p: 0.1, steps: 40, seed: 3 })
	}
];

/**
 * The preset whose configuration is exactly `state` (the first one, if
 * several are), or null: the preset menu marks it as loaded.
 */
export function matchVacuumPreset(state: VacuumToolState): Preset<VacuumToolState> | null {
	return VACUUM_PRESETS.find((p) => FIELDS.every((k) => p.value[k] === state[k])) ?? null;
}
