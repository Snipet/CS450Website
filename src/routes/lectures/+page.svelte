<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { pageTitle, toolHref } from '$lib/site';
	import { lectureIndex } from '$lib/tools/lecture-index';
	import { tools } from '$lib/tools/registry';

	const index = lectureIndex(tools);
	const description =
		'The CMSC450 lecture decks in order, with the tools that follow each deck and the slides they cite.';
</script>

<svelte:head>
	<title>{pageTitle('Lectures')}</title>
	<meta name="description" content={description} />
</svelte:head>

<div class="lectures">
	<header class="head">
		<h1>Lectures</h1>
		<p class="lede">
			The lecture decks in order, with the tools that follow each one and the slides they cite.
			Presets inside the tools cite their slides too.
		</p>
	</header>

	<ol class="decks">
		{#each index as entry, i (entry.deck.id)}
			<li class="deck" id={entry.deck.id} aria-labelledby="{entry.deck.id}-title">
				<div class="deck-head">
					<span class="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
					<div class="deck-text">
						<h2 id="{entry.deck.id}-title">{entry.deck.title}</h2>
						<p class="topic">{entry.deck.topic}</p>
					</div>
					<p class="meta">
						<span>{entry.deck.chapter}</span>
						<span class="dot" aria-hidden="true">·</span>
						<span>{entry.deck.slides} slides</span>
					</p>
				</div>
				{#if entry.tools.length}
					<ul class="tools" aria-label="Tools citing {entry.deck.title}">
						{#each entry.tools as { tool, slides } (tool.slug)}
							<li>
								<a class="tool" href={toolHref(tool.slug)}>
									<span class="tool-title">{tool.title}</span>
									<span class="slides">
										<Icon name="book" size={13} />
										{slides}
									</span>
									<Icon name="arrow-right" size={16} class="arrow" />
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="none">No tools cite this deck yet.</p>
				{/if}
			</li>
		{/each}
	</ol>
</div>

<style>
	.lectures {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		max-width: 60rem;
	}
	.head {
		max-width: var(--content-width);
		padding-top: var(--space-4);
	}
	.head h1 {
		margin-bottom: var(--space-3);
	}
	.lede {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-lg);
		line-height: 1.55;
	}
	.decks {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.deck {
		padding: var(--space-4) var(--space-5) var(--space-5);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}
	.deck-head {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: baseline;
		gap: var(--space-1) var(--space-4);
	}
	.num {
		color: var(--text-3);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}
	.deck-text {
		min-width: 0;
	}
	h2 {
		margin: 0;
		font-size: var(--text-xl);
	}
	.topic {
		margin: var(--space-1) 0 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
		white-space: nowrap;
	}
	.tools {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
		gap: var(--space-2);
		margin: var(--space-4) 0 0;
		padding: 0;
		list-style: none;
	}
	.tools li {
		display: flex;
		min-width: 0;
	}
	.tool {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		flex: 1;
		column-gap: var(--space-2);
		min-width: 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		color: var(--text);
		text-decoration: none;
		transition:
			border-color var(--duration) var(--ease),
			background var(--duration) var(--ease);
	}
	.tool:hover {
		border-color: var(--border-strong);
		background: var(--surface);
		color: var(--text);
	}
	.tool-title {
		font-weight: 500;
	}
	.slides {
		display: inline-flex;
		grid-row: 2;
		align-items: center;
		gap: 5px;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.tool :global(.arrow) {
		grid-row: 1 / span 2;
		grid-column: 2;
		align-self: center;
		color: var(--text-3);
		transition:
			transform var(--duration) var(--ease),
			color var(--duration) var(--ease);
	}
	.tool:hover :global(.arrow),
	.tool:focus-visible :global(.arrow) {
		color: var(--accent);
		transform: translateX(3px);
	}
	.none {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	@media (max-width: 560px) {
		.deck {
			padding: var(--space-4);
		}
		.deck-head {
			grid-template-columns: auto 1fr;
		}
		.meta {
			grid-column: 2;
		}
	}
</style>
