<script lang="ts">
	import type { Era, EraId, HistoryEvent, Winter } from './content';
	import {
		PRESENT_LABEL,
		TIMELINE_METRICS as M,
		describeTimeline,
		eventsDuring,
		formatEraYears,
		layoutTimeline
	} from './timeline';

	interface Props {
		eras: readonly Era[];
		events: readonly HistoryEvent[];
		winters: readonly Winter[];
		start: number;
		/** The year drawn as "present". */
		end: number;
		selected: EraId | null;
		onselect: (id: EraId | null) => void;
	}

	let { eras, events, winters, start, end, selected, onselect }: Props = $props();

	const uid = $props.id();
	/** Measured after mount; the prerendered page uses this width. */
	let measured = $state(760);

	const layout = $derived(layoutTimeline({ width: measured, eras, events, winters, start, end }));
	const selectedEra = $derived(eras.find((e) => e.id === selected) ?? null);
	const inSelection = $derived(
		new Set(selectedEra ? eventsDuring(selectedEra, events).map((e) => e.id) : [])
	);
	const label = $derived(describeTimeline(eras, selectedEra));

	function click(event: MouseEvent) {
		const row = (event.target as Element | null)?.closest('[data-era]');
		const id = row?.getAttribute('data-era') as EraId | undefined;
		if (id) onselect(id === selected ? null : id);
	}
</script>

