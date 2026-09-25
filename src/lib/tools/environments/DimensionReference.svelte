<script lang="ts">
	import { CitationTag, toneStyle } from '$lib/components/ui';
	import { DIMENSIONS, type Dimension } from '$lib/theory/agents/environments';
	import { valueTone } from './view';

	const pictured = (values: readonly { pictured?: string }[]) =>
		values.map((v) => v.pictured).filter((p): p is string => p !== undefined);
</script>

<div class="cards">
	{#each DIMENSIONS as d, i (d.id)}
		{@const pics = pictured(d.values)}
		<article class={['card', { wide: i === DIMENSIONS.length - 1 }]} aria-labelledby="dim-{d.id}">
			<header class="card-head">
				<h3 id="dim-{d.id}">{d.title}</h3>
				<CitationTag cite={d.cite} />
			</header>
			<div class="ask">
				<p class="question">{d.question}</p>
				{#if d.details.length}
					<ul class="details">
						{#each d.details as detail, k (k)}<li>{detail}</li>{/each}
					</ul>
				{/if}
			</div>
			<div class="answer">
				<dl class="values">
					{#each d.values as v (v.id)}
						<div class="value">
							<dt>
								<span
									class="dot"
									style={toneStyle(valueTone(d.id as Dimension, v.id as never))}
									aria-hidden="true"
								></span>
								{v.name}
							</dt>
							<dd>{v.definition}</dd>
						</div>
					{/each}
				</dl>
				{#if pics.length === 2}
					<p class="pictured">Pictured on the slide: {pics[0]} vs. {pics[1]}.</p>
				{/if}
			</div>
		</article>
	{/each}
</div>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
		gap: var(--space-4);
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.card-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-1) var(--space-2);
	}
	h3 {
		margin: 0;
		font-size: var(--text-lg);
	}
	.ask,
	.answer {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.answer {
		flex: 1;
	}
	/* The last card spans the row (seven cards never fill a grid of two or three). */
	.card.wide {
		grid-column: 1 / -1;
	}
	@media (min-width: 760px) {
		.card.wide {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--space-2) var(--space-6);
		}
		.card.wide .card-head {
			grid-column: 1 / -1;
		}
		.card.wide .values {
			margin-top: 0;
			padding-top: 0;
			border-top: 0;
		}
	}
	.question {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-style: italic;
		line-height: 1.5;
	}
	.details {
		margin: 0;
		padding-left: var(--space-4);
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.details li::marker {
		content: '– ';
		color: var(--text-3);
	}
	.values {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: var(--space-1) 0 0;
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
	}
	dt {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 600;
	}
	dd {
		margin: 0 0 0 calc(9px + var(--space-2));
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.dot {
		flex: none;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--tone-fg);
		box-shadow: 0 0 0 2px var(--tone-bg);
	}
	.pictured {
		margin: auto 0 0;
		padding-top: var(--space-1);
		color: var(--text-3);
		font-size: var(--text-xs);
	}
</style>
