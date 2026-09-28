<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import {
		STRONG_WEAK,
		TOTAL_TURING_TEST,
		TURING_TEST,
		WINOGRAD,
		WINOGRAD_SCHEMAS,
		WINOGRAD_VS_TURING
	} from './content';
	import WinogradQuestion from './WinogradQuestion.svelte';

	const challenge = WINOGRAD_VS_TURING.challenge;
	const bars = [
		{ label: 'Best system', value: challenge.bestPercent },
		{ label: 'Humans', value: challenge.humanPercent }
	];
</script>

<div class="acting-humanly">
	<section class="block" aria-labelledby="ah-turing">
		<div class="block-head">
			<h4 id="ah-turing">The Turing test</h4>
			<CitationTag cite={TURING_TEST.cite} />
		</div>
		<p>
			Proposed by {TURING_TEST.by} in {TURING_TEST.year}. {TURING_TEST.pass}
		</p>

		<figure class="tests">
			<figcaption class="visually-hidden">
				Capabilities each version of the Turing test would require
			</figcaption>
			<div class="test total">
				<div class="test-head">
					<span class="test-name">Total Turing test</span>
					<CitationTag cite={TOTAL_TURING_TEST.cite} />
				</div>
				<div class="test written">
					<div class="test-head">
						<span class="test-name">Original test: written questions and answers</span>
						<CitationTag cite={TURING_TEST.cite} />
					</div>
					<p class="test-note">Would require (at least):</p>
					<ul class="caps">
						{#each TURING_TEST.written as cap (cap)}
							<li><Icon name="check" size={14} />{cap}</li>
						{/each}
					</ul>
				</div>
				<p class="test-note">{TOTAL_TURING_TEST.adds} The robot would also need:</p>
				<ul class="caps extra">
					{#each TOTAL_TURING_TEST.robot as cap (cap)}
						<li><Icon name="plus" size={14} />{cap}</li>
					{/each}
				</ul>
			</div>
		</figure>
	</section>

	<section class="block" aria-labelledby="ah-winograd">
		<div class="block-head">
			<h4 id="ah-winograd">A better Turing test?</h4>
			<CitationTag cite={{ deck: 'intro', slide: [7, 9] }} />
		</div>
		<p>
			<cite>{WINOGRAD.paper}</cite> ({WINOGRAD.author}, {WINOGRAD.venue}).
			<strong>Winograd schema:</strong>
			{WINOGRAD.definition}
		</p>
		<p class="hint">Pick an answer to each question, then reveal it.</p>
		<div class="schemas">
			{#each WINOGRAD_SCHEMAS as schema, i (schema.id)}
				<WinogradQuestion {schema} number={i + 1} />
			{/each}
		</div>
	</section>

	<section class="block" aria-labelledby="ah-vs">
		<div class="block-head">
			<h4 id="ah-vs">Winograd vs Turing</h4>
			<CitationTag cite={WINOGRAD_VS_TURING.cite} />
		</div>
		<div class="vs">
			<div>
				<p class="label">Advantages over the standard Turing test</p>
				<ul class="checks">
					{#each WINOGRAD_VS_TURING.advantages as adv (adv)}
						<li><Icon name="check" size={16} />{adv}</li>
					{/each}
				</ul>
			</div>
			<div class="challenge">
				<p class="label">Winograd schema challenge</p>
				<p class="challenge-meta">
					{challenge.held}. {challenge.entries} entries, {challenge.questions} questions.
				</p>
				<div
					class="bars"
					role="img"
					aria-label="Questions answered correctly: best system {challenge.bestPercent}% of {challenge.questions}, humans {challenge.humanPercent}%."
				>
					{#each bars as bar (bar.label)}
						<div class="bar-row">
							<span class="bar-label">{bar.label}</span>
							<span class="track">
								<span class="fill" style="width: {bar.value}%"></span>
							</span>
							<span class="bar-value">{bar.value}%</span>
						</div>
					{/each}
					<div class="scale" aria-hidden="true">
						<span></span>
						<span class="scale-ticks"><span>0%</span><span>50%</span><span>100%</span></span>
						<span></span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="block" aria-labelledby="ah-strong">
		<div class="block-head">
			<h4 id="ah-strong">Strong vs. weak AI</h4>
			<CitationTag cite={STRONG_WEAK.cite} />
		</div>
		<dl class="strong-weak">
			<div class="sw">
				<dt>“Weak” AI</dt>
				<dd>{STRONG_WEAK.weak}</dd>
			</div>
			<div class="sw">
				<dt>“Strong” AI</dt>
				<dd>{STRONG_WEAK.strong}</dd>
			</div>
		</dl>
		<p class="room">
			<strong
				>{STRONG_WEAK.chineseRoom.by}’s Chinese Room thought experiment ({STRONG_WEAK.chineseRoom
					.year})</strong
			>
		</p>
		<p class="room-outline">
			<span class="aside-tag">Not on the slide</span>
			{STRONG_WEAK.chineseRoom.outline}
		</p>
	</section>
</div>

<style>
	.acting-humanly {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.block + .block {
		padding-top: var(--space-5);
		border-top: 1px solid var(--border);
	}
	.block-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
	}
	h4 {
		margin: 0;
	}
	p {
		margin: 0;
	}
	.hint {
		color: var(--text-3);
		font-size: var(--text-sm);
	}

	/* Nested tests */
	.tests {
		margin: 0;
	}
	.test {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
		padding: var(--space-3) var(--space-4) var(--space-4);
		border-radius: var(--radius);
	}
	.total {
		border: 1px dashed var(--border-strong);
		background: var(--surface-2);
	}
	.written {
		margin-bottom: var(--space-1);
		border: 1px solid var(--border);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}
	.test-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1) var(--space-2);
	}
	.test-name {
		font-family: var(--font-serif);
		font-weight: 600;
	}
	.test-note {
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.caps {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.caps li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px 3px 8px;
		border: 1px solid color-mix(in srgb, var(--tok-0) 35%, transparent);
		/* A pill on one line, a rounded box when a long item wraps. */
		border-radius: 14px;
		background: var(--tok-0-soft);
		font-size: var(--text-sm);
	}
	.caps li :global(svg) {
		color: var(--tok-0);
	}
	.caps.extra li {
		border-style: dashed;
		background: var(--surface);
	}

	/* Winograd */
	.schemas {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-3);
	}
	cite {
		font-style: italic;
	}

	/* Winograd vs Turing */
	.vs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: var(--space-4) var(--space-5);
	}
	.label {
		margin-bottom: var(--space-2);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.checks {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}
	.checks li {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}
	.checks li :global(svg) {
		margin-top: 2px;
		color: var(--accept);
	}
	.challenge-meta {
		margin-bottom: var(--space-3);
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.bars {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.bar-row,
	.scale {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr) 2.75rem;
		align-items: center;
		gap: var(--space-2);
	}
	.bar-label {
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.track {
		position: relative;
		height: 14px;
		border-radius: 4px;
		background: var(--surface-3);
		overflow: hidden;
	}
	.fill {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: 4px;
		background: var(--accent);
	}
	.bar-value {
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		text-align: right;
	}
	.scale-ticks {
		display: flex;
		justify-content: space-between;
		color: var(--text-3);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}

	/* Strong vs weak */
	.strong-weak {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: var(--space-3);
		margin: 0;
	}
	.sw {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.sw dt {
		margin-bottom: var(--space-1);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
	}
	.sw dd {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.room {
		font-size: var(--text-sm);
		line-height: 1.6;
	}
	.room-outline {
		margin-top: calc(-1 * var(--space-2));
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.6;
	}
	.aside-tag {
		display: inline-block;
		margin-right: var(--space-1);
		padding: 0 7px;
		border: 1px dashed var(--border-strong);
		border-radius: 999px;
		color: var(--text-3);
		font-size: var(--text-xs);
		line-height: 1.5;
		white-space: nowrap;
	}
</style>
