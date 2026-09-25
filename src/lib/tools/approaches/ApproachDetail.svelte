<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import { toneStyle } from '$lib/components/ui/tones';
	import { toolHref } from '$lib/site';
	import { toolBySlug } from '$lib/tools/registry';
	import ActingHumanly from './ActingHumanly.svelte';
	import {
		COGNITIVE_MODELING,
		LAWS_OF_THOUGHT,
		LAWS_OF_THOUGHT_CITE,
		RATIONAL_AGENT,
		cellLabel,
		type Approach
	} from './content';

	interface Props {
		approach: Approach;
		id?: string;
	}

	let { approach, id }: Props = $props();

	const vacuum = toolBySlug('vacuum');
</script>

<Panel
	{id}
	level={3}
	title={approach.title}
	class="approach-detail"
	style={toneStyle(approach.tone)}
>
	{#snippet actions()}
		<span class="cites">
			{#each approach.cites as cite, i (i)}<CitationTag {cite} />{/each}
		</span>
	{/snippet}

	<div class="lede">
		<p class="kicker">
			<span class="cell">{cellLabel(approach)}</span>
			<span class="name">{approach.approach}</span>
		</p>
		<p class="gist">{approach.gist}</p>
	</div>

	{#if approach.id === 'acting-humanly'}
		<ActingHumanly />
	{:else if approach.id === 'thinking-humanly'}
		<div class="stack">
			<p>{COGNITIVE_MODELING.need}</p>
			<ol class="tiles">
				{#each COGNITIVE_MODELING.methods as method, i (method)}
					<li><span class="tile-num">{i + 1}</span>{method}</li>
				{/each}
			</ol>
			<figure class="merge">
				<figcaption>
					The field of <strong>cognitive science</strong> brings together computer models from AI and
					experimental techniques from psychology.
				</figcaption>
				<div class="merge-diagram" aria-hidden="true">
					<div class="merge-sources">
						{#each COGNITIVE_MODELING.science.from as source (source)}
							<span class="merge-source">{source}</span>
						{/each}
					</div>
					<Icon name="arrow-right" size={20} class="merge-arrow" />
					<span class="merge-target">{COGNITIVE_MODELING.science.name}</span>
				</div>
			</figure>
		</div>
	{:else if approach.id === 'thinking-rationally'}
		<ol class="chain" aria-label="Laws of thought, from Aristotle to theorem provers">
			{#each LAWS_OF_THOUGHT as step (step.title)}
				<li>
					<span class="chain-dot" aria-hidden="true"></span>
					<span class="chain-title">{step.title}</span>
					<span class="chain-text">{step.text}</span>
				</li>
			{/each}
		</ol>
		<p class="source"><CitationTag cite={LAWS_OF_THOUGHT_CITE} /></p>
	{:else}
		<div class="stack">
			<div>
				<p class="label">Computer agents are expected to</p>
				<ul class="expect">
					{#each RATIONAL_AGENT.expected as item (item)}
						<li><Icon name="check" size={16} />{item}</li>
					{/each}
				</ul>
			</div>
			<blockquote class="definition">
				<p>{RATIONAL_AGENT.definition}</p>
			</blockquote>
			<p class="prevailing">
				<Icon name="flag" size={16} />
				{RATIONAL_AGENT.prevailing}
			</p>
			{#if vacuum}
				<p class="more">
					<a href={toolHref('vacuum')}
						>{vacuum.title}<Icon name="arrow-right" size={16} class="more-arrow" /></a
					>
					<span>Runs agent programs in the vacuum world and scores them.</span>
				</p>
			{/if}
		</div>
	{/if}
</Panel>

<style>
	:global(.approach-detail) {
		border-top: 4px solid var(--tone-fg) !important;
	}
	.cites {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-2);
	}
	.lede {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: 0 0 var(--space-5);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--border);
	}
	.lede p {
		margin: 0;
	}
	.kicker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
	}
	.name {
		color: var(--text-2);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.cell {
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--tone-bg);
		color: var(--text-2);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.gist {
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-style: italic;
		line-height: 1.35;
	}
	@media (max-width: 480px) {
		.gist {
			font-size: var(--text-lg);
		}
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.stack p {
		margin: 0;
	}
	.stack .label {
		margin-bottom: var(--space-2);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	/* Thinking humanly */
	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.tiles li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		font-weight: 500;
	}
	.tile-num {
		display: inline-grid;
		flex: none;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		background: var(--tone-bg);
		color: var(--tone-fg);
		font-size: var(--text-xs);
		font-weight: 700;
	}
	.merge {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
		padding: var(--space-4);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.merge-diagram {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}
	.merge-sources {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.merge-source {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-sm);
	}
	.merge :global(.merge-arrow) {
		color: var(--text-3);
	}
	.merge-target {
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--tone-fg);
		border-radius: var(--radius);
		background: var(--tone-bg);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
	}

	/* Thinking rationally */
	.chain {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin: 0;
		padding: 0 0 0 var(--space-5);
		list-style: none;
	}
	.chain::before {
		content: '';
		position: absolute;
		top: 0.6rem;
		bottom: 0.6rem;
		left: 5px;
		width: 2px;
		border-radius: 1px;
		background: var(--tone-bg);
	}
	.chain li {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.chain-dot {
		position: absolute;
		top: 0.45rem;
		left: calc(-1 * var(--space-5));
		width: 12px;
		height: 12px;
		border: 2px solid var(--tone-fg);
		border-radius: 999px;
		background: var(--surface);
	}
	.chain-title {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
	}
	.chain-text {
		color: var(--text-2);
	}
	.source {
		display: flex;
		margin: var(--space-4) 0 0;
	}

	/* Acting rationally */
	.expect {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
		gap: var(--space-2) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.expect li {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}
	.expect li :global(svg) {
		margin-top: 4px;
		color: var(--tone-fg);
	}
	.definition {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		border-left: 3px solid var(--tone-fg);
		border-radius: 0 var(--radius) var(--radius) 0;
		background: var(--surface-2);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		line-height: 1.5;
	}
	.definition p {
		margin: 0;
	}
	.prevailing {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		align-self: flex-start;
		padding: 4px 12px 4px 10px;
		border-radius: 999px;
		background: var(--tone-bg);
		font-weight: 600;
	}
	.prevailing :global(svg) {
		color: var(--tone-fg);
	}
	.more {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.more a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 600;
		text-decoration: none;
	}
	.more a:hover {
		text-decoration: underline;
	}
</style>
