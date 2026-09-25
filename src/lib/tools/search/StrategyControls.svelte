<!--
@component
The search settings: strategy, repeated-state handling, goal test, depth
limit, α, and expansion limit.
Changes are reported as patches through `onchange`.
-->
<script lang="ts">
	import Callout from '$lib/components/ui/Callout.svelte';
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import NumberField from '$lib/components/ui/NumberField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { queueName, strategyName, strategyShort } from '$lib/components/search/describe';
	import type { Citation } from '$lib/lectures';
	import type { RepeatMode, StrategyId } from '$lib/theory/search';
	import {
		MAX_DEPTH_LIMIT,
		MAX_MAX_EXPANSIONS,
		MAX_WEIGHT,
		MIN_DEPTH_LIMIT,
		MIN_MAX_EXPANSIONS,
		MIN_WEIGHT,
		MODES,
		STRATEGIES,
		type GoalTest,
		type SearchScenario
	} from './state';

	type Settings = Pick<
		SearchScenario,
		'strategy' | 'mode' | 'goalTest' | 'depthLimit' | 'weight' | 'maxExpansions'
	>;

	interface Props {
		settings: Settings;
		/** The strategy reads h(n) but the problem gives no h values. */
		missingHeuristic: boolean;
		onchange: (patch: Partial<Settings>) => void;
	}

	let { settings, missingHeuristic, onchange }: Props = $props();

	const uid = $props.id();

	const strategyOptions = STRATEGIES.map((s) => {
		const name = strategyName(s);
		const short = strategyShort(s);
		return { value: s, label: name.includes(short) ? name : `${name} (${short})` };
	});

	const MODE_TEXT: Record<RepeatMode, { name: string; text: string; cite: Citation }> = {
		tree: {
			name: 'Tree search',
			text: 'No check: every child goes on the frontier.',
			cite: { deck: 'search', slide: 28 }
		},
		path: {
			name: 'Path check',
			text: 'A child whose state is already on its path from the root is not added.',
			cite: { deck: 'uninformed', slide: 32 }
		},
		graph: {
			name: 'Graph search',
			text: 'Explored states are not added again; with a priority queue, a cheaper path replaces a frontier node.',
			cite: { deck: 'search', slide: 36 }
		}
	};

	const goalTestOptions: { value: GoalTest; label: string }[] = [
		{ value: 'expand', label: 'When taken off the frontier' },
		{ value: 'generate', label: 'When generated' }
	];

	const limited = $derived(settings.strategy === 'dls' || settings.strategy === 'ids');
	const weighted = $derived(settings.strategy === 'wastar');
	const set = (patch: Partial<Settings>) => onchange(patch);
</script>

<div class="controls">
	<div class="fields">
		<div class="field strategy">
			<Select
				label="Strategy"
				options={strategyOptions}
				value={settings.strategy}
				onchange={(v: StrategyId) => set({ strategy: v })}
			/>
			<span class="hint">Frontier: {queueName(settings.strategy)}</span>
		</div>
		<div class="field goal-test">
			<Select
				label="Goal test"
				options={goalTestOptions}
				value={settings.goalTest}
				onchange={(v) => set({ goalTest: v })}
			/>
			<span class="hint">
				{settings.goalTest === 'expand'
					? 'As in the tree search outline.'
					: 'Children are tested before they are added.'}
			</span>
		</div>
		<div class="field">
			<NumberField
				label="Expansion limit"
				value={settings.maxExpansions}
				min={MIN_MAX_EXPANSIONS}
				max={MAX_MAX_EXPANSIONS}
				onchange={(v) => set({ maxExpansions: v })}
			/>
			<span class="hint">Nodes taken off the frontier before the run stops.</span>
		</div>
		{#if limited}
			<div class="field">
				<NumberField
					label={settings.strategy === 'ids' ? 'Largest depth limit' : 'Depth limit'}
					value={settings.depthLimit}
					min={MIN_DEPTH_LIMIT}
					max={MAX_DEPTH_LIMIT}
					onchange={(v) => set({ depthLimit: v })}
				/>
				<span class="hint">
					{settings.strategy === 'ids'
						? 'Tries the limits 0, 1, 2, … up to this one.'
						: 'Nodes at this depth are not expanded.'}
				</span>
			</div>
		{/if}
		{#if weighted}
			<div class="field">
				<NumberField
					label="Weight α"
					value={settings.weight}
					min={MIN_WEIGHT}
					max={MAX_WEIGHT}
					step={0.5}
					onchange={(v) => set({ weight: v })}
				/>
				<span class="hint">f(n) = g(n) + α·h(n)</span>
			</div>
		{/if}
	</div>

	<fieldset class="modes">
		<legend>Repeated states</legend>
		{#each MODES as m (m)}
			{@const t = MODE_TEXT[m]}
			<label class={['mode', { checked: settings.mode === m }]}>
				<input
					type="radio"
					name="{uid}-mode"
					value={m}
					checked={settings.mode === m}
					onchange={() => set({ mode: m })}
				/>
				<span class="mode-body">
					<span class="mode-name">{t.name}</span>
					<span class="mode-text">{t.text}</span>
				</span>
				<span class="mode-cite"><CitationTag cite={t.cite} /></span>
			</label>
		{/each}
	</fieldset>

	{#if missingHeuristic}
		<Callout tone="info">
			This graph gives no h values, so h = 0 for every state: greedy best-first search takes nodes
			off in the order they were added, and A* orders them by g(n) like uniform-cost search.
		</Callout>
	{/if}
</div>

<style>
	.controls {
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.fields {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-3) var(--space-4);
	}
	@container (min-width: 30rem) {
		.fields {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@container (min-width: 38rem) {
		.fields {
			grid-template-columns: minmax(0, 1.35fr) minmax(0, 1.25fr) minmax(0, 0.9fr);
		}
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.hint {
		color: var(--text-3);
		font-size: var(--text-xs);
		line-height: 1.45;
	}
	.modes {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 6px;
		padding: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.mode {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: start;
		gap: 2px var(--space-3);
		padding: 6px var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		cursor: pointer;
		transition:
			border-color var(--duration) var(--ease),
			background var(--duration) var(--ease);
	}
	.mode:hover {
		border-color: var(--border-strong);
	}
	.mode.checked {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.mode:has(input:focus-visible) {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	input {
		margin: 3px 0 0;
		accent-color: var(--accent);
	}
	input:focus-visible {
		outline: none;
	}
	.mode-body {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.mode-name {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text);
	}
	.mode-text {
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.45;
	}
	.mode-cite {
		min-width: 0;
	}
	@container (max-width: 30rem) {
		.mode {
			grid-template-columns: auto minmax(0, 1fr);
		}
		/* The whole row, so the slide number is not cut off on narrow screens. */
		.mode-cite {
			grid-column: 1 / -1;
		}
	}
</style>
