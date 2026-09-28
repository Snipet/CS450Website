<!--
@component
A small 8-puzzle board as on slide 10: tiles 1–8 on a gray tray, the blank
left empty. A figure with an accessible description of the rows.
-->
<script lang="ts">
	import type { Board } from '$lib/theory/puzzle';

	interface Props {
		board: Board;
		/** Accessible name prefix, e.g. "Start state". */
		label?: string;
		size?: 'xs' | 'sm' | 'md';
	}

	let { board, label, size = 'md' }: Props = $props();

	const cells = $derived([...board].map(Number));
	const rows = $derived(
		[0, 1, 2]
			.map((r) =>
				cells
					.slice(r * 3, r * 3 + 3)
					.map((t) => (t === 0 ? 'blank' : String(t)))
					.join(' ')
			)
			.join(', ')
	);
</script>

<div class={['board', size]} role="img" aria-label="{label ? `${label}: ` : ''}{rows}">
	{#each cells as tile, i (i)}
		{#if tile === 0}
			<span class="cell blank"></span>
		{:else}
			<span class="cell tile">{tile}</span>
		{/if}
	{/each}
</div>

<style>
	.board {
		--cell: 40px;
		--gap: 3px;
		display: inline-grid;
		flex: none;
		grid-template-columns: repeat(3, var(--cell));
		grid-auto-rows: var(--cell);
		gap: var(--gap);
		padding: var(--gap);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-3);
		line-height: 1;
	}
	.sm {
		--cell: 26px;
		--gap: 2px;
		border-radius: var(--radius-sm);
	}
	.xs {
		--cell: 17px;
		--gap: 1.5px;
		border-radius: 3px;
	}
	.cell {
		display: grid;
		place-items: center;
		border-radius: 3px;
	}
	.tile {
		border: 1px solid var(--border-strong);
		background: var(--surface);
		color: var(--text);
		font-size: calc(var(--cell) * 0.46);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.xs .tile {
		border-radius: 2px;
		font-size: 10.5px;
	}
</style>
