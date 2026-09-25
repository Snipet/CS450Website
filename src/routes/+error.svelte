<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { pageTitle } from '$lib/site';

	const notFound = $derived(page.status === 404);
	const title = $derived(notFound ? 'Page not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{pageTitle(title)}</title>
	<meta name="robots" content="noindex" />
	<meta
		name="description"
		content={notFound
			? 'There is no CMSC450 AI Tools page at this address.'
			: 'This CMSC450 AI Tools page could not be shown.'}
	/>
</svelte:head>

<section class="error">
	<svg class="figure" viewBox="0 0 220 96" aria-hidden="true">
		<circle class="node" cx="110" cy="16" r="12" />
		<text class="name" x="110" y="21">S</text>
		<path class="edge" d="M101 25 62 62M119 25l39 37" />
		<circle class="node" cx="54" cy="72" r="12" />
		<circle class="dead" cx="166" cy="72" r="12" />
		<text class="name" x="54" y="77">A</text>
		<text class="miss" x="166" y="77">?</text>
		<path class="edge dim" d="M46 81 34 93M62 81l12 12" />
	</svg>
	<p class="status">{page.status}</p>
	<h1>{title}</h1>
	{#if notFound}
		<p class="detail">
			There is no page at <code>{page.url.pathname}</code>. The link may be mistyped, or the page
			may have moved.
		</p>
	{:else}
		<p class="detail">{page.error?.message ?? 'An unexpected error occurred.'}</p>
	{/if}
	<nav class="links" aria-label="Go to">
		<a href={resolve('/')}><Icon name="chevron-left" size={16} />All tools</a>
		<a href={resolve('/notation')}>Notation</a>
	</nav>
</section>

<style>
	.error {
		max-width: 36rem;
		margin: var(--space-6) auto var(--space-7);
		text-align: center;
	}
	.figure {
		width: 200px;
		max-width: 100%;
		margin-bottom: var(--space-3);
		overflow: visible;
	}
	.node {
		fill: var(--node-fill);
		stroke: var(--node-stroke);
		stroke-width: 1.5;
	}
	.dead {
		fill: var(--node-fill);
		stroke: var(--dead);
		stroke-width: 1.5;
		stroke-dasharray: 4 3;
	}
	.edge {
		fill: none;
		stroke: var(--edge);
		stroke-width: 1.5;
		stroke-linecap: round;
	}
	.dim {
		stroke: var(--dead);
		stroke-dasharray: 3 3;
	}
	.name,
	.miss {
		fill: var(--text);
		font-family: var(--font-mono);
		font-size: 13px;
		text-anchor: middle;
	}
	.miss {
		fill: var(--dead);
	}
	.status {
		margin: 0 0 var(--space-1);
		color: var(--text-3);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		letter-spacing: 0.08em;
	}
	.detail {
		color: var(--text-2);
	}
	.detail code {
		overflow-wrap: anywhere;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-2) var(--space-5);
		margin-top: var(--space-5);
	}
	.links a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 500;
	}
</style>
