<script lang="ts">
	import { resolve } from '$app/paths';
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import { topics, toolsForTopic } from '$lib/tools/registry';
	import type { Topic } from '$lib/tools/types';

	interface Method {
		label: string;
		/** Topics whose tools this method links to (first one is the link target). */
		topics: Topic[];
		/** Qualifier shown before the label, e.g. "Episodic". */
		when?: string;
	}

	interface Row {
		env: string;
		note: string;
		methods: Method[];
	}

	// Rows follow "Preview of the course" (Rational Agents, slide 18).
	const rows: Row[] = [
		{
			env: 'Deterministic',
			note: 'Can be sequential or episodic',
			methods: [
				{ label: 'Search', topics: ['search', 'informed'] },
				{ label: 'Constraint satisfaction', topics: ['csp'] },
				{ label: 'Classical planning', topics: ['planning'] }
			]
		},
		{
			env: 'Multi-agent, strategic',
			note: 'Can also be stochastic, partially observable',
			methods: [{ label: 'Minimax search, games', topics: ['games'] }]
		},
		{
			env: 'Stochastic',
			note: 'Episodic or sequential; rules known or unknown',
			methods: [
				{ label: 'Bayesian networks, pattern classifiers', topics: ['bayes'], when: 'Episodic' },
				{ label: 'Markov decision processes', topics: ['mdp'], when: 'Sequential, known' },
				{ label: 'Reinforcement learning', topics: ['learning'], when: 'Sequential, unknown' }
			]
		}
	];

	const count = (m: Method) => m.topics.reduce((n, t) => n + toolsForTopic(t).length, 0);
	const target = (m: Method) => m.topics.find((t) => toolsForTopic(t).length > 0) ?? m.topics[0];
	const blurb = (m: Method) =>
		m.topics
			.map((id) => topics.find((t) => t.id === id)?.blurb)
			.filter(Boolean)
			.join('; ');
</script>

<figure class="map" aria-labelledby="map-caption">
	<dl class="rows">
		{#each rows as row (row.env)}
			<div class="row">
				<dt>
					<span class="env">{row.env}</span>
					<span class="note">{row.note}</span>
				</dt>
				<dd>
					<svg class="arrow" viewBox="0 0 28 12" aria-hidden="true">
						<path d="M1 6h24M20 1.5 25 6l-5 4.5" />
					</svg>
					<ul class="methods">
						{#each row.methods as method (method.label)}
							<li>
								{#if count(method) > 0}
									<a
										class="method live"
										href={resolve(`/#${target(method)}`)}
										title={blurb(method)}
									>
										{#if method.when}<span class="when">{method.when}</span>{/if}
										<span class="label">{method.label}</span>
										<span class="count">{count(method)} tool{count(method) === 1 ? '' : 's'}</span>
									</a>
								{:else}
									<span class="method" title={blurb(method)}>
										{#if method.when}<span class="when">{method.when}</span>{/if}
										<span class="label">{method.label}</span>
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				</dd>
			</div>
		{/each}
	</dl>
	<figcaption id="map-caption">
		<span>Environment types and the methods the course covers for each.</span>
		<CitationTag cite={{ deck: 'agents', slide: 18 }} />
	</figcaption>
</figure>

<style>
	.map {
		margin: 0;
		padding: var(--space-5);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}
	.rows {
		display: grid;
		gap: var(--space-4);
		margin: 0;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(10rem, 14rem) 1fr;
		align-items: center;
		gap: var(--space-3);
	}
	dt {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
	}
	.env {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
	}
	.note {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	dd {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		margin: 0;
	}
	.methods {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		min-width: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.method {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		min-height: 48px;
		padding: 6px 12px;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
		color: var(--text-3);
		line-height: 1.25;
		text-decoration: none;
	}
	.label {
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.when {
		font-size: var(--text-xs);
		letter-spacing: 0.02em;
	}
	.live {
		border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
		background: var(--accent-soft);
		color: var(--text);
		transition:
			border-color var(--duration) var(--ease),
			background var(--duration) var(--ease);
	}
	.live:hover {
		border-color: var(--accent);
		color: var(--text);
	}
	.live .when {
		color: var(--text-2);
	}
	.count {
		color: var(--accent);
		font-size: var(--text-xs);
		font-weight: 500;
	}
	.arrow {
		flex: none;
		width: 28px;
		height: 12px;
		fill: none;
		stroke: var(--text-3);
		stroke-width: 1.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	figcaption {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-4);
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	@media (max-width: 640px) {
		.map {
			padding: var(--space-4);
		}
		.row {
			grid-template-columns: 1fr;
			gap: var(--space-2);
		}
		.arrow {
			display: none;
		}
		.method {
			min-height: 40px;
			padding: 4px 10px;
		}
	}
</style>
