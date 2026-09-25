<script lang="ts">
	import { toneStyle } from '$lib/components/ui/tones';
	import { DIMENSIONS, STANDARDS, approachAt, type ApproachId } from './content';

	interface Props {
		/** The approach the item is in, or null while unplaced. */
		value: ApproachId | null;
		/** Accessible name of the group, e.g. "Approach for Medicine". */
		label: string;
		/** Prefix for the radio ids (`${idPrefix}-${approach}`), used to restore focus. */
		idPrefix: string;
		onchange: (id: ApproachId) => void;
	}

	let { value, label, idPrefix, onchange }: Props = $props();

	/** Row by row, as in the table. */
	const cells = DIMENSIONS.flatMap((d) => STANDARDS.map((s) => approachAt(d.id, s.id)));
</script>

<div class="picker" role="radiogroup" aria-label={label}>
	{#each cells as a (a.id)}
		<input
			type="radio"
			id="{idPrefix}-{a.id}"
			name={idPrefix}
			value={a.id}
			checked={value === a.id}
			aria-label={a.title}
			title={a.title}
			style={toneStyle(a.tone)}
			onchange={() => onchange(a.id)}
		/>
	{/each}
</div>

<style>
	.picker {
		display: grid;
		grid-template-columns: repeat(2, var(--cell));
		gap: 2px;
		flex: none;
		--cell: 13px;
	}
	input {
		appearance: none;
		width: var(--cell);
		height: var(--cell);
		margin: 0;
		border: 1.5px solid var(--border-strong);
		border-radius: 3px;
		background: var(--surface);
		cursor: pointer;
		transition:
			background var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}
	input:hover {
		border-color: var(--tone-fg);
		background: var(--tone-bg);
	}
	input:checked {
		border-color: var(--tone-fg);
		background: var(--tone-fg);
	}
	input:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	@media (pointer: coarse) {
		.picker {
			--cell: 20px;
			gap: 3px;
		}
	}
</style>
