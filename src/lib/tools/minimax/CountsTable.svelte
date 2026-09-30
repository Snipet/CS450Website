<!--
@component
Plain minimax next to alpha-beta with each move ordering: nodes visited,
terminal utilities and evaluation values looked up, and subtrees pruned. On
uniform trees, the counts b^d and b^⌈d/2⌉ + b^⌊d/2⌋ − 1 (perfect ordering).
-->
<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import type { Ordering } from '$lib/theory/games';
	import type { Algorithm, CountsTable } from './view';

	interface Props {
		table: CountsTable;
		/** The configuration on screen, marked in the table. */
		algorithm: Algorithm;
		ordering: Ordering;
		/** Whether a depth cutoff is on (evaluation values are counted with the terminal utilities). */
		cutoff: boolean;
	}

	let { table, algorithm, ordering, cutoff }: Props = $props();

	const ORDER_NAMES: Record<Ordering, string> = {
		given: 'Alpha-beta, given order',
		'best-first': 'Alpha-beta, best moves first',
		'worst-first': 'Alpha-beta, worst moves first'
	};

	const fmt = (n: number) => n.toLocaleString('en-US');
	const rows = $derived([
		{ key: 'minimax', name: 'Minimax', counts: table.minimax, on: algorithm === 'minimax' },
		...table.orderings.map((o) => ({
			key: o.ordering,
			name: ORDER_NAMES[o.ordering],
			counts: o.counts,
			on: algorithm === 'alphabeta' && ordering === o.ordering
		}))
	]);
</script>

<div class="counts">
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th scope="col">Search</th>
					<th scope="col" class="num">Nodes visited</th>
					<th scope="col" class="num"
						>{cutoff ? 'Utilities and evaluations' : 'Terminal utilities'}</th
					>
					<th scope="col" class="num">Subtrees pruned</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as r (r.key)}
					<tr class={{ on: r.on }} aria-current={r.on ? 'true' : undefined}>
						<th scope="row">{r.name}</th>
						<td class="num"
							>{fmt(r.counts.visited)} <span class="of">of {fmt(r.counts.total)}</span></td
						>
						<td class="num">{fmt(r.counts.evaluated)}</td>
						<td class="num">{fmt(r.counts.pruned)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if table.uniform}
		{@const u = table.uniform}
		<p class="note">
			Uniform tree, b = {u.b}, d = {u.d}: minimax looks at b<sup>d</sup> = {fmt(u.all)}
			{cutoff ? 'nodes at the cutoff' : 'terminal nodes'}; alpha-beta with perfect ordering at b<sup
				>⌈d/2⌉</sup
			>
			+ b<sup>⌊d/2⌋</sup> − 1 = {fmt(u.perfect)}. With perfect ordering, the time to find the best
			move is reduced to O(b<sup>m/2</sup>) from O(b<sup>m</sup>).
			<CitationTag cite={{ deck: 'adversarial', slide: 23 }} />
		</p>
	{/if}
</div>

<style>
	.counts {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	table {
		width: 100%;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 6px var(--space-3);
		text-align: left;
		border-bottom: 1px solid var(--border);
	}
	tbody tr:last-child > * {
		border-bottom: 0;
	}
	thead th {
		background: var(--surface-2);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.03em;
	}
	tbody th {
		font-weight: 500;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.of {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	tr.on > * {
		background: var(--accent-soft);
	}
	tr.on th {
		font-weight: 650;
	}
	.note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
</style>
