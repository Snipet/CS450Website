<!--
	Horizontal bars of one count per strategy (nodes generated, expanded, or
	the largest frontier). A list, so every value is read as text; the bars
	are decoration. Runs without a solution are drawn outlined.
-->
<script lang="ts">
	import { strategyShort } from '$lib/components/search/describe';
	import { formatCount } from '$lib/theory/search';
	import { outcomeText, type ComparisonRow } from './compare';
	import { chartBars, type ChartMetric } from './chart';

	interface Props {
		rows: readonly ComparisonRow[];
		metric: ChartMetric;
		/** Accessible name of the list. */
		label: string;
	}

	let { rows, metric, label }: Props = $props();

	const bars = $derived(chartBars(rows, metric));
	const anyFailed = $derived(bars.some((b) => !b.found));
	const anyClipped = $derived(bars.some((b) => b.clipped));
</script>

<div class="wrap">
	<ul class="chart" aria-label={label}>
		{#each bars as bar (bar.strategy)}
			<li class:failed={!bar.found} class:clipped={bar.clipped}>
				<span class="label">{strategyShort(bar.strategy)}</span>
				<span class="track" aria-hidden="true">
					<span class="bar" style="width: {bar.percent}%"></span>
				</span>
				<span class="value">
					{formatCount(bar.value)}{#if !bar.found}<span class="flag">
							<span class="sep" aria-hidden="true">·</span>
							{outcomeText(bar.outcome).toLowerCase()}</span
						>{/if}
				</span>
			</li>
		{/each}
	</ul>
</div>
{#if anyFailed || anyClipped}
	<p class="note">
		{#if anyFailed}Outlined bars: no solution returned.{/if}
		{#if anyClipped}Bars are scaled to the runs that found a solution; a gap near the end marks a
			bar cut short.{/if}
	</p>
{/if}

<style>
	.wrap {
		container-type: inline-size;
		min-width: 0;
	}
	.chart {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 6px var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}
	li {
		display: contents;
	}
	.label {
		font-weight: 500;
		white-space: nowrap;
	}
	.track {
		position: relative;
		height: 14px;
		border-radius: 3px;
		background: var(--surface-2);
	}
	.bar {
		position: absolute;
		inset: 0 auto 0 0;
		min-width: 2px;
		border-radius: 3px;
		background: var(--accent);
	}
	.failed .bar {
		border: 1.5px solid var(--reject);
		background: var(--reject-soft);
	}
	/* Beyond the scale: a gap cut near the end of the bar. */
	.clipped .bar {
		-webkit-mask: linear-gradient(
			90deg,
			#000 calc(100% - 14px),
			transparent calc(100% - 14px),
			transparent calc(100% - 9px),
			#000 calc(100% - 9px)
		);
		mask: linear-gradient(
			90deg,
			#000 calc(100% - 14px),
			transparent calc(100% - 14px),
			transparent calc(100% - 9px),
			#000 calc(100% - 9px)
		);
	}
	.value {
		font-variant-numeric: tabular-nums;
		text-align: right;
		white-space: nowrap;
	}
	.flag {
		color: var(--reject);
		font-size: var(--text-xs);
	}
	.note {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.sep {
		margin: 0 2px;
		color: var(--text-3);
	}
	/* Narrow: the outcome is left to the outlined bar and the note (still read out). */
	@container (max-width: 400px) {
		.flag {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
		}
		.failed .value {
			color: var(--reject);
		}
	}
</style>
