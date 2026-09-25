<!--
@component
One A* (or weighted A*) run with the tool's heuristic: the path it returns,
its cost against C*, the node counts, and a link to step through it in the
search tool.
-->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatCount } from '$lib/components/search/describe';
	import { formatValue } from './edit';
	import { stopReason, type RunReport } from './analysis';

	interface Props {
		title: string;
		/** A short note under the title. */
		note?: string;
		run: RunReport;
		cStar: number | null;
		/** Link to the search tool on this run, or null. */
		href?: string | null;
		/** Heading level of the title. */
		level?: 3 | 4;
	}

	let { title, note, run, cStar, href = null, level = 3 }: Props = $props();
</script>

<section class="run" aria-label={title}>
	<header>
		<svelte:element this={`h${level}`} class="title">{title}</svelte:element>
		{#if note}<span class="note">{note}</span>{/if}
	</header>

	<p class="outcome">
		{#if run.cost !== null}
			<span class="cost"
				><span class="label">Cost</span> <span class="mono">{formatValue(run.cost)}</span></span
			>
			{#if run.optimal === true}
				<Badge tone="accept">Optimal</Badge>
			{:else if run.optimal === false}
				<Badge tone="reject">Not optimal</Badge>
			{/if}
			{#if cStar !== null && run.optimal === false}
				<span class="vs">C* = {formatValue(cStar)}</span>
			{/if}
		{:else if run.stopped}
			<Badge tone="muted">Stopped</Badge>
			<span class="vs">{stopReason(run)}</span>
		{:else}
			<Badge tone="reject">No solution</Badge>
			<span class="vs">the frontier ran empty</span>
		{/if}
	</p>
	{#if run.states}
		<p class="path">{run.states.join(' → ')}</p>
	{/if}

	<dl class="stats">
		<div class="stat">
			<dt>Expanded</dt>
			<dd>{formatCount(run.expanded)}</dd>
		</div>
		<div class="stat">
			<dt>Generated</dt>
			<dd>{formatCount(run.generated)}</dd>
		</div>
	</dl>

	{#if href}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
		<a class="link" {href}
			><Icon name="arrow-right" size={14} /> Step through it in the search tool</a
		>
	{/if}
</section>

<style>
	.run {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 var(--space-2);
	}
	.title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-weight: 600;
	}
	.note {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.outcome {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		margin: 0;
	}
	.cost {
		font-size: var(--text-lg);
		font-variant-numeric: tabular-nums;
	}
	.label {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.vs {
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.path {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
	}
	.stat {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
	}
	dt {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		align-self: flex-start;
		font-size: var(--text-sm);
	}
</style>
