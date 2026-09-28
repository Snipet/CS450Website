<!--
	A 3 × 3 board drawn like the slides: tiles on a grey frame, the blank left
	empty. Tiles are keyed by number, so a move slides the tile (a short
	transition that the global reduced-motion rule turns off). An interactive
	board is one tab stop: a click on a tile next to the blank slides it, and
	the arrow keys move the blank.
-->
<script lang="ts">
	import {
		OPPOSITE,
		actionForCell,
		cellOf,
		colOf,
		rowOf,
		tileDistances,
		type Board,
		type PuzzleAction
	} from '$lib/theory/puzzle';
	import { speakBoard } from './describe';

	interface Props {
		board: Board;
		/** Goal board, for the misplaced-tile and distance overlays. */
		goal: Board;
		/** Accessible name, e.g. "Start state". */
		label: string;
		size?: 'lg' | 'md' | 'sm';
		interactive?: boolean;
		/** Called with the blank's move for a tile click or an arrow key (the move may be off the board). */
		onmove?: (action: PuzzleAction) => void;
		/** Outline tiles that are not on their goal square (h1). */
		showMisplaced?: boolean;
		/** Show each tile's Manhattan distance to its goal square (h2). */
		showDistances?: boolean;
		/** Mark this tile as the one that just moved. */
		moved?: number | null;
		/** Id of an element with usage help. */
		describedBy?: string;
	}

	let {
		board,
		goal,
		label,
		size = 'lg',
		interactive = false,
		onmove,
		showMisplaced = false,
		showDistances = false,
		moved = null,
		describedBy
	}: Props = $props();

	const TILES = [1, 2, 3, 4, 5, 6, 7, 8];

	const KEYS: Record<string, PuzzleAction> = {
		ArrowLeft: 'Left',
		ArrowRight: 'Right',
		ArrowUp: 'Up',
		ArrowDown: 'Down'
	};

	const distances = $derived(tileDistances(board, goal));
	const tiles = $derived(
		TILES.map((tile) => {
			const cell = cellOf(board, tile);
			const action = interactive ? actionForCell(board, cell) : null;
			return {
				tile,
				row: rowOf(cell),
				col: colOf(cell),
				action,
				misplaced: goal[cell] !== String(tile),
				distance: distances[tile - 1].distance
			};
		})
	);
	const name = $derived(`${label}: ${speakBoard(board)}`);

	function onkeydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const action = KEYS[event.key];
		if (!action) return;
		event.preventDefault();
		onmove?.(action);
	}
</script>

{#snippet face(t: (typeof tiles)[number])}
	<span class="num">{t.tile}</span>
	{#if showDistances}
		<span class={['dist', { zero: t.distance === 0 }]} aria-hidden="true">{t.distance}</span>
	{/if}
{/snippet}

{#if interactive}
	<!-- One tab stop for the whole board: the arrow keys move the blank, so it is an
	     application region that takes focus and key events. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class={['board', size, 'interactive']}
		role="application"
		aria-label={name}
		aria-describedby={describedBy}
		tabindex="0"
		{onkeydown}
	>
		<div class="field">
			{#each tiles as t (t.tile)}
				<button
					type="button"
					class={[
						'tile',
						{ misplaced: showMisplaced && t.misplaced, moved: moved === t.tile, movable: t.action }
					]}
					style="--r: {t.row}; --c: {t.col};"
					tabindex="-1"
					disabled={!t.action}
					aria-label={t.action
						? `Tile ${t.tile}: slide ${OPPOSITE[t.action].toLowerCase()}`
						: `Tile ${t.tile}`}
					onclick={() => t.action && onmove?.(t.action)}
				>
					{@render face(t)}
				</button>
			{/each}
		</div>
	</div>
{:else}
	<div class={['board', size]} role="img" aria-label={name}>
		<div class="field" aria-hidden="true">
			{#each tiles as t (t.tile)}
				<div
					class={['tile', { misplaced: showMisplaced && t.misplaced, moved: moved === t.tile }]}
					style="--r: {t.row}; --c: {t.col};"
				>
					{@render face(t)}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.board {
		--cell: 76px;
		--gap: 6px;
		--pad: 8px;
		display: inline-block;
		flex: none;
		padding: var(--pad);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		background: var(--surface-3);
		line-height: 1;
	}
	.lg {
		--cell: clamp(58px, 20vw, 84px);
	}
	.md {
		--cell: clamp(48px, 15vw, 60px);
		--gap: 5px;
		--pad: 6px;
	}
	.sm {
		--cell: 40px;
		--gap: 3px;
		--pad: 4px;
		border-radius: var(--radius);
	}
	.interactive:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 3px;
	}
	.field {
		position: relative;
		width: calc(3 * var(--cell) + 2 * var(--gap));
		height: calc(3 * var(--cell) + 2 * var(--gap));
	}
	.tile {
		position: absolute;
		top: 0;
		left: 0;
		display: grid;
		place-items: center;
		width: var(--cell);
		height: var(--cell);
		margin: 0;
		padding: 0;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-sm);
		font: inherit;
		transform: translate(
			calc(var(--c) * (var(--cell) + var(--gap))),
			calc(var(--r) * (var(--cell) + var(--gap)))
		);
		transition:
			transform 150ms var(--ease),
			background var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}
	.sm .tile {
		border-radius: var(--radius-sm);
		box-shadow: none;
	}
	button.tile:disabled {
		cursor: default;
		opacity: 1;
	}
	button.tile.movable {
		cursor: pointer;
	}
	button.tile.movable:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.num {
		font-size: calc(var(--cell) * 0.4);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.sm .num {
		font-size: 17px;
	}
	.tile.misplaced {
		border: 2px solid var(--heuristic);
		background: var(--heuristic-soft);
	}
	button.tile.misplaced.movable:hover {
		border-color: var(--accent);
	}
	.tile.moved {
		box-shadow: 0 0 0 3px var(--active);
	}
	.dist {
		position: absolute;
		top: 4px;
		right: 4px;
		display: grid;
		place-items: center;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		border-radius: 9px;
		background: var(--heuristic);
		color: var(--surface);
		font-size: 11px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.dist.zero {
		background: var(--surface-3);
		color: var(--text-3);
	}
	.md .dist {
		top: 3px;
		right: 3px;
		min-width: 16px;
		height: 16px;
		font-size: 10px;
	}
</style>
