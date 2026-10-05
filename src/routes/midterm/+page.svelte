<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Callout from '$lib/components/ui/Callout.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { pageTitle } from '$lib/site';
	import { nextUnchecked, percent, progressOf } from './checklist';
	import { Checklist } from './checklist.svelte';
	import { ITEM_ORDER, POINT_GROUPS, SHEET } from './sheet';
	import TopicCard from './TopicCard.svelte';

	const description =
		'The CMSC450 midterm review topics in sheet order, with the facts from the lecture slides, the tools opened on the slide examples, practice problems, and a checklist saved in the browser.';

	const checklist = new Checklist(ITEM_ORDER);
	onMount(() => checklist.load());

	const sectionIds = (id: string) => SHEET.find((s) => s.id === id)?.items.map((i) => i.id) ?? [];
	const overall = $derived(progressOf(ITEM_ORDER, checklist.checked));
	const groups = $derived(
		POINT_GROUPS.map((g) => ({
			...g,
			progress: progressOf(
				g.sections.flatMap((s) => sectionIds(s)),
				checklist.checked
			)
		}))
	);

	/** The item "Next unchecked topic" last went to. */
	let lastJump = $state<string | null>(null);
	let confirmClear = $state(false);

	async function jumpTo(id: string) {
		lastJump = id;
		await tick();
		const card = document.getElementById(id);
		if (!card) return;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
	}

	function jumpNext() {
		const id = nextUnchecked(ITEM_ORDER, checklist.checked, lastJump);
		if (id) jumpTo(id);
	}

	const visible = (id: string) => !(checklist.hideChecked && checklist.has(id));
</script>

<svelte:head>
	<title>{pageTitle('Midterm review')}</title>
	<meta name="description" content={description} />
</svelte:head>

