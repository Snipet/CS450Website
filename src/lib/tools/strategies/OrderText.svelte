<!--
	An expansion order, first entries only with a button that shows the rest.
	IDS iterations are separated by "|" as on the slides.
-->
<script lang="ts">
	import { formatCount } from '$lib/theory/search';
	import { orderText, previewOrder, type OrderToken } from './compare';

	interface Props {
		tokens: readonly OrderToken[];
		/** States shown before "Show all". */
		max?: number;
		/** Names the order for screen readers, e.g. "BFS". */
		name: string;
	}

	let { tokens, max = 20, name }: Props = $props();

	let all = $state(false);
	const uid = $props.id();

	const preview = $derived(previewOrder(tokens, max));
	const total = $derived(tokens.filter((t) => t.kind === 'state').length);
	const text = $derived(orderText(all ? tokens : preview.shown));
</script>

<div class="order">
	{#if all && preview.hidden > 0}
		<!-- A scrollable region must be focusable to scroll by keyboard. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="text scroll"
			id="{uid}-text"
			role="region"
			aria-label="{name} expansion order"
			tabindex="0"
		>
			{text}
		</div>
	{:else}
		<p class="text" id="{uid}-text">
			{text}{#if preview.hidden > 0}<span class="more" aria-hidden="true">, …</span>{/if}
		</p>
	{/if}
	{#if preview.hidden > 0}
		<button
			type="button"
			class="toggle"
			aria-expanded={all}
			aria-controls="{uid}-text"
			onclick={() => (all = !all)}
		>
			{all ? 'Show fewer' : `Show all ${formatCount(total)}`}<span class="visually-hidden">
				states in the {name} expansion order</span
			>
		</button>
	{/if}
</div>

<style>
	.order {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 var(--space-2);
		min-width: 0;
	}
	.text {
		margin: 0;
		min-width: 0;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-variant-ligatures: none;
		line-height: 1.7;
		color: var(--text-2);
		overflow-wrap: anywhere;
	}
	.text.scroll {
		flex-basis: 100%;
		max-height: 10rem;
		overflow-y: auto;
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
	}
	.more {
		color: var(--text-3);
	}
	.toggle {
		padding: 0 4px;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--accent);
		font-size: var(--text-xs);
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
	}
	.toggle:hover {
		background: var(--accent-soft);
	}
</style>
