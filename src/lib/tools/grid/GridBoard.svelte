<!--
@component
One grid drawn as SVG, with the search state at the current step on top.

Rendering: every status layer (explored cells, frontier, walls) is a single
`<path>` whose rectangles merge runs of adjacent cells, so a step changes a
handful of attributes rather than thousands of elements, colors come from the
theme tokens through CSS (light and dark work without redrawing), and the
drawing scales crisply. Pointer and keyboard editing work on cell indices
computed from coordinates, so no per-cell elements are needed.

Editing (when `editable`): press on an open cell and drag to draw walls, on a
wall to erase, on the start or goal marker to move it. Keyboard: the board is
focusable; arrow keys move a cursor, Space or Enter toggles a wall, S and G
place the start and goal.
-->
<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import {
		cellLabel,
		placeGoal,
		placeStart,
		setWalls,
		toggleWall,
		type Grid
	} from '$lib/theory/grid';
	import {
		cellsBetween,
		cellsPath,
		gridLinesPath,
		pathPoints,
		wallsPath,
		type CellLayers
	} from './view';

	interface Props {
		grid: Grid;
		/** Search state to draw, or null for the bare grid. */
		layers?: CellLayers | null;
		/** Accessible description of the drawing (grid and search state). */
		label: string;
		editable?: boolean;
		onedit?: (grid: Grid) => void;
		/** Id of the element that explains the editing keys. */
		helpId?: string;
		/** Largest drawing height in CSS pixels (the width follows the grid's shape). */
		maxHeight?: number;
	}

	let {
		grid,
		layers = null,
		label,
		editable = false,
		onedit,
		helpId,
		maxHeight = 620
	}: Props = $props();

	type DragMode = 'draw' | 'erase' | 'start' | 'goal';

	let svg: SVGSVGElement | undefined = $state();
	let boardWidth = $state(0);
	let focused = $state(false);
	let cursor = $state(-1);
	let hover = $state(-1);
	let announcement = $state('');
	let drag: { mode: DragMode; last: number; pointer: number } | null = $state(null);

	const w = $derived(grid.width);
	const h = $derived(grid.height);
	const cellPx = $derived(boardWidth / w);
	// Markers keep a radius of about 5 px on small cells (up to twice their normal size).
	const markerScale = $derived(cellPx > 0 ? Math.min(2, Math.max(1, 5 / (0.4 * cellPx))) : 1);
	const lines = $derived(gridLinesPath(w, h));
	const walls = $derived(wallsPath(grid.walls, w));
	const explored = $derived(layers ? layers.explored.map((cells) => cellsPath(cells, w)) : []);
	const frontier = $derived(layers ? cellsPath(layers.frontier, w) : '');
	const path = $derived(layers?.path ? pathPoints(layers.path, w) : null);
	const cursorCell = $derived(cursor >= 0 && cursor < w * h ? cursor : grid.start);

	const x = (cell: number) => cell % w;
	const y = (cell: number) => Math.floor(cell / w);

	function apply(next: Grid) {
		if (next !== grid) onedit?.(next);
	}

	function cellAtPointer(event: PointerEvent): number | null {
		const ctm = svg?.getScreenCTM();
		if (!ctm) return null;
		const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
		const col = Math.floor(p.x);
		const row = Math.floor(p.y);
		if (col < 0 || row < 0 || col >= w || row >= h) return null;
		return row * w + col;
	}

	function onpointerdown(event: PointerEvent) {
		if (!editable || !event.isPrimary || event.button !== 0) return;
		const cell = cellAtPointer(event);
		if (cell === null) return;
		event.preventDefault();
		const mode: DragMode =
			cell === grid.start
				? 'start'
				: cell === grid.goal
					? 'goal'
					: grid.walls[cell]
						? 'erase'
						: 'draw';
		drag = { mode, last: cell, pointer: event.pointerId };
		svg?.setPointerCapture(event.pointerId);
		cursor = cell;
		if (mode === 'draw' || mode === 'erase') apply(setWalls(grid, [cell], mode === 'draw'));
	}

	function onpointermove(event: PointerEvent) {
		const cell = cellAtPointer(event);
		hover = cell ?? -1;
		if (!drag || event.pointerId !== drag.pointer || cell === null || cell === drag.last) return;
		if (drag.mode === 'draw' || drag.mode === 'erase') {
			apply(setWalls(grid, cellsBetween(drag.last, cell, w), drag.mode === 'draw'));
			drag.last = cell;
		} else if (!grid.walls[cell]) {
			apply(drag.mode === 'start' ? placeStart(grid, cell) : placeGoal(grid, cell));
			drag.last = cell;
		}
		cursor = cell;
	}

	function endDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointer) return;
		if (svg?.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
		drag = null;
	}

	function describeCell(g: Grid, cell: number): string {
		const what =
			cell === g.start ? 'start' : cell === g.goal ? 'goal' : g.walls[cell] ? 'wall' : 'open';
		return `${cellLabel(g, cell)}: ${what}`;
	}

	function onkeydown(event: KeyboardEvent) {
		if (!editable || event.ctrlKey || event.metaKey || event.altKey) return;
		const cell = cursorCell;
		const col = x(cell);
		const row = y(cell);
		let next: number;
		switch (event.key) {
			case 'ArrowUp':
				next = row > 0 ? cell - w : cell;
				break;
			case 'ArrowDown':
				next = row < h - 1 ? cell + w : cell;
				break;
			case 'ArrowLeft':
				next = col > 0 ? cell - 1 : cell;
				break;
			case 'ArrowRight':
				next = col < w - 1 ? cell + 1 : cell;
				break;
			case ' ':
			case 'Enter': {
				if (cell === grid.start || cell === grid.goal) {
					announcement = `${cellLabel(grid, cell)} holds the ${cell === grid.start ? 'start' : 'goal'}; it cannot be a wall.`;
				} else {
					const edited = toggleWall(grid, cell);
					apply(edited);
					announcement = describeCell(edited, cell);
				}
				event.preventDefault();
				return;
			}
			case 's':
			case 'S':
			case 'g':
			case 'G': {
				const start = event.key.toLowerCase() === 's';
				const other = start ? grid.goal : grid.start;
				if (cell === other) {
					announcement = `The ${start ? 'start' : 'goal'} cannot share a cell with the ${start ? 'goal' : 'start'}.`;
				} else {
					apply(start ? placeStart(grid, cell) : placeGoal(grid, cell));
					announcement = `${start ? 'Start' : 'Goal'} placed at ${cellLabel(grid, cell)}.`;
				}
				event.preventDefault();
				return;
			}
			default:
				return;
		}
		event.preventDefault();
		cursor = next;
		announcement = describeCell(grid, next);
	}

	/**
	 * Keys are handled by a native listener on the editor: Svelte delegates `onkeydown` to the
	 * document root, which would run after the stepper shortcuts on an ancestor. Handling the
	 * key here first and calling `preventDefault` keeps arrows and Space for the editor.
	 */
	const editorKeys: Attachment<HTMLElement> = (node) => {
		node.addEventListener('keydown', onkeydown);
		return () => node.removeEventListener('keydown', onkeydown);
	};

	const pointerStyle = $derived.by(() => {
		if (!editable) return 'default';
		if (drag) return drag.mode === 'start' || drag.mode === 'goal' ? 'grabbing' : 'crosshair';
		return hover === grid.start || hover === grid.goal ? 'grab' : 'crosshair';
	});
