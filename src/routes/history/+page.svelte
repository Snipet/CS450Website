<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import ToolPage from '$lib/components/ui/ToolPage.svelte';
	import { toolHref } from '$lib/site';
	import { tool } from '$lib/tools/catalog/history';
	import EraList from '$lib/tools/history/EraList.svelte';
	import TimelineChart from '$lib/tools/history/TimelineChart.svelte';
	import {
		AI_BOOM,
		ERAS,
		EVENTS,
		FOUNDATIONS,
		FOUNDATIONS_CITE,
		PERCEPTRON_ARTICLE,
		SIMON_QUOTE,
		STATE_OF_THE_ART,
		STATE_OF_THE_ART_CITE,
		THEMES,
		THEMES_CITE,
		TIMELINE_CITE,
		TIMELINE_END,
		TIMELINE_START,
		WINTERS
	} from '$lib/tools/history/content';
	import {
		completeHistoryState,
		defaultHistoryState,
		isHistoryState,
		type HistoryState
	} from '$lib/tools/history/state';
	import { eventsDuring } from '$lib/tools/history/timeline';
	import { toolBySlug } from '$lib/tools/registry';
	import { syncToHash } from '$lib/url-state';

	let state = $state<HistoryState>(defaultHistoryState());

	syncToHash(() => state, {
		validate: isHistoryState,
		onLoad(saved) {
			Object.assign(state, completeHistoryState(saved));
		}
	});

	const selectedEra = $derived(ERAS.find((e) => e.id === state.era) ?? null);
	const highlighted = $derived(
		new Set(selectedEra ? eventsDuring(selectedEra, EVENTS).map((e) => e.id) : [])
	);
	const approaches = toolBySlug('approaches');
	const lines = AI_BOOM.overview.series;
	const series = `${lines.slice(0, -1).join(', ')}, and ${lines[lines.length - 1]}`;
</script>

