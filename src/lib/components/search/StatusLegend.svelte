<!--
@component
Legend for the search drawings: a swatch and caption for each status color in
use (docs/ARCHITECTURE.md §3.2). Build `items` with `graphLegend` or
`treeLegend` from `legend.ts`, or list keys directly.
-->
<script lang="ts">
	import { LEGEND_TEXT, type LegendKey } from './legend';

	interface Props {
		items: readonly LegendKey[];
		/** Swatch shape: graph circles, Romania-map squares, or search-tree pills. */
		shape?: 'circle' | 'square' | 'pill';
		/** Caption overrides, e.g. { explored: 'Explored set' }. */
		labels?: Partial<Record<LegendKey, string>>;
		class?: string;
	}

	let { items, shape = 'circle', labels = {}, class: className }: Props = $props();
</script>

{#snippet outline(cls: string, grow = 0)}
	{#if shape === 'pill'}
		<rect
			class={cls}
			x={3 - grow}
			y={3 - grow}
			width={20 + 2 * grow}
			height={12 + 2 * grow}
			rx={6 + grow}
		/>
	{:else if shape === 'square'}
		<rect class={cls} x={8 - grow} y={4 - grow} width={10 + 2 * grow} height={10 + 2 * grow} />
	{:else}
		<circle class={cls} cx="13" cy="9" r={6 + grow} />
	{/if}
{/snippet}

{#if items.length}
	<ul class={['legend', `shape-${shape}`, className]} aria-label="Legend">
		{#each items as key (key)}
			<li>
				<svg class="swatch" width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
					{#if key === 'path'}
						<line class="path-line" x1="2" y1="9" x2="24" y2="9" />
					{:else if key === 'heuristic'}
						<text class="h" x="13" y="9.5">h</text>
					{:else if key === 'goal'}
						<!-- Graphs ring goal states; trees also fill the goal node that was found. -->
						{@render outline('goal-ring', 2.5)}
						{@render outline(shape === 'pill' ? 'shape goal' : 'shape')}
					{:else if (key === 'dropped' || key === 'cutoff') && shape !== 'pill'}
						<!-- State graphs ring a state whose node was not added or was cut off. -->
						{@render outline('shape')}
						{@render outline('drop-ring', 3)}
					{:else}
						{@render outline(`shape ${key}`)}
						{#if key === 'dropped'}
							<path class="cross" d="M7 5.5 19 12.5M19 5.5 7 12.5" />
						{/if}
					{/if}
				</svg>
				<span>{labels[key] ?? LEGEND_TEXT[key]}</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-xs);
		color: var(--text-2);
	}
	li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}
	.swatch {
		flex: none;
		overflow: visible;
	}
	.shape {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1.4;
	}
	.shape.current {
		fill: var(--active-soft);
		stroke: var(--active);
		stroke-width: 2.2;
	}
	.shape.frontier {
		fill: var(--node-fill);
		stroke: var(--info);
		stroke-width: 2.2;
	}
	.shape.expanded,
	.shape.explored {
		fill: var(--explored-soft);
		stroke: var(--explored);
	}
	.shape.goal {
		fill: var(--accept-soft);
		stroke: var(--accept);
		stroke-width: 1.6;
	}
	.goal-ring {
		fill: none;
		stroke: var(--accept);
		stroke-width: 1.4;
	}
	.shape.dropped,
	.shape.cutoff {
		fill: var(--reject-soft);
		stroke: var(--reject);
		stroke-width: 1.4;
		stroke-dasharray: 3 2;
	}
	.drop-ring {
		fill: none;
		stroke: var(--reject);
		stroke-width: 1.4;
		stroke-dasharray: 3 2;
	}
	.shape.replaced {
		fill: var(--node-fill);
		stroke: var(--dead);
		stroke-dasharray: 3 2;
		opacity: 0.8;
	}
	/* Romania-map markers are small, so their status colors are solid. */
	.shape-square .shape.current {
		fill: var(--active);
	}
	.shape-square .shape.frontier {
		fill: var(--info-soft);
	}
	.shape-square .shape.explored,
	.shape-square .shape.expanded {
		fill: var(--explored);
	}
	.cross {
		fill: none;
		stroke: var(--reject);
		stroke-width: 1.4;
		stroke-linecap: round;
	}
	.path-line {
		stroke: var(--accept);
		stroke-width: 3.5;
		stroke-linecap: round;
	}
	.h {
		fill: var(--heuristic);
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 600;
		text-anchor: middle;
		dominant-baseline: central;
	}
</style>
