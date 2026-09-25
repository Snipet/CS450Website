<!--
@component
A small 8-puzzle board drawn like the slides (tiles on a grey frame, the blank
left empty), optionally marking the tiles h1 counts and the distances h2 adds.
-->
<script lang="ts">
	import { CELLS, tileAt, tileDistances, type Board } from '$lib/theory/puzzle';

	interface Props {
		board: Board;
		/** Accessible name, e.g. "Start state". */
		label: string;
		/** Goal board for the overlays. */
		goal?: Board;
		/** Outline tiles that are not on their goal square (h1). */
		misplaced?: boolean;
		/** Show each tile's Manhattan distance to its goal square (h2). */
		distances?: boolean;
	}

	let { board, label, goal, misplaced = false, distances = false }: Props = $props();

	const dist = $derived(goal ? tileDistances(board, goal) : []);
	const cells = $derived(
		Array.from({ length: CELLS }, (_, i) => {
			const tile = tileAt(board, i);
			return {
				tile,
				misplaced: !!goal && tile !== 0 && goal[i] !== board[i],
				distance: tile === 0 ? 0 : (dist[tile - 1]?.distance ?? 0)
			};
		})
	);
	const rows = $derived(
		[0, 1, 2].map((r) =>
			cells
				.slice(r * 3, r * 3 + 3)
				.map((c) => (c.tile === 0 ? 'blank' : String(c.tile)))
				.join(' ')
		)
	);
</script>

<div class="board" role="img" aria-label="{label}: {rows.join(', ')}">
	{#each cells as c, i (i)}
		{#if c.tile === 0}
			<span class="cell blank" aria-hidden="true"></span>
		{:else}
			<span class={['cell', { misplaced: misplaced && c.misplaced }]} aria-hidden="true">
				{c.tile}
				{#if distances}<span class={['dist', { zero: c.distance === 0 }]}>{c.distance}</span>{/if}
			</span>
		{/if}
	{/each}
</div>

<style>
	.board {
		--cell: 40px;
		display: inline-grid;
		grid-template-columns: repeat(3, var(--cell));
		grid-auto-rows: var(--cell);
		gap: 3px;
		flex: none;
		padding: 4px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-3);
		line-height: 1;
	}
	.cell {
		position: relative;
		display: grid;
		place-items: center;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text);
		font-size: 17px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.cell.blank {
		border-color: transparent;
		background: transparent;
	}
	.cell.misplaced {
		border: 2px solid var(--heuristic);
		background: var(--heuristic-soft);
	}
	.dist {
		position: absolute;
		right: 3px;
		bottom: 2px;
		color: var(--heuristic);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
	}
	.dist.zero {
		color: var(--text-3);
		font-weight: 400;
	}
</style>
