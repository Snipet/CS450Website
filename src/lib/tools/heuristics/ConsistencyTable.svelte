<!--
@component
The consistency check on every edge direction (Informed Search, slide 28):
c(n, n') ≥ h(n) − h(n'), i.e. h(n) ≤ c(n, n') + h(n'). Failed checks come
first and are highlighted; a filter shows only them, or only the edges of
the selected state.
-->
<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import { formatValue } from './edit';
	import type { EdgeRow } from './analysis';

	interface Props {
		rows: readonly EdgeRow[];
		selected: string | null;
		onselect?: (id: string) => void;
	}

	let { rows, selected, onselect }: Props = $props();

	type Filter = 'all' | 'failed' | 'selected';
	let filter = $state<Filter>('all');

	const failed = $derived(rows.filter((r) => !r.consistent).length);
	const touching = (r: EdgeRow, id: string | null) => id !== null && (r.from === id || r.to === id);
	const ofSelected = $derived(rows.filter((r) => touching(r, selected)).length);

	const options = $derived([
		{ value: 'all' as Filter, label: `All ${rows.length}` },
		{ value: 'failed' as Filter, label: `Failed ${failed}`, disabled: failed === 0 },
		{
			value: 'selected' as Filter,
			label: selected ? `${selected} ${ofSelected}` : 'Selected state',
			disabled: !selected,
			title: selected ? `Edges from or to ${selected}` : 'Select a state first'
		}
	]);

	// A filter with nothing to show falls back to all rows.
	const active = $derived<Filter>(
		(filter === 'failed' && failed === 0) || (filter === 'selected' && !selected) ? 'all' : filter
	);
	const shown = $derived(
		active === 'failed'
			? rows.filter((r) => !r.consistent)
			: active === 'selected'
				? rows.filter((r) => touching(r, selected))
				: rows
	);
	const n = formatValue;
</script>

<div class="consistency">
	<div class="bar">
		<SegmentedControl
			label="Show edge directions"
			size="sm"
			{options}
			value={active}
			onchange={(v) => (filter = v)}
		/>
	</div>
	<!-- A scrollable region must be focusable to scroll by keyboard. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="wrap" role="region" aria-label="Consistency check per edge direction" tabindex="0">
		<table>
			<caption class="visually-hidden">
				Consistency check per edge direction, failed checks first
			</caption>
			<thead>
				<tr>
					<th scope="col">n → n'</th>
					<th scope="col" class="num">c(n, n')</th>
					<th scope="col" class="num col-h">h(n)</th>
					<th scope="col" class="num col-h">h(n')</th>
					<th scope="col" class="num">h(n) − h(n')</th>
					<th scope="col" class="check">c ≥ h(n) − h(n')</th>
				</tr>
			</thead>
			<tbody>
				{#each shown as r (r.key)}
					<tr class={{ bad: !r.consistent, mine: touching(r, selected) && active !== 'selected' }}>
						<th scope="row">
							<span class="edge">
								{#if onselect}
									<button type="button" class="st" onclick={() => onselect(r.from)}>{r.from}</button
									>
								{:else}{r.from}{/if}
								<span class="arrow" aria-label="to">→</span>
								{#if onselect}
									<button type="button" class="st" onclick={() => onselect(r.to)}>{r.to}</button>
								{:else}{r.to}{/if}
							</span>
						</th>
						<td class="num mono">{n(r.cost)}</td>
						<td class="num mono col-h">{n(r.hFrom)}</td>
						<td class="num mono col-h">{n(r.hTo)}</td>
						<td class="num mono">{n(r.hFrom - r.hTo)}</td>
						<td class="check">
							{#if r.consistent}
								<span class="ok"
									><Icon name="check" size={14} /><span class="visually-hidden">holds</span></span
								>
							{:else}
								<span class="fail">
									<Icon name="x" size={14} />
									<span>{n(r.cost)} &lt; {n(r.hFrom - r.hTo)}: f drops by {n(-r.slack)}</span>
								</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.consistency {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.wrap {
		container-type: inline-size;
		max-height: 26rem;
		min-width: 0;
		overflow: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.wrap:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 5px var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}
	tbody tr:last-child th,
	tbody tr:last-child td {
		border-bottom: 0;
	}
	thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--surface-2);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}
	th:first-child {
		padding-left: var(--space-3);
	}
	tbody th {
		font-weight: 500;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.check {
		min-width: 3rem;
	}
	/* Narrow: c(n, n') against h(n) − h(n') only. */
	@container (max-width: 28rem) {
		.col-h {
			display: none;
		}
		th,
		th:first-child,
		td {
			padding-left: 6px;
			padding-right: 6px;
		}
	}
	tr.bad {
		background: var(--reject-soft);
	}
	tr.mine:not(.bad) {
		background: var(--accent-soft);
	}
	.edge {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 4px;
	}
	.arrow {
		color: var(--text-3);
	}
	.st {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.st:hover {
		color: var(--accent);
		text-decoration: underline;
	}
	.ok {
		display: inline-flex;
		color: var(--accept);
	}
	.fail {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--reject);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.fail :global(svg) {
		flex: none;
	}
</style>