<ToolPage {tool}>
	<Panel title="Foundations of artificial intelligence">
		{#snippet actions()}<CitationTag cite={FOUNDATIONS_CITE} />{/snippet}
		<ol class="foundations">
			{#each FOUNDATIONS as field, i (field)}
				<li><span class="index">{String(i + 1).padStart(2, '0')}</span>{field}</li>
			{/each}
		</ol>
	</Panel>

	<Panel title="A brief history of artificial intelligence">
		{#snippet actions()}<CitationTag cite={TIMELINE_CITE} />{/snippet}
		<div class="timeline">
			<TimelineChart
				eras={ERAS}
				events={EVENTS}
				winters={WINTERS}
				start={TIMELINE_START}
				end={TIMELINE_END}
				selected={state.era}
				onselect={(id) => (state.era = id)}
			/>
			<ul class="legend" aria-label="Legend">
				<li><span class="key bar" aria-hidden="true"></span>Era (slide 20)</li>
				<li><span class="key arrow" aria-hidden="true"></span>Continues to the present</li>
				<li><span class="key band" aria-hidden="true"></span>AI winter (slide 23)</li>
				<li><span class="key dot" aria-hidden="true">1</span>Date from the slides</li>
			</ul>
			<div class="below">
				<section aria-labelledby="eras-title">
					<h3 id="eras-title" class="sub">Eras</h3>
					<p class="hint">Select an era, here or in the chart, to highlight it.</p>
					<EraList
						eras={ERAS}
						events={EVENTS}
						winters={WINTERS}
						selected={state.era}
						onselect={(id) => (state.era = id)}
					/>
				</section>
				<section aria-labelledby="dates-title">
					<h3 id="dates-title" class="sub">Dates from the slides</h3>
					<ol class="dates">
						{#each EVENTS as e, i (e.id)}
							<li class={{ dim: selectedEra !== null && !highlighted.has(e.id) }}>
								<span class="dot" aria-hidden="true">{i + 1}</span>
								<span class="date-year">{e.year}</span>
								<span class="date-text">{e.label} <CitationTag cite={e.cite} /></span>
							</li>
						{/each}
					</ol>
				</section>
			</div>
		</div>
	</Panel>

	<div class="pair">
		<Panel title="A prediction">
			{#snippet actions()}<CitationTag cite={SIMON_QUOTE.cite} />{/snippet}
			<figure class="quote">
				<blockquote>
					<p>
						“{SIMON_QUOTE.lead} <strong>{SIMON_QUOTE.emphasis}</strong>”
					</p>
				</blockquote>
				<figcaption>— {SIMON_QUOTE.author}, {SIMON_QUOTE.year}</figcaption>
			</figure>
			<div class="outcome">
				<div class="stat">
					<span class="stat-label">Predicted</span>
					<span class="stat-value">within {SIMON_QUOTE.predictedYears} years</span>
				</div>
				<Icon name="arrow-right" size={18} class="stat-arrow" />
				<div class="stat">
					<span class="stat-label">Came true</span>
					<span class="stat-value">{SIMON_QUOTE.actualYears} years later</span>
				</div>
			</div>
			<p class="outcome-text">{SIMON_QUOTE.outcome}.</p>
		</Panel>

		<Panel title="{PERCEPTRON_ARTICLE.year} {PERCEPTRON_ARTICLE.paper}">
			{#snippet actions()}<CitationTag cite={PERCEPTRON_ARTICLE.cite} />{/snippet}
			<article class="clipping" aria-label="Newspaper article shown on the slide">
				<p class="dateline">{PERCEPTRON_ARTICLE.paper} · {PERCEPTRON_ARTICLE.year}</p>
				<h3 class="headline">{PERCEPTRON_ARTICLE.headline}</h3>
				<p class="subhead">{PERCEPTRON_ARTICLE.subhead}</p>
				<p class="excerpt">… {PERCEPTRON_ARTICLE.excerpt} …</p>
			</article>
			<p class="note">
				Headline, subhead, and an excerpt of the clipping on the slide, a report on the perceptron.
			</p>
		</Panel>
	</div>

	<Panel title="Boom to bust: AI winters">
		{#snippet actions()}<CitationTag cite={WINTERS[0].cite} />{/snippet}
		<div class="winters">
			{#each WINTERS as w (w.id)}
				<section class="winter" aria-labelledby="winter-{w.id}">
					<p class="period">{w.period}</p>
					<h3 id="winter-{w.id}">{w.label}</h3>
					<ul>
						{#each w.points as point (point)}
							<li>{point}</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</Panel>

	<Panel title="Historical themes">
		{#snippet actions()}<CitationTag cite={THEMES_CITE} />{/snippet}
		<ol class="themes">
			{#each THEMES as theme, i (theme.id)}
				<li class="theme">
					<span class="theme-num" aria-hidden="true">{i + 1}</span>
					<h3>{theme.title}</h3>
					{#each theme.body as part, j (j)}
						{#if part.kind === 'quote'}
							<blockquote class="theme-quote">
								<p>“{part.text}”</p>
								<footer>({part.source})</footer>
							</blockquote>
						{:else if part.kind === 'term'}
							<p><strong>{part.term}:</strong> {part.text}</p>
						{:else}
							<p>{part.text}</p>
						{/if}
					{/each}
				</li>
			{/each}
		</ol>
	</Panel>

	<div class="pair">
		<Panel title="Current AI boom">
			{#snippet actions()}<CitationTag cite={{ deck: 'intro', slide: [25, 26] }} />{/snippet}
			<p class="source-line">
				{AI_BOOM.authors}, <cite>{AI_BOOM.title}</cite>, {AI_BOOM.venue}.
			</p>
			<p class="boom-text">
				The slides show two of its charts. The first, “{AI_BOOM.overview.title}”, covers {AI_BOOM
					.overview.years[0]}–{AI_BOOM.overview.years[1]} with {series} lines; discussion takes off around
				{AI_BOOM.overview.takeoff}. The second splits the articles by theme:
			</p>
			<ul class="chips">
				{#each AI_BOOM.themes as theme (theme)}
					<li>{theme}</li>
				{/each}
			</ul>
		</Panel>

		<Panel title="State of the art in AI">
			{#snippet actions()}<CitationTag cite={STATE_OF_THE_ART_CITE} />{/snippet}
			<ul class="art">
				{#each STATE_OF_THE_ART as area (area)}
					<li>{area}</li>
				{/each}
			</ul>
			{#if approaches}
				<p class="more">
					<a href={toolHref('approaches')}
						>{approaches.title}<Icon name="arrow-right" size={16} class="more-arrow" /></a
					>
					<span>Places these applications in the four approaches on a shareable board.</span>
				</p>
			{/if}
		</Panel>
	</div>
</ToolPage>

<style>
	/* Foundations */
	.foundations {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.foundations li {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.3;
	}
	@media (min-width: 760px) {
		.foundations {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	@media (max-width: 480px) {
		.foundations li {
			gap: var(--space-2);
			padding: var(--space-2) var(--space-3);
			font-size: var(--text-base);
		}
	}
	.index {
		color: var(--text-3);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
	}

	/* Timeline */
	.timeline {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--text-2);
		font-size: var(--text-xs);
	}
	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.key {
		display: inline-block;
		flex: none;
	}
	.key.bar {
		width: 18px;
		height: 8px;
		border-radius: 2px;
		background: var(--accent);
	}
	.key.arrow {
		width: 0;
		height: 0;
		border-top: 6px solid transparent;
		border-bottom: 6px solid transparent;
		border-left: 9px solid var(--accent);
	}
	.key.band {
		width: 18px;
		height: 12px;
		border-radius: 2px;
		background: var(--info-soft);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--info) 30%, transparent);
	}
	.key.dot,
	.dot {
		display: inline-grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border: 1.5px solid var(--text-2);
		border-radius: 999px;
		background: var(--surface);
		color: var(--text);
		font-size: 10px;
		font-weight: 700;
	}
	.below {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}
	@media (min-width: 1000px) {
		.below {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--space-6);
		}
	}
	.sub {
		margin: 0 0 var(--space-1);
		font-size: var(--text-base);
	}
	.hint {
		margin: 0 0 var(--space-2);
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	.dates {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: var(--space-2) 0 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}
	.dates li {
		display: grid;
		grid-template-columns: auto 2.75rem minmax(0, 1fr);
		align-items: baseline;
		gap: var(--space-2);
		transition: opacity var(--duration) var(--ease);
	}
	.dates li.dim {
		opacity: 0.4;
	}
	.dates .dot {
		align-self: start;
		margin-top: 1px;
	}
	.date-year {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.date-text {
		line-height: 1.5;
	}

	/* Pairs of panels */
	.pair {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: stretch;
	}
	@media (min-width: 1000px) {
		.pair {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}

	/* Simon */
	.quote {
		margin: 0 0 var(--space-4);
	}
	.quote blockquote {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		border-left: 3px solid var(--active);
		border-radius: 0 var(--radius) var(--radius) 0;
		background: var(--surface-2);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-style: italic;
		line-height: 1.55;
	}
	.quote blockquote p {
		margin: 0;
	}
	.quote figcaption {
		margin-top: var(--space-2);
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.outcome {
		display: grid;
		grid-template-columns: minmax(0, max-content) auto minmax(0, max-content);
		align-items: center;
		gap: var(--space-2) var(--space-3);
	}
	.outcome :global(.stat-arrow) {
		color: var(--text-3);
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.stat-label {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.stat-value {
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-weight: 600;
		line-height: 1.2;
	}
	@media (max-width: 480px) {
		.stat {
			padding: var(--space-2) var(--space-3);
		}
		.stat-value {
			font-size: var(--text-base);
		}
	}
	.outcome-text {
		margin: var(--space-3) 0 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}

	/* Newspaper clipping */
	.clipping {
		padding: var(--space-4) var(--space-5) var(--space-5);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		font-family: var(--font-serif);
		text-align: center;
	}
	.dateline {
		margin: 0 0 var(--space-3);
		padding-bottom: var(--space-2);
		border-bottom: 3px double var(--border-strong);
		color: var(--text-3);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.headline {
		margin: 0 0 var(--space-2);
		font-size: clamp(1.5rem, 1.2rem + 1.2vw, 2rem);
		font-weight: 700;
		letter-spacing: 0.01em;
		line-height: 1.1;
		text-transform: uppercase;
	}
	.subhead {
		margin: 0 auto var(--space-3);
		max-width: 26rem;
		color: var(--text-2);
		font-size: var(--text-base);
		font-weight: 600;
	}
	.excerpt {
		margin: 0 auto;
		max-width: 30rem;
		padding-top: var(--space-3);
		border-top: 1px solid var(--border-strong);
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.6;
		text-align: justify;
		hyphens: auto;
	}
	.note {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-sm);
	}

	/* Winters */
	.winters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
		gap: var(--space-4);
	}
	.winter {
		padding: var(--space-4);
		border: 1px solid color-mix(in srgb, var(--info) 30%, transparent);
		border-top: 3px solid var(--info);
		border-radius: var(--radius);
		background: var(--info-soft);
	}
	.period {
		margin: 0 0 var(--space-1);
		color: var(--info);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.winter h3 {
		margin: 0 0 var(--space-2);
		font-size: var(--text-lg);
	}
	.winter ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding-left: 1.1rem;
		font-size: var(--text-sm);
	}

	/* Themes */
	.themes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.theme {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.theme-num {
		display: inline-grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		background: var(--tok-2);
		color: var(--surface);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
	}
	.theme:nth-child(2) .theme-num {
		background: var(--tok-4);
	}
	.theme:nth-child(3) .theme-num {
		background: var(--tok-5);
	}
	.theme h3 {
		margin: var(--space-1) 0 0;
		font-size: var(--text-lg);
	}
	.theme p {
		margin: 0;
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.theme-quote {
		margin: 0;
	}
	.theme-quote p {
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-style: italic;
	}
	.theme-quote footer {
		margin-top: var(--space-1);
		color: var(--text-3);
		font-size: var(--text-sm);
	}

	/* Current AI boom */
	.source-line {
		margin: 0 0 var(--space-3);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		line-height: 1.45;
	}
	cite {
		font-style: italic;
	}
	.boom-text {
		margin: 0 0 var(--space-3);
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.chips li {
		padding: 2px 10px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text-2);
		font-size: var(--text-xs);
	}

	/* State of the art */
	.art {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr));
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.art li {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: var(--radius-sm);
		background: var(--surface);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.more {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
		margin: var(--space-4) 0 0;
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
