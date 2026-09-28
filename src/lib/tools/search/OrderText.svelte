<!--
@component
An expansion order written like the slides, "(S, d, e, p, …)", with the
states taken off the frontier so far emphasized and the one of the current
step marked. Long orders scroll inside the box and keep the current state in
view. The order is drawn as three runs of text (before, at, and after the
step), so stepping stays fast for orders of thousands of states.
-->
<script lang="ts">
	import { orderRuns, unbreakableNames } from './view';

	interface Props {
		order: readonly string[];
		/** How many entries have been taken off the frontier. */
		taken: number;
		/** Index of the entry taken off at the shown step, or null. */
		current: number | null;
		/** Accessible name of the list. */
		label: string;
		/** Largest height in px before the box scrolls (0: no limit). */
		maxHeight?: number;
		/** Tighter lines (the IDS iteration rows). */
		compact?: boolean;
	}

	let { order, taken, current, label, maxHeight = 0, compact = false }: Props = $props();

	let box = $state<HTMLElement>();
	/** The end of the states taken off before this step. */
	let mark = $state<HTMLElement>();
	let currentEl = $state<HTMLElement>();

	const names = $derived(unbreakableNames(order));
	const runs = $derived(orderRuns(names, taken, current));

	const spoken = $derived(
		taken === 0
			? `${label}: none taken off the frontier yet; ${order.length} in all.`
			: `${label}: ${order.slice(0, taken).join(', ')}${
					taken < order.length ? `; ${order.length - taken} more to come` : ''
				}.`
	);

	// Keep the current entry (or the end of the ones taken off) visible inside
	// the box; never scrolls the page.
	$effect(() => {
		const el = box;
		void runs;
		const item = currentEl ?? (taken > 0 ? mark : undefined);
		if (!el || !maxHeight || !item || el.scrollHeight <= el.clientHeight) return;
		// The box is positioned, so offsets are relative to it.
		const top = item.offsetTop;
		const bottom = top + Math.max(item.offsetHeight, 16);
		if (top < el.scrollTop + 4) el.scrollTop = Math.max(0, top - 8);
		else if (bottom > el.scrollTop + el.clientHeight - 4)
			el.scrollTop = bottom - el.clientHeight + 8;
	});
</script>

<div
	class={['order', { compact, scroll: maxHeight > 0 }]}
	style:max-height={maxHeight ? `${maxHeight}px` : undefined}
	bind:this={box}
>
	<span class="visually-hidden">{spoken}</span>
	<p class="text" aria-hidden="true">
		<span class="paren">(</span>{#if runs.done}<span class="done">{runs.done}</span>{/if}<span
			class="mark"
			bind:this={mark}
		></span>{#if runs.current !== null}<span class="current" bind:this={currentEl}
				>{runs.current}</span
			>{/if}{#if runs.todo}<span class="todo">{runs.todo}</span>{/if}<span class="paren">)</span>
	</p>
</div>

<style>
	.order {
		position: relative;
		min-width: 0;
	}
	.order.scroll {
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.text {
		margin: 0;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-ligatures: none;
		line-height: 1.9;
		overflow-wrap: anywhere;
	}
	.compact .text {
		line-height: 1.7;
	}
	.paren {
		color: var(--text-3);
	}
	.done {
		color: var(--text);
		font-weight: 600;
	}
	.todo {
		color: var(--text-3);
	}
	.current {
		padding: 1px 4px;
		border-radius: var(--radius-sm);
		background: var(--active-soft);
		box-shadow: inset 0 0 0 1px var(--active);
		color: var(--text);
		font-weight: 600;
		white-space: nowrap;
	}
</style>
