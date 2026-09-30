<!--
@component
The tic-tac-toe board as a 3 × 3 grid of square buttons, numbered 1–9 row by
row. Empty squares can show a value for the side to move and mark the best
moves. Keyboard: one tab stop; the arrow keys move between squares, Enter or
Space plays the focused square. While editing, a click cycles empty → X → O,
and X, O, ., Delete or Backspace set the focused square.
-->
<script lang="ts">
	import type { Board } from '$lib/theory/games/tictactoe';
	import { cutoffWord, formatValue, outcomeWord, squareDescription } from './describe';

	interface Props {
		board: Board;
		/** Value per square for empty squares (null: none shown). */
		values?: readonly (number | null)[];
		/** How to read the values: minimax (+1/0/−1) or depth-limited (Eval). */
		valueMode?: 'minimax' | 'depth';
		/** Squares marked as best moves. */
		best?: readonly number[];
		/** Squares of the winning line(s). */
		winning?: readonly number[];
		/** Winner's mark, for the line's color. */
		winner?: 'X' | 'O' | null;
		/** The square played last. */
		last?: number | null;
		/** Empty squares can be played. */
		playable?: boolean;
		editing?: boolean;
		onplay?: (square: number) => void;
		onedit?: (square: number, mark: 'X' | 'O' | '.') => void;
		/** Accessible name of the grid. */
		label: string;
		describedBy?: string;
	}

	let {
		board,
		values = [],
		valueMode = 'minimax',
		best = [],
		winning = [],
		winner = null,
		last = null,
		playable = false,
		editing = false,
		onplay,
		onedit,
		label,
		describedBy
	}: Props = $props();

	const SQUARES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
	const NEXT: Record<string, 'X' | 'O' | '.'> = { '.': 'X', X: 'O', O: '.' };

	let focus = $state(4);
	let grid: HTMLDivElement | undefined = $state();

	function canPlay(square: number): boolean {
		return editing || (playable && board[square] === '.');
	}

	function activate(square: number) {
		focus = square;
		if (editing) onedit?.(square, NEXT[board[square]]);
		else if (canPlay(square)) onplay?.(square);
	}

	function move(to: number) {
		focus = to;
		grid?.querySelectorAll<HTMLButtonElement>('button.square')[to]?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const row = Math.floor(focus / 3);
		const col = focus % 3;
		let to: number | null = null;
		switch (event.key) {
			case 'ArrowLeft':
				to = row * 3 + Math.max(0, col - 1);
				break;
			case 'ArrowRight':
				to = row * 3 + Math.min(2, col + 1);
				break;
			case 'ArrowUp':
				to = Math.max(0, row - 1) * 3 + col;
				break;
			case 'ArrowDown':
				to = Math.min(2, row + 1) * 3 + col;
				break;
			case 'Home':
				to = 0;
				break;
			case 'End':
				to = 8;
				break;
		}
		if (to !== null) {
			event.preventDefault();
			move(to);
			return;
		}
		if (!editing) return;
		const k = event.key;
		const mark =
			k === 'x' || k === 'X'
				? 'X'
				: k === 'o' || k === 'O' || k === '0'
					? 'O'
					: k === '.' || k === '-' || k === '_' || k === 'Delete' || k === 'Backspace'
						? '.'
						: null;
		if (mark) {
			event.preventDefault();
			onedit?.(focus, mark);
		}
	}

	const cells = $derived(
		SQUARES.map((square) => {
			const mark = board[square];
			const value = mark === '.' ? (values[square] ?? null) : null;
			const isBest = mark === '.' && best.includes(square);
			const isWinning = winning.includes(square);
			const word =
				value === null ? null : valueMode === 'depth' ? cutoffWord(value) : outcomeWord(value);
			return {
				square,
				mark,
				value,
				word,
				best: isBest,
				winning: isWinning,
				last: square === last,
				tone: value === null ? '' : value > 0 ? 'xv' : value < 0 ? 'ov' : 'zv',
				name: squareDescription({
					square,
					mark,
					value,
					mode: valueMode,
					best: isBest,
					winning: isWinning,
					last: square === last
				})
			};
		})
	);
</script>

<!-- A grid widget: one tab stop, the arrow keys move between the squares. -->
<div
	bind:this={grid}
	class={['board', { editing, playable: playable || editing }]}
	role="grid"
	tabindex="-1"
	aria-label={label}
	aria-describedby={describedBy}
	{onkeydown}
