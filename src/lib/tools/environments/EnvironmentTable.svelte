<script lang="ts">
	import { IconButton, toneStyle } from '$lib/components/ui';
	import { DIMENSIONS, valueInfo } from '$lib/theory/agents/environments';
	import { columnName, columnProfile, type Column } from './state';
	import { columnSource, valueTone } from './view';

	interface Props {
		columns: readonly Column[];
		selected: string | null;
		onselect: (key: string) => void;
		onremove: (key: string) => void;
	}

	let { columns, selected, onselect, onremove }: Props = $props();

	const uid = $props.id();

	const view = $derived(
		columns.map((column) => ({
			key: column.key,
			name: columnName(column),
			profile: columnProfile(column),
			source: columnSource(column)
		}))
	);

	/** Clicking anywhere in a column selects it (the header button does the same by keyboard). */
	function onTableClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('button')) return;
		const cell = target.closest<HTMLElement>('[data-key]');
		if (cell?.dataset.key) onselect(cell.dataset.key);
	}
</script>

<!-- The scroll box is focusable so the table can be scrolled with the keyboard. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="scroller" tabindex="0" role="region" aria-labelledby="{uid}-caption">
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<table onclick={onTableClick}>
		<caption id="{uid}-caption" class="visually-hidden">
			Environment types, one column per environment
		</caption>
		<thead>
			<tr>
				<th scope="col" class="corner"><span class="visually-hidden">Dimension</span></th>
				{#each view as col (col.key)}
					{@const isSelected = col.key === selected}
					<th scope="col" class={['col-head', { selected: isSelected }]} data-key={col.key}>
						<div class="head">
							<button
								type="button"
								class="name"
								data-column={col.key}
								aria-pressed={isSelected}
								title="Show details of {col.name}"
								onclick={() => onselect(col.key)}
							>
								{col.name}
							</button>
							<IconButton
								icon="x"
								size="sm"
								label="Remove {col.name}"
								class="remove"
								onclick={() => onremove(col.key)}
							/>
						</div>
						<span
							class={['tag', col.source.text.toLowerCase().replace(/\s+/g, '-')]}
							title={col.source.title}>{col.source.text}</span
						>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each DIMENSIONS as d (d.id)}
				<tr>
					<th scope="row" class="row-head">{d.label}</th>
					{#each view as col (col.key)}
						{@const value = col.profile[d.id]}
						{@const info = valueInfo(d.id, value)}
						<td class={{ selected: col.key === selected }} data-key={col.key}>
							{#if info}
								<span class="value" style={toneStyle(valueTone(d.id, value))} title={info.name}>
									<span class="dot" aria-hidden="true"></span>{info.label}
								</span>
							{:else}
								<span class="unset" title="Not set"
									><span aria-hidden="true">—</span><span class="visually-hidden">Not set</span
									></span
								>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroller {
		/* Contains the visually hidden labels, which would otherwise widen the page. */
		position: relative;
		overflow-x: auto;
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		scrollbar-width: thin;
	}
	.scroller:focus-visible {
		outline-offset: -2px;
	}
	table {
		width: 100%;
		font-size: var(--text-sm);
		border-collapse: separate;
		border-spacing: 0;
	}
	th,
	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}
	tbody tr:last-child th,
	tbody tr:last-child td {
		border-bottom: 0;
	}
	/* Row labels stay in view while the columns scroll. */
	.corner,
	.row-head {
		position: sticky;
		left: 0;
		z-index: 1;
		background: var(--surface);
		box-shadow: inset -1px 0 var(--border);
	}
	.row-head {
		color: var(--text-2);
		font-weight: 500;
		white-space: nowrap;
		padding-left: var(--space-4);
	}
	.col-head {
		min-width: 8.5rem;
		max-width: 11rem;
		padding-top: var(--space-3);
		vertical-align: bottom;
		border-top: 3px solid transparent;
		cursor: pointer;
	}
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-1);
	}
	.name {
		flex: 1;
		min-width: 0;
		margin: -2px 0 0 -4px;
		padding: 2px 4px;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text);
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-weight: 600;
		line-height: 1.25;
		text-align: left;
		cursor: pointer;
	}
	.name:hover {
		color: var(--accent);
	}
	.head :global(.remove) {
		width: 24px;
		height: 24px;
		margin: -2px -6px 0 0;
		color: var(--text-3);
	}
	.tag {
		display: inline-block;
		margin-top: 2px;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: 0.02em;
	}
	.tag.edited {
		color: var(--active);
	}
	.tag.custom {
		color: var(--accent);
	}
	td {
		cursor: pointer;
		white-space: nowrap;
	}
	.value {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		color: var(--text);
	}
	.dot {
		flex: none;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--tone-fg);
		box-shadow: 0 0 0 2px var(--tone-bg);
	}
	.unset {
		color: var(--text-3);
		padding-left: 16px;
	}
	.selected {
		background: var(--accent-soft);
	}
	th.selected {
		border-top-color: var(--accent);
	}
	@media (max-width: 480px) {
		th,
		td {
			padding: var(--space-2);
		}
		.row-head {
			padding-left: var(--space-3);
		}
		.col-head {
			min-width: 7.5rem;
		}
	}
</style>
