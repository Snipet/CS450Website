<!--
@component
How a run ended: the solution (or why there is none), the node counts, and
whether the solution is a cheapest path.
-->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Callout from '$lib/components/ui/Callout.svelte';
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import { describeResult, formatCount, formatNumber } from '$lib/components/search/describe';
	import type { GraphProblemSpec } from '$lib/theory/graphs';
	import type { SearchResult } from '$lib/theory/search';
	import { optimality, stoppedBy } from './view';

	interface Props {
		result: SearchResult;
		spec: GraphProblemSpec;
	}

	let { result, spec }: Props = $props();

	const sentence = $derived(describeResult(result));
	const opt = $derived(optimality(result, spec));
	const stop = $derived(stoppedBy(result));
	const graph = $derived(result.mode === 'graph');
	const weighted = $derived(result.strategy === 'wastar');
	const alpha = $derived(result.options.weight);

	const stats = $derived([
		{ label: 'Taken off the frontier', value: result.stats.popped },
		{ label: 'Expanded', value: result.stats.expanded },
		{ label: 'Generated', value: result.stats.generated },
		{ label: 'Largest frontier', value: result.stats.maxFrontier },
		...(graph ? [{ label: 'Explored set', value: result.stats.explored }] : [])
	]);
</script>

<div class="result">
	<p class="lead">
		{#if result.solution}
			<Badge tone="accept">Solution</Badge>
		{:else}
			<Badge tone="reject">No solution</Badge>
		{/if}
		<span>{sentence}</span>
	</p>

	<dl class="stats">
		{#each stats as s (s.label)}
			<div class="stat">
				<dt>{s.label}</dt>
				<dd>{formatCount(s.value)}</dd>
			</div>
		{/each}
	</dl>

	<p class="optimal">
		{#if opt.cheapest === true}
			<Badge tone="accept">Cheapest path</Badge>
		{:else if opt.cheapest === false}
			<Badge tone="reject">Not the cheapest path</Badge>
		{/if}
		<span>{opt.text}</span>
		{#if weighted && opt.best && result.solution}
			<span class="aside">
				With an admissible h{result.mode === 'graph' ? ' that is also consistent' : ''}, weighted A*
				returns a path that costs at most α · C* = {formatNumber(alpha)} × {formatNumber(
					opt.best.cost
				)} = {formatNumber(alpha * opt.best.cost)}.
				<CitationTag cite={{ deck: 'informed', slide: 38 }} />
			</span>
		{/if}
	</p>

	{#if stop === 'expansions'}
		<Callout tone="warn">
			The expansion limit stopped this run after {formatCount(result.stats.popped)}
			{result.stats.popped === 1 ? 'node' : 'nodes'} taken off the frontier.
			{#if result.mode === 'tree'}Tree search adds states it has already seen, so on a graph with
				cycles it can go around them forever; Path check and Graph search do not add them again.
			{/if}
		</Callout>
	{:else if stop === 'nodes'}
		<Callout tone="warn">
			The node limit stopped this run after {formatCount(result.stats.generated)} nodes were generated.
		</Callout>
	{/if}
</div>

<style>
	.result {
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.lead,
	.optimal {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-2);
		margin: 0;
		line-height: 1.55;
	}
	.lead span {
		flex: 1 1 16rem;
		min-width: 0;
	}
	.optimal {
		font-size: var(--text-sm);
		color: var(--text-2);
	}
	.optimal > span:not(.aside) {
		flex: 1 1 16rem;
		min-width: 0;
	}
	.aside {
		flex-basis: 100%;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
		margin: 0;
	}
	@container (min-width: 34rem) {
		.stats {
			grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
		}
	}
	.stat {
		min-width: 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	dt {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	dd {
		margin: 2px 0 0;
		color: var(--text);
		font-size: var(--text-lg);
		font-variant-numeric: tabular-nums;
	}
</style>
