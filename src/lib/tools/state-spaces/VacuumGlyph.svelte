<svelte:options namespace="svg" />

<!--
@component
A vacuum-world state drawn as on slide 9: one cell per square, dirt as dots,
the agent as a bar in its square (the vacuum tool's style). SVG content: place
it inside an `<svg>` (or a StateGraph box) at `x`, `y` with the given size.
Draws no background, so a status fill behind it shows through. Decorative.
-->
<script lang="ts">
	import { parseVacuumState } from '$lib/theory/agents/vacuum-space';

	interface Props {
		/** State name, e.g. "A CD". */
		name: string;
		x?: number;
		y?: number;
		width: number;
		height: number;
		/** Draw the outer frame too (for pictures outside the graph). */
		frame?: boolean;
	}

	let { name, x = 0, y = 0, width, height, frame = false }: Props = $props();

	/** Design units of one square (the vacuum tool's picker: 27 × 24). */
	const CELL_W = 27;
	const CELL_H = 24;

	const state = $derived(parseVacuumState(name).state);
	const n = $derived(state?.dirt.length ?? 2);
	const sx = $derived(width / (CELL_W * n));
	const sy = $derived(height / CELL_H);
</script>

{#if state}
	<g class="glyph" transform="translate({x} {y}) scale({sx} {sy})" aria-hidden="true">
		{#if frame}
			<rect class="frame" x="0" y="0" width={CELL_W * n} height={CELL_H} />
		{/if}
		{#each state.dirt as dirty, i (i)}
			{@const cx = CELL_W * i}
			{#if i > 0}<line class="divider" x1={cx} y1="0" x2={cx} y2={CELL_H} />{/if}
			{#if dirty}
				<circle class="dirt" cx={cx + 8} cy="18" r="2.4" />
				<circle class="dirt" cx={cx + 13.5} cy="19" r="2" />
				<circle class="dirt" cx={cx + 18.5} cy="17.5" r="2.4" />
				<circle class="dirt" cx={cx + 11} cy="14.5" r="1.7" />
				<circle class="dirt" cx={cx + 16} cy="14" r="1.5" />
			{/if}
		{/each}
		<rect class="agent" x={CELL_W * state.location + 7} y="4" width="13" height="7" rx="3.5" />
	</g>
{/if}

<style>
	.frame {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.divider {
		stroke: var(--node-stroke);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.dirt {
		fill: var(--tok-5);
	}
	.agent {
		fill: var(--node-stroke);
	}
</style>
