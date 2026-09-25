<!--
	Typical search costs for the 8-puzzle (Informed Search, slide 36): average
	number of nodes expanded for solution depths 12 and 24.
-->
<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { SLIDE_START } from '$lib/theory/puzzle';
	import { EIGHT_PUZZLE_COSTS, formatCount } from '$lib/theory/search';
	import { toolLink } from '$lib/tools/links';

	const puzzleLink = toolLink('eight-puzzle', { start: SLIDE_START });

	const ROWS: { label: string; value: (r: (typeof EIGHT_PUZZLE_COSTS)[number]) => string }[] = [
		{ label: 'IDS', value: (r) => r.ids },
		{ label: 'A*(h1)', value: (r) => formatCount(r.astarH1) },
		{ label: 'A*(h2)', value: (r) => formatCount(r.astarH2) }
	];
</script>

<div class="costs">
	<p class="lead">Average number of nodes expanded for different solution depths.</p>
	<table>
		<thead>
			<tr>
				<th scope="col"><span class="visually-hidden">Algorithm</span></th>
				{#each EIGHT_PUZZLE_COSTS as r (r.depth)}
					<th scope="col" class="num"><i>d</i> = {r.depth}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each ROWS as row (row.label)}
				<tr>
					<th scope="row">{row.label}</th>
					{#each EIGHT_PUZZLE_COSTS as r (r.depth)}
						<td class="num">{row.value(r)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="note">h1: misplaced tiles; h2: total Manhattan distance.</p>
	<div class="foot">
		<CitationTag cite={{ deck: 'informed', slide: 36 }} />
		{#if puzzleLink}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
			<a href={puzzleLink}
				><Icon name="arrow-right" size={14} /> Solve boards in the 8-puzzle tool</a
			>
		{/if}
	</div>
</div>

<style>
	.costs {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.lead,
	.note {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-2);
	}
	.note {
		color: var(--text-3);
	}
	table {
		width: 100%;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
	}
	th:first-child {
		padding-left: 0;
	}
	th:last-child,
	td:last-child {
		padding-right: 0;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	tbody th {
		font-weight: 500;
		white-space: nowrap;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		font-size: var(--text-sm);
	}
	.foot a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
</style>