</script>

{#snippet marker(cell: number, kind: 'start' | 'goal')}
	<g
		class={['marker', kind]}
		transform="translate({x(cell) + 0.5} {y(cell) + 0.5}) scale({markerScale})"
	>
		{#if kind === 'goal'}<circle class="ring" r="0.46" />{/if}
		<circle class="dot" r={kind === 'goal' ? 0.34 : 0.4} />
		{#if cellPx >= 15}
			<text class="letter" dy="0.02">{kind === 'start' ? 'S' : 'G'}</text>
		{/if}
	</g>
{/snippet}

{#snippet drawing()}
	<svg
		bind:this={svg}
		class="grid-svg"
		viewBox="-0.05 -0.05 {w + 0.1} {h + 0.1}"
		role="img"
		aria-label={label}
		style="cursor: {pointerStyle}"
		{onpointerdown}
		{onpointermove}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		onpointerleave={() => (hover = -1)}
	>
		<rect class="bg" width={w} height={h} />
		{#each explored as d, i (i)}
			{#if d}<path
					class="explored"
					style="--mix: {explored.length === 1 ? 12 : 4 + (i * 28) / (explored.length - 1)}%"
					{d}
				/>{/if}
		{/each}
		{#if frontier}<path class="frontier" d={frontier} />{/if}
		{#if layers && layers.current !== null}
			<rect class="current" x={x(layers.current)} y={y(layers.current)} width="1" height="1" />
		{/if}
		<path class={['lines', { faint: cellPx < 9 }]} d={lines} />
		{#if walls}<path class="walls" d={walls} />{/if}
		{#if path}<polyline class="path" points={path} />{/if}
		{@render marker(grid.start, 'start')}
		{@render marker(grid.goal, 'goal')}
		<rect class="frame" width={w} height={h} />
		{#if editable && focused}
			<rect
				class="cursor"
				x={x(cursorCell) + 0.04}
				y={y(cursorCell) + 0.04}
				width="0.92"
				height="0.92"
			/>
		{/if}
	</svg>
{/snippet}

<div class="board" style="--aspect: {w / h}; --max-h: {maxHeight}px" bind:clientWidth={boardWidth}>
	{#if editable}
		<!-- A composite widget with its own keyboard model (arrow keys move a cursor over the
		     cells), so it takes focus and key events as role="application". -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="editor"
			role="application"
			aria-roledescription="grid editor"
			aria-label="Grid editor, {w} columns by {h} rows"
			aria-describedby={helpId}
			tabindex="0"
			{@attach editorKeys}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
		>
			{@render drawing()}
		</div>
		<p class="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</p>
	{:else}
		{@render drawing()}
	{/if}
</div>

<style>
	.board {
		width: 100%;
		max-width: calc(var(--max-h) * var(--aspect));
		margin-inline: auto;
		min-width: 0;
	}
	.editor {
		display: block;
		border-radius: var(--radius-sm);
	}
	.editor:focus {
		outline: none;
	}
	.editor:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 3px;
	}
	.grid-svg {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--aspect);
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}
	.bg {
		fill: var(--node-fill);
	}
	.explored {
		fill: color-mix(in srgb, var(--explored) var(--mix), var(--explored-soft));
	}
	.frontier {
		fill: var(--info-soft);
		stroke: var(--info);
		stroke-width: 1.25;
		vector-effect: non-scaling-stroke;
	}
	.current {
		fill: var(--active);
	}
	.lines {
		fill: none;
		stroke: var(--border);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
		shape-rendering: crispEdges;
	}
	.lines.faint {
		opacity: 0.55;
	}
	.walls {
		fill: var(--wall);
	}
	.path {
		fill: none;
		stroke: var(--accept);
		stroke-width: 0.3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.frame {
		fill: none;
		stroke: var(--border-strong);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.marker .dot {
		stroke: var(--node-fill);
		stroke-width: 0.06;
	}
	.start .dot {
		fill: var(--node-stroke);
	}
	.goal .dot {
		fill: var(--accept);
	}
	.goal .ring {
		fill: var(--node-fill);
		stroke: var(--accept);
		stroke-width: 0.07;
	}
	.letter {
		fill: var(--node-fill);
		font-family: var(--font-sans);
		font-size: 0.5px;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}
	.cursor {
		fill: none;
		stroke: var(--focus);
		stroke-width: 2.5;
		vector-effect: non-scaling-stroke;
	}
</style>