<!-- Clicking a bar is a pointer shortcut; the era list next to the chart does the same with the keyboard. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="chart" bind:clientWidth={measured} onclick={click}>
	<svg
		width={layout.width}
		height={layout.height}
		viewBox="0 0 {layout.width} {layout.height}"
		role="img"
		aria-label={label}
	>
		<defs>
			{#each layout.bands as band (band.winter.id)}
				<linearGradient id="{uid}-{band.winter.id}" x1="0" x2="1" y1="0" y2="0">
					<stop offset="0" class="band-stop" stop-opacity="0" />
					<stop offset="0.3" class="band-stop" stop-opacity="1" />
					<stop offset="0.7" class="band-stop" stop-opacity="1" />
					<stop offset="1" class="band-stop" stop-opacity="0" />
				</linearGradient>
			{/each}
		</defs>

		<!-- AI winters -->
		{#each layout.bands as band (band.winter.id)}
			{@const pad = (band.x2 - band.x1) * 0.35}
			<g class="band">
				<title>{band.winter.label}: {band.winter.period}</title>
				<rect
					x={band.x1 - pad}
					y={layout.plotTop}
					width={band.x2 - band.x1 + 2 * pad}
					height={layout.axisY - layout.plotTop}
					fill="url(#{uid}-{band.winter.id})"
				/>
				{#if band.label}
					<text class="band-label" x={band.labelX} y={layout.present.labelY} text-anchor="middle"
						>{band.label}</text
					>
				{/if}
			</g>
		{/each}

		<!-- Grid lines at the ticks -->
		{#each layout.ticks as tick (tick.year)}
			<line class="grid" x1={tick.x} x2={tick.x} y1={layout.plotTop} y2={layout.axisY} />
		{/each}

		<!-- Present -->
		<line
			class="present"
			x1={layout.present.x}
			x2={layout.present.x}
			y1={layout.plotTop}
			y2={layout.axisY}
		/>
		<text class="present-label" x={layout.present.x} y={layout.present.labelY} text-anchor="end"
			>{PRESENT_LABEL}</text
		>

		<!-- Eras -->
		{#each layout.rows as row (row.era.id)}
			{@const isSelected = selected === row.era.id}
			<g
				class={['row', { selected: isSelected, dim: selected !== null && !isSelected }]}
				data-era={row.era.id}
			>
				<title>{row.era.label}, {formatEraYears(row.era)}</title>
				<rect
					class="hit"
					x={0}
					y={row.top - M.rowGap / 2}
					width={layout.width}
					height={row.bottom - row.top + M.rowGap}
				/>
				<text class="label" x={row.label.x} y={row.label.firstBaseline}>
					{#each row.label.lines as line, i (i)}<tspan
							x={row.label.x}
							dy={i === 0 ? 0 : M.lineHeight}>{line}</tspan
						>{/each}{#if row.label.yearsInline}<tspan class="years" dx={M.yearsGap}
							>{row.label.years}</tspan
						>{:else}<tspan class="years" x={row.label.x} dy={M.lineHeight}>{row.label.years}</tspan
						>{/if}
				</text>
				<rect
					class="bar"
					x={row.x1}
					y={row.barY}
					width={Math.max(3, row.x2 - row.x1)}
					height={M.barHeight}
					rx="3"
				/>
				{#if row.toPresent}
					<path
						class="arrow"
						d="M {row.x2 - 1} {row.barY - 3} L {row.x2 + 8} {row.barY + M.barHeight / 2} L {row.x2 -
							1} {row.barY + M.barHeight + 3} Z"
					/>
				{/if}
			</g>
		{/each}

		<!-- Dates from the slides -->
		{#each layout.markers as m (m.event.id)}
			<g class={['marker', { dim: selectedEra !== null && !inSelection.has(m.event.id) }]}>
				<title>{m.event.year}: {m.event.label}</title>
				<line class="stem" x1={m.x} x2={m.x} y1={m.y} y2={layout.axisY} />
				<circle cx={m.x} cy={m.y} r={M.markerRadius} />
				<text x={m.x} y={m.y + 3.5} text-anchor="middle">{m.number}</text>
			</g>
		{/each}

		<!-- Axis -->
		<line class="axis" x1={layout.left} x2={layout.right} y1={layout.axisY} y2={layout.axisY} />
		{#each layout.ticks as tick (tick.year)}
			<line
				class="axis"
				x1={tick.x}
				x2={tick.x}
				y1={layout.axisY}
				y2={layout.axisY + M.tickLength}
			/>
			<text
				class="tick-label"
				x={tick.x}
				y={layout.axisY + M.tickLength + M.axisLabelSize + 1}
				text-anchor="middle">{tick.year}</text
			>
		{/each}
	</svg>
</div>

<style>
	.chart {
		width: 100%;
		min-width: 0;
		overflow: hidden;
	}
	svg {
		display: block;
		/* Until the width is measured (prerendered HTML), scale the default layout down. */
		max-width: 100%;
		height: auto;
		font-family: var(--font-sans);
	}
	.band-stop {
		stop-color: var(--info-soft);
	}
	.band-label {
		fill: var(--info);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.grid {
		stroke: var(--border);
		stroke-width: 1;
	}
	.present {
		stroke: var(--border-strong);
		stroke-dasharray: 3 3;
	}
	.present-label {
		fill: var(--text-3);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.row {
		cursor: pointer;
	}
	.hit {
		fill: transparent;
	}
	.row:hover .hit {
		fill: var(--surface-2);
		fill-opacity: 0.6;
	}
	.label,
	.band-label,
	.present-label {
		/* A halo in the panel color keeps grid lines from crossing the text. */
		paint-order: stroke;
		stroke: var(--surface);
		stroke-width: 4px;
		stroke-linejoin: round;
	}
	.label {
		fill: var(--text);
		font-size: 13px;
		font-weight: 500;
	}
	.years {
		fill: var(--text-3);
		font-size: 12px;
		font-weight: 400;
		font-variant-numeric: tabular-nums;
	}
	.bar,
	.arrow {
		fill: var(--accent);
		transition: opacity var(--duration) var(--ease);
	}
	.row.selected .label {
		font-weight: 700;
	}
	.row.selected .bar,
	.row.selected .arrow {
		fill: var(--active);
	}
	.row.dim .bar,
	.row.dim .arrow,
	.row.dim .label {
		opacity: 0.35;
	}

	.marker circle {
		fill: var(--surface);
		stroke: var(--text-2);
		stroke-width: 1.5;
	}
	.marker text {
		fill: var(--text);
		font-size: 10.5px;
		font-weight: 700;
	}
	.stem {
		stroke: var(--text-3);
		stroke-width: 1;
		stroke-dasharray: 2 2;
	}
	.marker.dim {
		opacity: 0.3;
	}

	.axis {
		stroke: var(--border-strong);
		stroke-width: 1;
	}
	.tick-label {
		fill: var(--text-3);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
</style>
