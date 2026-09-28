<!--
@component
The expansion order of a run up to a step: every node taken off the frontier,
in order, written like the slides. IDS lists one row per depth limit.
-->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatCount } from '$lib/components/search/describe';
	import type { SearchResult } from '$lib/theory/search';
	import OrderText from './OrderText.svelte';
	import { iterationRows, orderProgress, type IterationRow } from './view';

	interface Props {
		result: SearchResult;
		/** From `popCounts(result)`. */
		pops: readonly number[];
		step: number;
	}

	let { result, pops, step }: Props = $props();

	const progress = $derived(orderProgress(pops, step));
	const rows = $derived(result.strategy === 'ids' ? iterationRows(result, pops, step) : []);
	const total = $derived(result.order.length);
	const finished = $derived(step >= result.steps.length - 1);

	const OUTCOME: Record<
		IterationRow['outcome'],
		{ text: string; tone: 'accept' | 'reject' | 'muted' }
	> = {
		found: { text: 'Goal found', tone: 'accept' },
		cutoff: { text: 'Nodes cut off', tone: 'reject' },
		exhausted: { text: 'Nothing cut off', tone: 'muted' },
		limit: { text: 'Stopped by the limit', tone: 'reject' }
	};
</script>

<div class="expansion">
	<p class="count">
		{formatCount(progress.taken)} of {formatCount(total)}
		{total === 1 ? 'node' : 'nodes'} taken off the frontier{result.strategy === 'dls'
			? ` (depth limit ${result.options.depthLimit})`
			: ''}
	</p>
	{#if rows.length}
		<ol class="iterations" aria-label="Iterations">
			{#each rows as row (row.limit)}
				<li class={['iteration', row.status]}>
					<div class="head">
						<span class="limit">Depth limit {row.limit}</span>
						{#if row.status === 'done' || (row.status === 'current' && finished)}
							<Badge tone={OUTCOME[row.outcome].tone}>{OUTCOME[row.outcome].text}</Badge>
						{/if}
					</div>
					<OrderText
						order={row.order}
						taken={row.taken}
						current={row.current}
						label="Depth limit {row.limit}"
						compact
					/>
				</li>
			{/each}
		</ol>
	{:else}
		<OrderText
			order={result.order}
			taken={progress.taken}
			current={progress.current}
			label="Expansion order"
			maxHeight={196}
		/>
	{/if}
</div>

<style>
	.expansion {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.count {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}
	.iterations {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.iteration {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.iteration.current {
		border-color: var(--active);
		box-shadow: inset 3px 0 var(--active);
	}
	.iteration.later {
		background: var(--surface-2);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1) var(--space-2);
	}
	.limit {
		color: var(--text-2);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
</style>
