<!--
@component
The neighbors of a grid cell numbered in successor order (clockwise from Up),
computed with the grid engine: 4-connected, 8-connected, or 8-connected next
to a wall (no corner cutting).
-->
<script lang="ts">
	import { gridSuccessors, type Grid } from '$lib/theory/grid';

	interface Props {
		diagonal: boolean;
		/** Put a wall above the center cell. */
		wall?: boolean;
		caption: string;
	}

	let { diagonal, wall = false, caption }: Props = $props();

	const CENTER = 4;
	const grid = $derived<Grid>({
		width: 3,
		height: 3,
		walls: Array.from({ length: 9 }, (_, i) => wall && i === 1),
		start: CENTER,
		goal: 0
	});
	const successors = $derived(gridSuccessors(grid, CENTER, diagonal));
	const order = $derived(
		new Map(successors.map((s, i) => [s.state, { n: i + 1, move: s.action }]))
	);
	const summary = $derived(
		`${caption}: ${successors.map((s, i) => `${i + 1} ${s.action}`).join(', ')}`
	);
</script>

<figure class="moves">
	<div class="grid" role="img" aria-label={summary}>
		{#each grid.walls as isWall, i (i)}
			{@const o = order.get(i)}
			<span class={['cell', { wall: isWall, center: i === CENTER, next: o }]} aria-hidden="true">
				{#if i === CENTER}n{:else if o}{o.n}{/if}
			</span>
		{/each}
	</div>
	<figcaption>{caption}</figcaption>
</figure>

<style>
	.moves {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		width: 10.5rem;
		margin: 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 34px);
		grid-auto-rows: 34px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--border);
		gap: 1px;
	}
	.cell {
		display: grid;
		place-items: center;
		background: var(--surface);
		color: var(--text-3);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-ligatures: none;
	}
	.cell.next {
		background: var(--info-soft);
		color: var(--text);
		font-weight: 600;
	}
	.cell.center {
		background: var(--active-soft);
		color: var(--text);
		font-style: italic;
		font-weight: 600;
		box-shadow: inset 0 0 0 2px var(--active);
	}
	.cell.wall {
		background: var(--wall);
	}
	figcaption {
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.4;
		text-align: center;
	}
</style>