>
	{#each [0, 1, 2] as r (r)}
		<div class="row" role="row">
			{#each cells.slice(r * 3, r * 3 + 3) as c (c.square)}
				<div class="gridcell" role="gridcell">
					<button
						type="button"
						class={[
							'square',
							c.tone,
							{
								open: canPlay(c.square),
								best: c.best,
								winning: c.winning,
								last: c.last,
								'x-won': c.winning && winner === 'X',
								'o-won': c.winning && winner === 'O'
							}
						]}
						tabindex={c.square === focus ? 0 : -1}
						aria-label={c.name}
						aria-disabled={canPlay(c.square) ? undefined : 'true'}
						onfocus={() => (focus = c.square)}
						onclick={() => activate(c.square)}
					>
						<span class="num" aria-hidden="true">{c.square + 1}</span>
						{#if c.mark === 'X'}
							<svg class="mark x" viewBox="0 0 100 100" aria-hidden="true">
								<path d="M26 26 74 74M74 26 26 74" />
							</svg>
						{:else if c.mark === 'O'}
							<svg class="mark o" viewBox="0 0 100 100" aria-hidden="true">
								<circle cx="50" cy="50" r="25" />
							</svg>
						{:else if c.value !== null}
							<span class="value" aria-hidden="true">
								<span class="v">{formatValue(c.value)}</span>
								{#if c.word}<span class="word">{c.word}</span>{/if}
							</span>
						{/if}
						{#if c.best}<span class="best-tag" aria-hidden="true">best</span>{/if}
					</button>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.board {
		--cell: clamp(72px, 24vw, 96px);
		--x-color: var(--tok-0);
		--o-color: var(--tok-2);
		display: inline-flex;
		flex: none;
		flex-direction: column;
		border: 2px solid var(--node-stroke);
		border-radius: var(--radius);
		background: var(--surface);
		overflow: hidden;
	}
	.board:focus {
		outline: none;
	}
	.row {
		display: flex;
	}
	.gridcell {
		display: flex;
	}
	.row + .row .gridcell {
		border-top: 2px solid var(--border-strong);
	}
	.gridcell + .gridcell {
		border-left: 2px solid var(--border-strong);
	}
	.square {
		position: relative;
		display: grid;
		place-items: center;
		width: var(--cell);
		height: var(--cell);
		margin: 0;
		padding: 0;
		border: 0;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		cursor: default;
		transition: background var(--duration) var(--ease);
	}
	.square:focus-visible {
		z-index: 1;
		outline: 3px solid var(--focus);
		outline-offset: -3px;
	}
	.square.open {
		cursor: pointer;
	}
	.square.open:hover {
		background: var(--accent-soft);
	}
	.square.last {
		background: var(--surface-2);
	}
	.square.last::after {
		content: '';
		position: absolute;
		right: 6px;
		bottom: 6px;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--active);
	}
	.square.x-won {
		background: var(--tok-0-soft);
	}
	.square.o-won {
		background: var(--tok-2-soft);
	}
	.num {
		position: absolute;
		top: 4px;
		left: 6px;
		color: var(--text-3);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.mark {
		width: 78%;
		height: 78%;
		fill: none;
		stroke-linecap: round;
		stroke-width: 11;
		animation: place 180ms var(--ease);
	}
	.mark.x {
		stroke: var(--x-color);
	}
	.mark.o {
		stroke: var(--o-color);
	}
	.winning .mark {
		stroke-width: 14;
	}
	@keyframes place {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
	}
	.value {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		line-height: 1;
	}
	.v {
		font-size: calc(var(--cell) * 0.27);
		font-weight: 650;
		font-variant-numeric: tabular-nums;
	}
	.word {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.01em;
	}
	.xv .value {
		color: var(--x-color);
	}
	.ov .value {
		color: var(--o-color);
	}
	.zv .value {
		color: var(--text-3);
	}
	.square.best {
		box-shadow: inset 0 0 0 3px var(--accept);
	}
	.best-tag {
		position: absolute;
		top: 4px;
		right: 5px;
		padding: 1px 5px;
		border-radius: 999px;
		background: var(--accept);
		color: var(--surface);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1.3;
		text-transform: uppercase;
	}
	.editing {
		border-style: dashed;
	}
	.editing .square {
		cursor: pointer;
	}
	.editing .square:hover {
		background: var(--surface-2);
	}
</style>
