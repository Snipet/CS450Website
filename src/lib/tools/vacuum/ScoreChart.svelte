<script lang="ts">
	import { formatNumber, signed } from './describe';
	import {
		areaPath,
		linePath,
		linearScale,
		nearestPoint,
		niceTicks,
		scorePoints,
		timeTicks,
		type ChartPoint
	} from './chart';

	interface Props {
		/** Score after each time step (index 0 = t 1). */
		totals: readonly number[];
		/** Current time step (1-based), marked on the line. */
		current: number;
		/** Accessible description of the chart. */
		label: string;
		/** Called with a time step (1-based) when the chart is clicked. */
		onselect?: (t: number) => void;
	}

	let { totals, current, label, onselect }: Props = $props();

	const HEIGHT = 200;
	const PAD = { top: 12, right: 14, bottom: 40, left: 40 };

	let width = $state(480);
	let hover = $state<ChartPoint | null>(null);

	const points = $derived(scorePoints(totals));
	const last = $derived(points[points.length - 1].t);
	const yTicks = $derived(
		niceTicks(
			Math.min(0, ...points.map((p) => p.score)),
			Math.max(1, ...points.map((p) => p.score))
		)
	);
	const xTicks = $derived(timeTicks(last, width < 400 ? 4 : 6));
	const plotW = $derived(Math.max(40, width - PAD.left - PAD.right));
	const x = $derived(linearScale(0, Math.max(1, last), PAD.left, PAD.left + plotW));
	const y = $derived(
		linearScale(yTicks[0], yTicks[yTicks.length - 1], HEIGHT - PAD.bottom, PAD.top)
	);
	const line = $derived(linePath(points, x, y));
	const area = $derived(areaPath(points, x, y, Math.max(0, yTicks[0])));
	const marker = $derived(points[Math.min(current, points.length - 1)]);

	function pointAt(event: MouseEvent): ChartPoint | null {
		const svg = event.currentTarget as SVGSVGElement;
		const box = svg.getBoundingClientRect();
		const px = event.clientX - box.left;
		const t = ((px - PAD.left) / plotW) * Math.max(1, last);
		return nearestPoint(points, t);
	}

	const reward = (p: ChartPoint) => (p.t === 0 ? 0 : p.score - points[p.t - 1].score);
	const tipLeft = $derived(hover ? Math.min(Math.max(x(hover.t), 70), width - 70) : 0);
</script>

<div class="chart" bind:clientWidth={width}>
	<!-- Pointer-only shortcuts (hover values, click to jump); the history table offers the same by keyboard. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<svg
		{width}
		height={HEIGHT}
		role="img"
		aria-label={label}
		onpointermove={(e) => (hover = pointAt(e))}
		onpointerleave={() => (hover = null)}
		onclick={(e) => {
			const p = pointAt(e);
			if (p && p.t > 0) onselect?.(p.t);
		}}
	>
		<!-- Grid and axes -->
		{#each yTicks as v (v)}
			<line
				class={['grid', { zero: v === 0 }]}
				x1={PAD.left}
				x2={PAD.left + plotW}
				y1={y(v)}
				y2={y(v)}
			/>
			<text class="tick" x={PAD.left - 8} y={y(v)} text-anchor="end" dominant-baseline="middle"
				>{formatNumber(v)}</text
			>
		{/each}
		{#each xTicks as t (t)}
			<text class="tick" x={x(t)} y={HEIGHT - PAD.bottom + 16} text-anchor="middle">{t}</text>
		{/each}
		<text class="axis-label" x={PAD.left + plotW / 2} y={HEIGHT - 4} text-anchor="middle"
			>time step t</text
		>

		<!-- Data -->
		<path class="area" d={area} />
		<path class="line" d={line} />

		<!-- Current step -->
		<line class="now" x1={x(marker.t)} x2={x(marker.t)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
		<circle class="dot" cx={x(marker.t)} cy={y(marker.score)} r="5" />

		<!-- Hover crosshair -->
		{#if hover}
			<line class="cross" x1={x(hover.t)} x2={x(hover.t)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
			<circle class="hover-dot" cx={x(hover.t)} cy={y(hover.score)} r="4" />
		{/if}
	</svg>
	{#if hover}
		<div class="tip" style="left: {tipLeft}px" aria-hidden="true">
			<span class="tip-t">t = {hover.t}</span>
			<span>score <strong>{formatNumber(hover.score)}</strong></span>
			{#if hover.t > 0}<span class="tip-r">({signed(reward(hover))})</span>{/if}
		</div>
	{/if}
</div>

<style>
	.chart {
		position: relative;
		min-width: 0;
	}
	svg {
		display: block;
		max-width: 100%;
		cursor: crosshair;
		touch-action: pan-y;
	}
	.grid {
		stroke: var(--border);
		stroke-width: 1;
	}
	.grid.zero {
		stroke: var(--border-strong);
	}
	.tick,
	.axis-label {
		fill: var(--text-3);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.area {
		fill: var(--accent);
		fill-opacity: 0.1;
	}
	.line {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.now {
		stroke: var(--active);
		stroke-width: 1;
	}
	.dot {
		fill: var(--active);
		stroke: var(--surface);
		stroke-width: 2;
	}
	.cross {
		stroke: var(--text-3);
		stroke-width: 1;
	}
	.hover-dot {
		fill: var(--accent);
		stroke: var(--surface);
		stroke-width: 2;
	}
	.tip {
		position: absolute;
		top: 0;
		display: flex;
		gap: 6px;
		padding: 3px 8px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow: var(--shadow);
		color: var(--text-2);
		font-size: var(--text-xs);
		white-space: nowrap;
		transform: translateX(-50%);
		pointer-events: none;
	}
	.tip-t {
		color: var(--text-3);
	}
	.tip strong {
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.tip-r {
		color: var(--text-3);
	}
</style>