{#snippet meter(done: number, total: number, label: string)}
	<span
		class="meter"
		role="progressbar"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={total}
		aria-valuenow={done}
		aria-valuetext="{done} of {total} checked"
	>
		<span class="fill" style:width="{percent({ done, total })}%"></span>
	</span>
{/snippet}

{#snippet toc()}
	<ol class="toc-list">
		{#each SHEET as section (section.id)}
			{@const p = progressOf(
				section.items.map((i) => i.id),
				checklist.checked
			)}
			<li>
				<a class="toc-section" href="#{section.id}">
					<span class="toc-num">{section.number}</span>
					<span class="toc-text">{section.title}</span>
					<span class="toc-count">{p.done}/{p.total}</span>
				</a>
				<ol class="toc-items">
					{#each section.items as item (item.id)}
						<li>
							<a href="#{item.id}" class={{ done: checklist.has(item.id) }}>
								<span class="toc-dot" aria-hidden="true">
									{#if checklist.has(item.id)}<Icon name="check" size={11} />{/if}
								</span>
								<span class="toc-text">{item.letter}. {item.short ?? item.title}</span>
								{#if checklist.has(item.id)}<span class="visually-hidden">(checked)</span>{/if}
							</a>
						</li>
					{/each}
				</ol>
			</li>
		{/each}
	</ol>
{/snippet}

<div class="midterm">
	<header class="page-head">
		<h1>Midterm review</h1>
		<p class="lede">
			The review sheet’s topics in order. Each topic lists the facts from the lecture slides, links
			that open the tools on the slide examples, and practice problems graded by the same engines
			the tools use. Check off a topic when you are done with it; the check marks are saved in this
			browser.
		</p>
	</header>

	<section class="overview" aria-labelledby="progress-title">
		<div class="overall">
			<h2 id="progress-title" class="visually-hidden">Progress</h2>
			<p class="count">
				<strong>{overall.done}</strong> of {overall.total} topics checked off
			</p>
			{@render meter(overall.done, overall.total, 'All topics')}
		</div>
		<ul class="groups" aria-label="Points on the exam">
			{#each groups as g (g.label)}
				<li>
					<span class="group-label">{g.label}</span>
					<span class="group-points">{g.points} points</span>
					{@render meter(g.progress.done, g.progress.total, g.label)}
					<span class="group-count">{g.progress.done}/{g.progress.total}</span>
				</li>
			{/each}
		</ul>
		<div class="actions">
			<Button
				variant="primary"
				size="sm"
				onclick={jumpNext}
				disabled={overall.done === overall.total}
			>
				Next unchecked topic
				{#snippet icon()}<Icon name="arrow-right" size={15} />{/snippet}
			</Button>
			<Toggle
				label="Hide checked topics"
				checked={checklist.hideChecked}
				onchange={(v) => checklist.setHideChecked(v)}
			/>
			{#if confirmClear}
				<span class="confirm" role="group" aria-label="Clear every check mark?">
					<span>Clear all {overall.done} check marks?</span>
					<Button
						size="sm"
						onclick={() => {
							checklist.clear();
							confirmClear = false;
							lastJump = null;
						}}>Clear</Button
					>
					<Button size="sm" variant="ghost" onclick={() => (confirmClear = false)}>Keep</Button>
				</span>
			{:else}
				<Button
					size="sm"
					variant="ghost"
					disabled={overall.done === 0}
					onclick={() => (confirmClear = true)}
				>
					{#snippet icon()}<Icon name="reset" size={15} />{/snippet}
					Clear check marks
				</Button>
			{/if}
		</div>
		{#if checklist.loaded && !checklist.saved}
			<Callout tone="warn">
				This browser does not allow the page to save data, so check marks last until the page is
				closed.
			</Callout>
		{/if}
	</section>

	<details class="toc-mobile">
		<summary>Topics</summary>
		<nav aria-label="Topics (compact)">{@render toc()}</nav>
	</details>

	<div class="layout">
		<aside class="toc-side">
			<nav aria-label="Topics">
				<p class="toc-title">Topics</p>
				{@render toc()}
			</nav>
		</aside>

		<div class="content">
			{#each SHEET as section (section.id)}
				{@const ids = section.items.map((i) => i.id)}
				{@const p = progressOf(ids, checklist.checked)}
				{@const shown = section.items.filter((i) => visible(i.id))}
				<section class="section" aria-labelledby="{section.id}-heading">
					<header class="section-head" id={section.id}>
						<span class="num" aria-hidden="true">{section.number}</span>
						<h2 id="{section.id}-heading">{section.title}</h2>
						<span class="section-count">{p.done} of {p.total} checked</span>
					</header>
					{#each shown as item (item.id)}
						<TopicCard
							{item}
							section={section.number}
							checked={checklist.has(item.id)}
							onchange={(v) => checklist.set(item.id, v)}
						/>
					{/each}
					{#if !shown.length}
						<p class="all-done">
							<Icon name="check" size={16} />
							All {p.total}
							{p.total === 1 ? 'topic' : 'topics'} in this section are checked off.
						</p>
					{/if}
				</section>
			{/each}
		</div>
	</div>
</div>

<style>
	.midterm {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}
	.page-head {
		max-width: var(--content-width);
		padding-top: var(--space-4);
	}
	.page-head h1 {
		margin-bottom: var(--space-3);
	}
	.lede {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-lg);
		line-height: 1.55;
	}

	/* ---------- progress ---------- */
	.overview {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
		gap: var(--space-4) var(--space-6);
		padding: var(--space-4) var(--space-5);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}
	.overall {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-2);
	}
	.count {
		margin: 0;
		color: var(--text-2);
	}
	.count strong {
		color: var(--text);
		font-family: var(--font-serif);
		font-size: var(--text-3xl);
		line-height: 1;
	}
	.meter {
		position: relative;
		display: block;
		height: 8px;
		overflow: hidden;
		border-radius: 999px;
		background: var(--surface-3);
	}
	.fill {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: inherit;
		background: var(--accept);
		transition: width var(--duration) var(--ease);
	}
	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.groups li {
		display: grid;
		grid-template-columns: minmax(0, 9rem) 6.5rem minmax(4rem, 1fr) 2.5rem;
		align-items: center;
		gap: var(--space-3);
		font-size: var(--text-sm);
	}
	.group-label {
		font-weight: 500;
	}
	.group-points,
	.group-count {
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}
	.group-count {
		text-align: right;
	}
	.actions {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3) var(--space-4);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
	}
	.confirm {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}
	.overview :global(.callout) {
		grid-column: 1 / -1;
	}

	/* ---------- layout and topic list ---------- */
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-6);
	}
	.toc-side {
		display: none;
	}
	.toc-mobile {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.toc-mobile summary {
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
	}
	.toc-mobile nav {
		padding: 0 var(--space-3) var(--space-3);
	}
	.toc-title {
		margin: 0 0 var(--space-2);
		padding-left: 8px;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.toc-list,
	.toc-items {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.toc-list > li + li {
		margin-top: var(--space-2);
	}
	.toc-list a {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.35;
		text-decoration: none;
	}
	.toc-list a:hover {
		background: var(--surface-2);
		color: var(--text);
	}
	.toc-section {
		font-weight: 600;
	}
	.toc-num {
		min-width: 1.2em;
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}
	.toc-text {
		flex: 1;
		min-width: 0;
	}
	.toc-count {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.toc-items a {
		align-items: center;
		padding-left: 10px;
	}
	.toc-dot {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		border: 1.5px solid var(--border-strong);
		border-radius: 4px;
	}
	.toc-items a.done {
		color: var(--text-3);
	}
	.toc-items a.done .toc-dot {
		border-color: var(--accept);
		background: var(--accept);
		color: var(--surface);
	}
	.content {
		display: flex;
		flex-direction: column;
		gap: var(--space-7);
		max-width: 56rem;
		min-width: 0;
	}
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.section-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border);
		scroll-margin-top: calc(56px + var(--space-4));
	}
	.section-head h2 {
		margin: 0;
	}
	.num {
		color: var(--text-3);
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		font-weight: 600;
	}
	.section-count {
		margin-left: auto;
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	.content :global(.topic) {
		scroll-margin-top: calc(56px + var(--space-4));
	}
	.all-done {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		color: var(--accept);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	@media (min-width: 1024px) {
		.layout {
			grid-template-columns: 250px minmax(0, 1fr);
		}
		.toc-side {
			display: block;
		}
		.toc-side nav {
			position: sticky;
			top: calc(56px + var(--space-5));
			max-height: calc(100vh - 56px - var(--space-6));
			overflow-y: auto;
		}
		.toc-mobile {
			display: none;
		}
	}
	@media (max-width: 760px) {
		.overview {
			grid-template-columns: minmax(0, 1fr);
			padding: var(--space-4);
		}
		.groups li {
			grid-template-columns: minmax(0, 1fr) auto 2.5rem;
		}
		.groups .meter {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
</style>
