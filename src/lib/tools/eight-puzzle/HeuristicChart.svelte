<!--
	Line chart of h1, h2 and the moves left along a solution, with the current
	playback step marked. Hover shows the values at a move; a click goes there.
-->
<script lang="ts">
	import { chartPoints, linePath, niceTicks, type ChartPoint } from './chart';
	import type { Board } from '$lib/theory/puzzle';

	interface Props {
		boards: readonly Board[];
		goal: Board;
		/** Current playback step. */
		index: number;
		/** Whether the solution is optimal (the moves left are then h*(n)). */
		optimal: boolean;
		onselect?: (index: number) => void;
	}

	let { boards, goal, index, optimal, onselect }: Props = $props();

	const HEIGHT = 170;
	const M = { top: 12, right: 14, bottom: 30, left: 34 };

	let width = $state(480);
	let hover = $state<number | null>(null);

	const points = $derived(chartPoints(boards, goal));
	const last = $derived(Math.max(1, points.length - 1));
	const yMax = $derived(Math.max(1, ...points.map((p) => Math.max(p.h2, p.left))));
	const yTicks = $derived(niceTicks(yMax, 3, { integer: true }));
	const yTop = $derived(yTicks[yTicks.length - 1]);
	const xTicks = $derived(
		niceTicks(last, Math.max(2, Math.floor(width / 90)), { integer: true }).filter((t) => t <= last)
	);
	const plotW = $derived(Math.max(10, width - M.left - M.right));
	const plotH = HEIGHT - M.top - M.bottom;

	const x = (g: number) => M.left + (g / last) * plotW;
	const y = (v: number) => M.top + plotH - (v / yTop) * plotH;

	const SERIES = [
		{ key: 'h1', label: 'h1(n)', color: 'var(--tok-2)', dash: '' },
		{ key: 'h2', label: 'h2(n)', color: 'var(--heuristic)', dash: '' },
		{ key: 'left', label: 'Moves left', color: 'var(--accept)', dash: '6 4' }
	] as const;

	const paths = $derived(
		SERIES.map((s) => ({
			...s,
			d: linePath(points.map((p) => [x(p.g), y(p[s.key as keyof ChartPoint])] as const))
		}))
	);

	const shown = $derived(hover ?? Math.min(index, points.length - 1));
	const at = $derived(points[shown]);

	function pick(event: MouseEvent): number | null {
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const px = event.clientX - rect.left;
		if (px < M.left - 8 || px > width - M.right + 8) return null;
		const g = Math.round(((px - M.left) / plotW) * last);
		return Math.max(0, Math.min(points.length - 1, g));
	}

	const leftLabel = $derived(optimal ? 'Moves left, h*(n)' : 'Moves left on this solution');
	const summary = $derived(
		`Line chart over the ${points.length - 1} moves of the solution: h1(n), h2(n) and the moves left at each board. ` +
			`At every board h1 ≤ h2 ≤ moves left. Start: h1 = ${points[0]?.h1}, h2 = ${points[0]?.h2}, ${points.length - 1} moves left.`
	);
</script>

<div class="chart">
	<ul class="legend" aria-hidden="true">
		{#each SERIES as s (s.key)}
			<li>
				<svg width="22" height="10" class="key"
					><line
						x1="1"
						y1="5"
						x2="21"
						y2="5"
						stroke={s.color}
						stroke-width="2"
						stroke-dasharray={s.dash}
						stroke-linecap="round"
					/></svg
				>{s.key === 'left' ? leftLabel : s.label}
			</li>
		{/each}
	</ul>
	<div class="plot" bind:clientWidth={width}>
		<!-- Pointer shortcut only: the step controls above move through the same boards by keyboard. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
		<svg
			{width}
			height={HEIGHT}
			role="img"
			aria-label={summary}
			onpointermove={(e) => (hover = pick(e))}
			onpointerleave={() => (hover = null)}
			onclick={(e) => {
				const g = pick(e);
				if (g !== null) onselect?.(g);
			}}
		>
			{#each yTicks as t (t)}
				<line class="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
				<text class="tick" x={M.left - 8} y={y(t)} text-anchor="end" dominant-baseline="middle"
					>{t}</text
				>
			{/each}
			{#each xTicks as t (t)}
				<text class="tick" x={x(t)} y={HEIGHT - M.bottom + 16} text-anchor="middle">{t}</text>
			{/each}
			<text class="axis" x={width - M.right} y={HEIGHT - 2} text-anchor="end">moves made, g(n)</text
			>

			<line
				class="cursor"
				x1={x(Math.min(index, last))}
				x2={x(Math.min(index, last))}
				y1={M.top}
				y2={M.top + plotH}
			/>
			{#if hover !== null && hover !== index}
				<line class="hover" x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + plotH} />
			{/if}

			{#each paths as p (p.key)}
				<path
					d={p.d}
					fill="none"
					stroke={p.color}
					stroke-width="2"
					stroke-dasharray={p.dash}
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
			{/each}
			{#if at}
				{#each SERIES as s (s.key)}
					<circle
						class="dot"
						cx={x(at.g)}
						cy={y(at[s.key as keyof ChartPoint])}
						r="4"
						fill={s.color}
					/>
				{/each}
			{/if}
		</svg>
		{#if at}
			<div
				class="readout"
				style="left: {Math.min(Math.max(x(at.g), 100), width - 100)}px"
				aria-hidden="true"
			>
				<strong>g = {at.g}</strong>
				<span>h1 = {at.h1}</span>
				<span>h2 = {at.h2}</span>
				<span>left = {at.left}</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--text-2);
		font-size: var(--text-xs);
	}
	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.key {
		flex: none;
	}
	.plot {
		position: relative;
		min-width: 0;
		padding-top: 26px;
	}
	svg {
		display: block;
		overflow: visible;
		cursor: pointer;
		touch-action: pan-y;
	}
	.grid {
		stroke: var(--border);
		stroke-width: 1;
	}
	.tick,
	.axis {
		fill: var(--text-3);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.cursor {
		stroke: var(--active);
		stroke-width: 2;
	}
	.hover {
		stroke: var(--text-3);
		stroke-width: 1;
	}
	.dot {
		stroke: var(--surface);
		stroke-width: 2;
	}
	.readout {
		position: absolute;
		top: 0;
		display: flex;
		gap: var(--space-2);
		padding: 2px 8px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text-2);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		transform: translateX(-50%);
		pointer-events: none;
	}
	.readout strong {
		color: var(--text);
		font-weight: 600;
	}
</style>
