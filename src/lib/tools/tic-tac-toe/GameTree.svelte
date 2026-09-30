<!--
@component
The game tree below the current position, drawn like Games and Adversarial
Search slide 6: small boards joined by edges, the player to move at each
level on the left, and each board's minimax value under it. The best
children of each board have heavier edges and frames. When `playable`, a
first-level child is a button that plays its move.
-->
<script lang="ts">
	import { squareLabel } from '$lib/theory/games/tictactoe';
	import { formatValue, outcomeWord, speakBoard } from './describe';
	import { TREE_BOARD, type TreeLayout, type TreeNode } from './tree';

	interface Props {
		layout: TreeLayout;
		playable?: boolean;
		onplay?: (square: number) => void;
		/** Accessible name of the drawing. */
		label: string;
	}

	let { layout, playable = false, onplay, label }: Props = $props();

	/** Narrowest drawing width before the tree scrolls sideways. */
	const MIN_WIDTH = 440;
	let scroller = $state<HTMLDivElement>();
	let viewWidth = $state(0);
	const minWidth = $derived(Math.min(MIN_WIDTH, layout.width));
	const scrolls = $derived(viewWidth > 0 && viewWidth < minWidth);

	// A new tree that scrolls starts centered on the current position.
	$effect(() => {
		void layout;
		const el = scroller;
		if (!el || !scrolls) return;
		el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
	});

	const S = TREE_BOARD;
	const C = S / 3;
	const PAD = 0.2 * C;

	function nodeName(n: TreeNode): string {
		const move =
			n.square === null ? 'Current position' : `After ${squareLabel(n.square)} is played`;
		const value = n.terminal
			? `terminal, utility ${formatValue(n.value)} (${outcomeWord(n.value)})`
			: `minimax value ${formatValue(n.value)} (${outcomeWord(n.value)})`;
		const best = n.best ? ', best move' : '';
		return `${move}: ${value}${best}. ${speakBoard(n.board)}.`;
	}

	const xPath = (x: number, y: number) =>
		`M${x + PAD} ${y + PAD}L${x + C - PAD} ${y + C - PAD}M${x + C - PAD} ${y + PAD}L${x + PAD} ${y + C - PAD}`;

	function onkey(event: KeyboardEvent, square: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onplay?.(square);
		}
	}
</script>

{#snippet board(n: TreeNode)}
	<rect class="frame-bg" x={n.x} y={n.y} width={S} height={S} rx="3" />
	{#if n.square !== null}
		<rect
			class="played"
			x={n.x + (n.square % 3) * C}
			y={n.y + Math.floor(n.square / 3) * C}
			width={C}
			height={C}
		/>
	{/if}
	<path
		class="grid"
		d="M{n.x + C} {n.y}v{S}M{n.x + 2 * C} {n.y}v{S}M{n.x} {n.y + C}h{S}M{n.x} {n.y + 2 * C}h{S}"
	/>
	{#each [...n.board] as mark, i (i)}
		{@const x = n.x + (i % 3) * C}
		{@const y = n.y + Math.floor(i / 3) * C}
		{#if mark === 'X'}
			<path class="mx" d={xPath(x, y)} />
		{:else if mark === 'O'}
			<circle class="mo" cx={x + C / 2} cy={y + C / 2} r={C / 2 - PAD} />
		{/if}
	{/each}
	<rect class={['frame', { best: n.best }]} x={n.x} y={n.y} width={S} height={S} rx="3" />
	<text
		class={['value', { best: n.best }]}
		x={n.x + S / 2}
		y={n.y + S + 14}
		text-anchor="middle"
		aria-hidden="true">{formatValue(n.value)}</text
	>
{/snippet}

<!-- The drawing scrolls sideways on narrow screens; the region is then a tab stop. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="tree-wrap"
	bind:this={scroller}
	bind:clientWidth={viewWidth}
	role="region"
	aria-label="Game tree drawing"
	tabindex={scrolls ? 0 : undefined}
>
	<svg
		class="tree"
		viewBox="0 0 {layout.width} {layout.height}"
		width={layout.width}
		style:min-width="{minWidth}px"
		style:max-width="{Math.round(layout.width * 1.15)}px"
		role="group"
		aria-label={label}
	>
		{#each layout.levels as level (level.level)}
			<text class="level" x="0" y={level.y + S / 2 + 4} aria-hidden="true">{level.label}</text>
		{/each}
		{#each layout.edges as e (e.to)}
			<line class={['edge', { best: e.best }]} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
		{/each}
		{#each layout.nodes as n (n.id)}
			{#if n.level === 1 && playable && n.square !== null}
				{@const square = n.square}
				<g
					class="node play"
					role="button"
					tabindex="0"
					aria-label="Play {squareLabel(square)}. {nodeName(n)}"
					onclick={() => onplay?.(square)}
					onkeydown={(e) => onkey(e, square)}
				>
					<rect class="hit" x={n.x - 4} y={n.y - 4} width={S + 8} height={S + 24} rx="5" />
					{@render board(n)}
				</g>
			{:else}
				<g class="node" role="img" aria-label={nodeName(n)}>
					{@render board(n)}
				</g>
			{/if}
		{/each}
	</svg>
</div>
{#if scrolls}<p class="hint">The drawing scrolls sideways.</p>{/if}

<style>
	.tree-wrap {
		overflow-x: auto;
		padding-bottom: 2px;
	}
	.hint {
		margin: var(--space-1) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		text-align: center;
	}
	.tree-wrap:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.tree {
		display: block;
		width: 100%;
		height: auto;
		margin: 0 auto;
	}
	.level {
		fill: var(--text-2);
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: 0.02em;
	}
	.edge {
		stroke: var(--edge);
		stroke-width: 0.8;
	}
	.edge.best {
		stroke: var(--accept);
		stroke-width: 2.2;
	}
	.frame-bg {
		fill: var(--node-fill);
	}
	.played {
		fill: var(--active-soft);
	}
	.grid {
		stroke: var(--border-strong);
		stroke-width: 0.8;
	}
	.frame {
		fill: none;
		stroke: var(--node-stroke);
		stroke-width: 1.2;
	}
	.frame.best {
		stroke: var(--accept);
		stroke-width: 2.6;
	}
	.mx,
	.mo {
		fill: none;
		stroke-width: 1.8;
		stroke-linecap: round;
	}
	.mx {
		stroke: var(--tok-0);
	}
	.mo {
		stroke: var(--tok-2);
	}
	.value {
		fill: var(--text-2);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.value.best {
		fill: var(--text);
		font-weight: 700;
	}
	.hit {
		fill: transparent;
		stroke: none;
	}
	.play {
		cursor: pointer;
	}
	.play:hover .hit {
		fill: var(--accent-soft);
	}
	.play:focus {
		outline: none;
	}
	.play:focus-visible .hit {
		stroke: var(--focus);
		stroke-width: 2;
	}
</style>
