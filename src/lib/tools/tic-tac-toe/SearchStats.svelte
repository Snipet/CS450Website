<!--
@component
Nodes visited by minimax and by alpha-beta under three move orderings, from
the current position and from the empty board. Bars are to scale with
minimax in the same column.
-->
<script lang="ts">
	import { formatCount } from '$lib/theory/search';
	import { percent, type StatsRow } from './analysis';

	interface Props {
		current: readonly StatsRow[];
		empty: readonly StatsRow[];
		/** The current position is the empty board: one column is enough. */
		same?: boolean;
	}

	let { current, empty, same = false }: Props = $props();

	const plural = (n: number, word: string) => `${formatCount(n)} ${word}${n === 1 ? '' : 's'}`;

	const columns = $derived(
		same
			? [{ id: 'empty', title: 'From the empty board', rows: empty }]
			: [
					{ id: 'current', title: 'From this position', rows: current },
					{ id: 'empty', title: 'From the empty board', rows: empty }
				]
	);
</script>

<div class="stats">
	{#each columns as col (col.id)}
		{@const whole = col.rows[0].counts.nodes}
		<section class="col" aria-labelledby="stats-{col.id}">
			<h3 id="stats-{col.id}">{col.title}</h3>
			<ul>
				{#each col.rows as row (row.id)}
					{@const c = row.counts}
					<li class={['row', { minimax: row.ordering === null }]}>
						<div class="line">
							<span class="label">{row.label}</span>
							<span class="nodes mono">{formatCount(c.nodes)}</span>
						</div>
						<div class="bar" aria-hidden="true">
							<span style="width: max(2px, {(100 * c.nodes) / whole}%)"></span>
						</div>
						<div class="detail">
							{#if row.ordering === null}
								{plural(c.terminals, 'terminal state')}
							{:else}
								{percent(c.nodes, whole)} of minimax · {formatCount(c.terminals)} terminal · {plural(
									c.cutoffs,
									'cutoff'
								)}
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: var(--space-4) var(--space-5);
	}
	h3 {
		margin: 0 0 var(--space-2);
		color: var(--text-3);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
	}
	.label {
		min-width: 0;
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.nodes {
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.bar {
		height: 8px;
		margin: 4px 0 3px;
		border-radius: 4px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		border-radius: 4px;
		background: var(--explored);
	}
	.minimax .bar span {
		background: var(--text-3);
	}
	.detail {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
</style>
