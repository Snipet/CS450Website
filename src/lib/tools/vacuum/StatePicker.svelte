<script lang="ts">
	import { INITIAL_WORLDS, worldName, type VacuumWorld } from '$lib/theory/agents/vacuum';
	import { describeWorld } from './describe';

	interface Props {
		/** Selected state name, e.g. "A DD". */
		value: string;
		/** Accessible name of the group. */
		label: string;
		onchange: (name: string) => void;
	}

	let { value, label, onchange }: Props = $props();

	const uid = $props.id();
	const options = INITIAL_WORLDS.map((w) => ({ world: w, name: worldName(w) }));
</script>

{#snippet mini(w: VacuumWorld)}
	<svg viewBox="0 0 56 26" aria-hidden="true">
		<rect class="cell" x="1" y="1" width="27" height="24" />
		<rect class="cell" x="28" y="1" width="27" height="24" />
		{#each ['A', 'B'] as const as s, i (s)}
			{#if w.dirt[s]}
				{@const x = 1 + 27 * i}
				<circle class="dirt" cx={x + 8} cy="19" r="2.4" />
				<circle class="dirt" cx={x + 13.5} cy="20" r="2" />
				<circle class="dirt" cx={x + 18.5} cy="18.5" r="2.4" />
				<circle class="dirt" cx={x + 11} cy="15.5" r="1.7" />
				<circle class="dirt" cx={x + 16} cy="15" r="1.5" />
			{/if}
		{/each}
		<rect class="agent" x={w.location === 'A' ? 8 : 35} y="5" width="13" height="7" rx="3.5" />
	</svg>
{/snippet}

<div class="picker" role="radiogroup" aria-label={label}>
	{#each options as opt (opt.name)}
		<label class="option" title={describeWorld(opt.world)}>
			<input
				type="radio"
				name="initial-{uid}"
				value={opt.name}
				checked={opt.name === value}
				aria-label="{opt.name}. {describeWorld(opt.world)}"
				onchange={() => onchange(opt.name)}
			/>
			<span class="face">
				{@render mini(opt.world)}
				<span class="name">{opt.name}</span>
			</span>
		</label>
	{/each}
</div>

<style>
	.picker {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
		gap: var(--space-2);
		max-width: 44rem;
	}
	.option {
		position: relative;
		display: flex;
		cursor: pointer;
	}
	input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		pointer-events: none;
	}
	.face {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 6px 4px 4px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		transition:
			border-color var(--duration) var(--ease),
			background var(--duration) var(--ease);
	}
	.option:hover .face {
		border-color: var(--border-strong);
	}
	input:checked + .face {
		border-color: var(--accent);
		background: var(--accent-soft);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	input:focus-visible + .face {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	svg {
		display: block;
		width: 56px;
		height: 26px;
	}
	.cell {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1;
	}
	.dirt {
		fill: var(--tok-5);
	}
	.agent {
		fill: var(--node-stroke);
	}
	.name {
		color: var(--text-2);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-variant-ligatures: none;
		white-space: nowrap;
	}
	input:checked + .face .name {
		color: var(--text);
		font-weight: 600;
	}
</style>
