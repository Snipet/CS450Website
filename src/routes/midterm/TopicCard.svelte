<!--
@component
One review item: its check-off box, the facts from the slides, any table that
goes with it, links into the tools, slide questions with answers, and the
practice drill (rendered when its disclosure is first opened).
-->
<script lang="ts">
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Disclosure from '$lib/components/ui/Disclosure.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { toolLink } from '$lib/tools/links';
	import GameDrill from './GameDrill.svelte';
	import HeuristicDrill from './HeuristicDrill.svelte';
	import PropertiesQuiz from './PropertiesQuiz.svelte';
	import SearchDrill from './SearchDrill.svelte';
	import {
		ALGORITHMS,
		ENVIRONMENT_TYPES,
		GLOSSARY,
		LISP_FORMS,
		LISP_PATTERNS,
		LISP_TRACE,
		PROS_CONS,
		type Practice,
		type SheetItem,
		type ToolExample
	} from './sheet';

	interface Props {
		item: SheetItem;
		/** Section number, for the "3c" label. */
		section: number;
		checked: boolean;
		onchange: (checked: boolean) => void;
	}

	let { item, section, checked, onchange }: Props = $props();

	const links = $derived(
		item.examples.flatMap((ex: ToolExample) => {
			const href = toolLink(ex.slug, ex.state);
			return href ? [{ ...ex, href }] : [];
		})
	);
	const lispHref = (code: string) => toolLink('lisp', { code });
	const traceText = [LISP_TRACE.call, ...LISP_TRACE.steps.map((step) => `= ${step}`)].join('\n');

	function practiceTitle(p: Practice): string {
		switch (p.kind) {
			case 'search':
				return 'Practice: write the expansion order';
			case 'heuristic':
				return 'Practice: admissible or consistent?';
			case 'game':
				return p.focus === 'minimax'
					? 'Practice: minimax value and move'
					: 'Practice: what alpha-beta prunes';
			case 'properties':
				return 'Practice: fill in the strategy table';
		}
	}
</script>

