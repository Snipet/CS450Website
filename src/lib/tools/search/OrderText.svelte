<!--
@component
An expansion order written like the slides, "(S, d, e, p, …)", with the
states taken off the frontier so far emphasized and the one of the current
step marked. Long orders scroll inside the box and keep the current state in
view.
-->
<script lang="ts">
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

	const spoken = $derived(
		taken === 0
			? `${label}: none taken off the frontier yet; ${order.length} in all.`
			: `${label}: ${order.slice(0, taken).join(', ')}${
					taken < order.length ? `; ${order.length - taken} more to come` : ''
				}.`
	);

	// Keep the current entry visible inside the box (never scrolls the page).
	$effect(() => {
		const el = box;
		const at = current ?? (taken > 0 ? taken - 1 : null);
		if (!el || !maxHeight || at === null || el.scrollHeight <= el.clientHeight) return;
		const item = el.querySelector<HTMLElement>(`[data-i="${at}"]`);
		if (!item) return;
		// The box is positioned, so offsets are relative to it.
		const top = item.offsetTop;
		const bottom = top + item.offsetHeight;
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
		<span class="paren">(</span>{#each order as name, i (i)}<span
				data-i={i}
				class={['item', i < taken ? 'done' : 'todo', { current: i === current }]}>{name}</span
			>{#if i < order.length - 1}<span class="sep">,</span>{/if}{/each}<span class="paren">)</span>
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
	.paren,
	.sep {
		color: var(--text-3);
	}
	.sep {
		margin-right: 0.55em;
	}
	.item {
		padding: 1px 1px;
		border-radius: var(--radius-sm);
		white-space: nowrap;
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
		background: var(--active-soft);
		box-shadow: inset 0 0 0 1px var(--active);
	}
</style>
