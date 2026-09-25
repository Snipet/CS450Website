<!--
@component
A one-line summary of the checks: admissible, consistent, and the cost A*
tree and graph search return against C*.
-->
<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatValue } from './edit';
	import type { RunReport, Verdicts } from './analysis';

	interface Props {
		v: Verdicts;
		tree: RunReport;
		graph: RunReport;
	}

	let { v, tree, graph }: Props = $props();

	const n = formatValue;
	const runText = (r: RunReport) =>
		r.cost === null
			? r.stopped
				? 'stopped'
				: 'no solution'
			: `${n(r.cost)}${r.optimal === true ? ' = C*' : r.optimal === false ? ' > C*' : ''}`;

	const items = $derived([
		{
			key: 'admissible',
			label: 'Admissible',
			ok: v.admissible,
			value: v.admissible ? 'yes' : `no (${v.over.length})`
		},
		{
			key: 'consistent',
			label: 'Consistent',
			ok: v.consistent,
			value: v.consistent ? 'yes' : `no (${v.violations.length})`
		},
		{ key: 'tree', label: 'A* tree', ok: tree.optimal !== false, value: runText(tree) },
		{ key: 'graph', label: 'A* graph', ok: graph.optimal !== false, value: runText(graph) }
	]);
</script>

<ul class="strip" aria-label="Summary">
	{#each items as item (item.key)}
		<li class={['item', item.ok ? 'ok' : 'bad']}>
			<Icon name={item.ok ? 'check' : 'x'} size={13} />
			<span class="label">{item.label}</span>
			<span class="value">{item.value}</span>
		</li>
	{/each}
</ul>

<style>
	.strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.item {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 10px 3px 8px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		font-size: var(--text-xs);
		line-height: 1.5;
	}
	.item.ok :global(svg) {
		color: var(--accept);
	}
	.item.bad {
		border-color: color-mix(in srgb, var(--reject) 45%, var(--border));
		background: var(--reject-soft);
	}
	.item.bad :global(svg) {
		color: var(--reject);
	}
	.label {
		color: var(--text-2);
	}
	.value {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
</style>