{#snippet runLink(code: string)}
	{@const href = lispHref(code)}
	{#if href}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
		<a class="tool-link" {href}
			>Run it in the Lisp evaluator <Icon name="arrow-right" size={15} /></a
		>
	{/if}
{/snippet}

<article class={['topic', { checked }]} id={item.id} aria-labelledby="{item.id}-title">
	<header class="head">
		<h3 id="{item.id}-title" tabindex="-1">
			<span class="label">{section}{item.letter}</span>
			<span class="title">{item.title}</span>
		</h3>
		<label class="check">
			<input
				type="checkbox"
				{checked}
				onchange={(e) => onchange(e.currentTarget.checked)}
				aria-describedby="{item.id}-title"
			/>
			<span class="box" aria-hidden="true"><Icon name="check" size={14} /></span>
			<span class="check-text">{checked ? 'Checked off' : 'Check off'}</span>
		</label>
	</header>

	<div class="body">
		{#if item.note}<p class="note">{item.note}</p>{/if}

		{#if item.facts.length}
			<ul class="facts">
				{#each item.facts as fact, i (i)}
					<li>
						{fact.text}
						{#if fact.cite}<CitationTag cite={fact.cite} />{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if item.extra === 'environments'}
			<dl class="terms">
				{#each ENVIRONMENT_TYPES as t (t.term)}
					<div class="term">
						<dt>{t.term}</dt>
						<dd>
							{t.meaning}
							{#if t.cite}<CitationTag cite={t.cite} />{/if}
						</dd>
					</div>
				{/each}
			</dl>
		{:else if item.extra === 'algorithms'}
			<div class="table-wrap">
				<table class="grid-table">
					<thead>
						<tr>
							<th scope="col">Algorithm</th>
							<th scope="col">Frontier</th>
							<th scope="col">Takes next</th>
						</tr>
					</thead>
					<tbody>
						{#each ALGORITHMS as a (a.name)}
							<tr>
								<th scope="row">{a.name}</th>
								<td><span class="cell-label">Frontier:</span>{a.frontier}</td>
								<td>
									<span class="cell-label">Takes next:</span>{a.next}
									<CitationTag cite={a.cite} />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if item.extra === 'pros-cons'}
			<div class="table-wrap">
				<table class="grid-table">
					<thead>
						<tr>
							<th scope="col">Method</th>
							<th scope="col">Pros</th>
							<th scope="col">Cons</th>
						</tr>
					</thead>
					<tbody>
						{#each PROS_CONS as p (p.name)}
							<tr>
								<th scope="row">{p.name}</th>
								<td><span class="cell-label">Pros:</span>{p.pros}</td>
								<td><span class="cell-label">Cons:</span>{p.cons}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if item.extra === 'glossary'}
			{#each GLOSSARY as g (g.group)}
				<h4 class="sub">{g.group}</h4>
				<dl class="terms">
					{#each g.terms as t (t.term)}
						<div class="term">
							<dt>{t.term}</dt>
							<dd>
								{t.meaning}
								{#if t.cite}<CitationTag cite={t.cite} />{/if}
							</dd>
						</div>
					{/each}
				</dl>
			{/each}
		{:else if item.extra === 'lisp-basics'}
			<div class="table-wrap">
				<table class="forms">
					<caption class="visually-hidden">Lisp forms and their values</caption>
					<thead><tr><th scope="col">Form</th><th scope="col">Value</th></tr></thead>
					<tbody>
						{#each LISP_FORMS as f (f.form)}
							<tr><td class="mono">{f.form}</td><td class="mono">{f.value}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			<h4 class="sub">A traced call</h4>
			<pre class="code">{LISP_TRACE.code}</pre>
			<pre class="code">{traceText}</pre>
			{@render runLink(`${LISP_TRACE.code}\n\n${LISP_TRACE.call}`)}
		{:else if item.extra === 'lisp-patterns'}
			{#each LISP_PATTERNS as p (p.title)}
				<h4 class="sub">{p.title}</h4>
				<pre class="code">{p.code}</pre>
				<p class="call"><span class="mono">{p.call}</span> → <span class="mono">{p.value}</span></p>
				{@render runLink(`${p.code}\n\n${p.call}`)}
			{/each}
		{/if}

		{#if links.length}
			<div class="block">
				<h4 class="sub">In the tools</h4>
				<ul class="links">
					{#each links as l, i (i)}
						<li>
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
							<a href={l.href}>{l.label}<Icon name="arrow-right" size={14} class="arrow" /></a>
							{#if l.note}<span class="link-note">{l.note}</span>{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if item.questions?.length}
			<div class="block">
				<h4 class="sub">Questions from the slides</h4>
				<ul class="questions">
					{#each item.questions as q, i (i)}
						<li>
							<p class="question">{q.question}</p>
							<Disclosure>
								<p class="answer">{q.answer} <CitationTag cite={q.cite} /></p>
							</Disclosure>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if item.practice}
			<Disclosure variant="boxed" summary={practiceTitle(item.practice)}>
				{#if item.practice.kind === 'search'}
					<SearchDrill strategy={item.practice.strategy} />
				{:else if item.practice.kind === 'heuristic'}
					<HeuristicDrill />
				{:else if item.practice.kind === 'game'}
					<GameDrill focus={item.practice.focus} />
				{:else}
					<PropertiesQuiz />
				{/if}
			</Disclosure>
		{/if}
	</div>
</article>

<style>
	.topic {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
		padding: var(--space-4) var(--space-5) var(--space-5);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		scroll-margin-top: var(--space-5);
		transition: border-color var(--duration) var(--ease);
	}
	.topic.checked {
		border-color: color-mix(in srgb, var(--accept) 45%, var(--border));
	}
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
	}
	h3 {
		display: flex;
		gap: var(--space-2);
		margin: 0;
		font-size: var(--text-xl);
		line-height: 1.3;
	}
	h3:focus {
		outline: none;
	}
	h3:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 3px;
	}
	.label {
		flex: none;
		color: var(--text-3);
		font-family: var(--font-mono);
		font-size: var(--text-base);
		font-weight: 500;
		line-height: 1.9;
	}
	.check {
		position: relative;
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 8px;
		padding: 5px 12px 5px 8px;
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		background: var(--surface);
		color: var(--text-2);
		font-size: var(--text-sm);
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
		transition:
			border-color var(--duration) var(--ease),
			background var(--duration) var(--ease);
	}
	.check:hover {
		border-color: var(--text-3);
	}
	.check input {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: 0;
		opacity: 0;
		pointer-events: none;
	}
	.box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border: 1.5px solid var(--border-strong);
		border-radius: 5px;
		background: var(--surface);
		color: transparent;
		transition:
			background var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}
	.check:has(input:checked) {
		border-color: color-mix(in srgb, var(--accept) 55%, transparent);
		background: var(--accept-soft);
		color: var(--accept);
	}
	input:checked + .box {
		border-color: var(--accept);
		background: var(--accept);
		color: var(--surface);
	}
	input:focus-visible + .box {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.note {
		margin: 0;
		color: var(--text-2);
	}
	.facts {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding-left: var(--space-5);
		line-height: 1.6;
	}
	.facts :global(.cite) {
		margin-left: 2px;
	}
	.sub {
		margin: var(--space-2) 0 0;
		color: var(--text-2);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.links {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.links li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px var(--space-2);
	}
	.links a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 500;
	}
	.links a :global(.arrow) {
		transition: transform var(--duration) var(--ease);
	}
	.links a:hover :global(.arrow) {
		transform: translateX(2px);
	}
	.link-note {
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	.questions {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.question {
		margin: 0;
	}
	.answer {
		margin: 0;
		color: var(--text-2);
	}
	.terms {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
	}
	.term {
		display: grid;
		grid-template-columns: minmax(9rem, 14rem) 1fr;
		gap: var(--space-1) var(--space-4);
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
	}
	.term dt {
		font-weight: 600;
	}
	.term dd {
		margin: 0;
		color: var(--text-2);
	}
	.table-wrap {
		max-width: 100%;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	th,
	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}
	tbody th {
		font-weight: 600;
		white-space: nowrap;
	}
	.forms {
		width: auto;
	}
	.cell-label {
		display: none;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.code {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-ligatures: none;
		line-height: 1.55;
	}
	.call {
		margin: 0;
		font-size: var(--text-sm);
	}
	.tool-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		align-self: flex-start;
		font-weight: 500;
	}
	@media (max-width: 640px) {
		.topic {
			padding: var(--space-4);
		}
		.head {
			flex-direction: column;
		}
		.term {
			grid-template-columns: 1fr;
		}
		.grid-table thead {
			display: none;
		}
		.grid-table,
		.grid-table tbody,
		.grid-table tr,
		.grid-table th,
		.grid-table td {
			display: block;
		}
		.grid-table tr {
			padding: var(--space-2) 0;
			border-bottom: 1px solid var(--border);
		}
		.grid-table th,
		.grid-table td {
			padding: 2px 0;
			border: 0;
		}
		.cell-label {
			display: inline;
			margin-right: 0.35em;
			color: var(--text-3);
			font-weight: 500;
		}
	}
</style>
