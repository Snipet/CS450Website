<!--
@component
One search on the grid: its name and queue, the drawing at the current step,
and its counters.
-->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import {
		formatCount,
		formatNumber,
		queueName,
		strategyName
	} from '$lib/components/search/describe';
	import type { Grid } from '$lib/theory/grid';
	import type { StrategyId } from '$lib/theory/search';
	import GridBoard from './GridBoard.svelte';
	import { formatCost } from './describe';
	import { isOptimalCost, type CellLayers, type RunStats } from './view';

	interface Props {
		strategy: StrategyId;
		/** α, shown for weighted A*. */
		weight: number;
		grid: Grid;
		layers: CellLayers;
		stats: RunStats;
		/** Cost of an optimal path (uniform-cost search), or null when there is none. */
		optimal: number | null;
		/** Accessible description of the drawing. */
		label: string;
		editable?: boolean;
		onedit?: (grid: Grid) => void;
		helpId?: string;
		maxHeight?: number;
		/** Heading level of the search name. */
		level?: 2 | 3;
	}

	let {
		strategy,
		weight,
		grid,
		layers,
		stats,
		optimal,
		label,
		editable = false,
		onedit,
		helpId,
		maxHeight,
		level = 3
	}: Props = $props();

	const queue = $derived(
		strategy === 'wastar'
			? `Priority queue ordered by g(n) + ${formatNumber(weight)}·h(n)`
			: queueName(strategy)
	);
	const optimalPath = $derived(stats.path ? isOptimalCost(stats.path.cost, optimal) : false);
</script>

<section class="run" aria-label={strategyName(strategy)}>
	<header class="run-head">
		<svelte:element this={`h${level}`} class="name">{strategyName(strategy)}</svelte:element>
		<span class="queue">{queue}</span>
	</header>

	<GridBoard {grid} {layers} {label} {editable} {onedit} {helpId} {maxHeight} />

	<dl class="stats">
		<div class="stat">
			<dt>Expanded</dt>
			<dd>{formatCount(stats.expanded)}</dd>
		</div>
		<div class="stat">
			<dt>Generated</dt>
			<dd>{formatCount(stats.generated)}</dd>
		</div>
		<div class="stat">
			<dt>Frontier</dt>
			<dd>
				{formatCount(stats.frontier)}
				<span class="sub">max {formatCount(stats.maxFrontier)}</span>
			</dd>
		</div>
		<div class="stat wide">
			<dt>Path</dt>
			<dd>
				{#if stats.path}
					{formatCount(stats.path.moves)}
					{stats.path.moves === 1 ? 'move' : 'moves'}<span class="muted"> · cost </span><span
						class="cost">{formatCost(stats.path.cost)}</span
					>
					{#if optimalPath}
						<Badge tone="accept">Optimal</Badge>
					{:else if optimal !== null}
						<Badge tone="reject">Not optimal</Badge>
					{/if}
				{:else if stats.failed}
					<span class="muted">No path to the goal</span>
				{:else}
					<span class="muted">Not found yet</span>
				{/if}
			</dd>
		</div>
	</dl>
	{#if stats.path && optimal !== null && !optimalPath}
		<p class="note">
			Optimal cost {formatCost(optimal)}{#if strategy === 'wastar'}; weighted A* guarantees at most
				<span class="nowrap"
					>α · C* = {formatNumber(weight)} × {formatCost(optimal)} = {formatCost(
						weight * optimal
					)}</span
				>
				with an admissible h{/if}.
		</p>
	{/if}
</section>

<style>
	.run {
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.run-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
	}
	.name {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
	}
	.queue {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-2);
		margin: 0;
	}
	.stat {
		min-width: 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.stat.wide {
		grid-column: 1 / -1;
	}
	@container (min-width: 44rem) {
		.stats {
			grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 2fr);
		}
		.stat.wide {
			grid-column: auto;
		}
	}
	dt {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	dd {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 var(--space-1);
		margin: 2px 0 0;
		color: var(--text);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}
	dd :global(.badge) {
		margin-left: var(--space-1);
	}
	.muted {
		color: var(--text-3);
		white-space: pre;
	}
	.sub {
		flex-basis: 100%;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.cost {
		font-family: var(--font-mono);
	}
	.nowrap {
		white-space: nowrap;
	}
	.note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.5;
	}
</style>
