<script lang="ts">
	import { toneStyle } from '$lib/components/ui/tones';
	import { DIMENSIONS, STANDARDS, approachAt, type ApproachId } from './content';

	interface Props {
		selected: ApproachId;
		onselect: (id: ApproachId) => void;
		/** Id of the element that shows the selected approach. */
		controls?: string;
	}

	let { selected, onselect, controls }: Props = $props();
</script>

<table class="dims">
	<caption class="visually-hidden">Dimensions of AI definitions</caption>
	<thead>
		<tr>
			<td class="corner"></td>
			{#each STANDARDS as s (s.id)}
				<th scope="col">{s.label}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each DIMENSIONS as d (d.id)}
			<tr>
				<th scope="row"><span class="row-label">{d.label}</span></th>
				{#each STANDARDS as s (s.id)}
					{@const a = approachAt(d.id, s.id)}
					<td>
						<button
							type="button"
							class="cell"
							style={toneStyle(a.tone)}
							aria-pressed={selected === a.id}
							aria-controls={controls}
							onclick={() => onselect(a.id)}
						>
							<span class="title">{a.title}</span>
							<span class="approach">{a.approach}</span>
						</button>
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.dims {
		table-layout: fixed;
		border-collapse: separate;
		border-spacing: var(--space-2);
		margin: calc(-1 * var(--space-2));
		width: calc(100% + 2 * var(--space-2));
	}
	.corner {
		width: 4.75rem;
	}
	thead th {
		padding: 0 var(--space-1);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-align: left;
		text-transform: uppercase;
	}
	tbody th {
		padding: 0;
		text-align: left;
		vertical-align: middle;
	}
	.row-label {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	td {
		padding: 0;
		height: 1px; /* lets the button fill the cell height */
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		width: 100%;
		height: 100%;
		min-height: 6.25rem;
		padding: var(--space-3) var(--space-3) var(--space-3);
		border: 1px solid var(--border);
		border-top: 4px solid var(--tone-fg);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		color: var(--text);
		text-align: left;
		cursor: pointer;
		transition:
			background var(--duration) var(--ease),
			border-color var(--duration) var(--ease),
			box-shadow var(--duration) var(--ease);
	}
	.cell:hover {
		border-color: var(--border-strong);
		border-top-color: var(--tone-fg);
		box-shadow: var(--shadow);
	}
	.cell[aria-pressed='true'] {
		border-color: var(--tone-fg);
		background: var(--tone-bg);
		box-shadow: 0 0 0 1px var(--tone-fg);
	}
	.title {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.2;
	}
	.approach {
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.4;
	}
	@media (max-width: 420px) {
		.corner {
			width: 3.6rem;
		}
		.row-label {
			font-size: 0.6875rem;
			letter-spacing: 0.03em;
		}
		.cell {
			min-height: 5.5rem;
			padding: var(--space-2);
		}
		.title {
			font-size: var(--text-base);
		}
	}
</style>
