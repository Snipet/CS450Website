<script lang="ts">
	import { tick } from 'svelte';
	import {
		Button,
		Callout,
		CitationTag,
		Disclosure,
		Icon,
		Kbd,
		Panel,
		PresetMenu,
		SegmentedControl,
		Select,
		StepControls,
		Stepper,
		ToolPage,
		stepperKeys,
		type Preset
	} from '$lib/components/ui';
	import {
		FrontierView,
		SearchTree,
		StateGraph,
		defaultAnnotation,
		describeStep,
		graphHighlightAt,
		iterationAt,
		strategyName
	} from '$lib/components/search';
	import { hasErrors } from '$lib/theory/diagnostics';
	import { parseGraphText, type SuccessorOrder } from '$lib/theory/graphs';
	import { usesHeuristic } from '$lib/theory/search';
	import { tool } from '$lib/tools/catalog/search';
	import { toolLink } from '$lib/tools/links';
	import ExpansionOrder from '$lib/tools/search/ExpansionOrder.svelte';
	import GraphEditor from '$lib/tools/search/GraphEditor.svelte';
	import ResultSummary from '$lib/tools/search/ResultSummary.svelte';
	import StepDock from '$lib/tools/search/StepDock.svelte';
	import StrategyControls from '$lib/tools/search/StrategyControls.svelte';
	import { SEARCH_PRESETS, matchPreset } from '$lib/tools/search/presets';
	import {
		ANNOTATIONS,
		completeSearchState,
		defaultSearchState,
		isSavedSearchState,
		settingsOf,
		type SearchScenario,
		type SearchSettings
	} from '$lib/tools/search/state';
	import {
		ANNOTATION_NAMES,
		missingHeuristic,
		popCounts,
		problemFacts,
		resolveAnnotation,
		runSearch
	} from '$lib/tools/search/view';
	import { syncToHash } from '$lib/url-state';

	const initial = defaultSearchState();

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	/** The graph text as typed. */
	let text = $state(initial.graph);
	/** The last graph text without errors: what the views show. */
	let validText = $state(initial.graph);
	let settings = $state<SearchSettings>(settingsOf(initial));

	const parsed = $derived(parseGraphText(text));
	const textHasErrors = $derived(hasErrors(parsed.diagnostics));
	// Depends on the valid text only, so typing errors does not rerun the search.
	const spec = $derived(parseGraphText(validText).spec!);
	const facts = $derived(problemFacts(spec));

	// ------------------------------------------------------------------
	// The run (recomputed when the problem or a search setting changes, not per step)
	// ------------------------------------------------------------------

	const result = $derived(runSearch(spec, settings));
	const pops = $derived(popCounts(result));

	const stepper = new Stepper(() => result.steps.length, { speed: 1.5 });
	const step = $derived(stepper.index);

	syncToHash(() => ({ graph: validText, ...settings, step }), {
		validate: isSavedSearchState,
		onLoad(saved) {
			const s = completeSearchState(saved);
			load(s, s.step);
		}
	});

	const scenario = $derived<SearchScenario>({ graph: validText, ...settings });
	const presetId = $derived(matchPreset(scenario)?.id ?? null);
	const preset = $derived(SEARCH_PRESETS.find((p) => p.id === presetId) ?? null);

	function load(s: SearchScenario, at = 0) {
		stepper.pause();
		text = s.graph;
		validText = s.graph;
		settings = settingsOf(s);
		stepper.set(at);
	}

	function loadPreset(p: Preset<SearchScenario>) {
		load(p.value, 0);
	}

	/** Loads a preset from further down the page and scrolls back to the step controls. */
	async function openPreset(id: string) {
		const p = SEARCH_PRESETS.find((x) => x.id === id);
		if (!p) return;
		loadPreset(p);
		await tick();
		revealSteps();
	}

	/** Applies a settings change; a run shown at its last step stays at its last step. */
	function change(patch: Partial<SearchSettings>) {
		const atEnd = stepper.total > 1 && stepper.atEnd;
		Object.assign(settings, patch);
		if (atEnd) stepper.last();
	}

	function editText(value: string) {
		text = value;
		if (textHasErrors || value === validText) return;
		const atEnd = stepper.total > 1 && stepper.atEnd;
		validText = value;
		if (atEnd) stepper.last();
	}

	// ------------------------------------------------------------------
	// Views at the current step
	// ------------------------------------------------------------------

	const informed = $derived(usesHeuristic(settings.strategy));
	const annotation = $derived(resolveAnnotation(settings.annotation, settings.strategy));
	const highlight = $derived(graphHighlightAt(result, step));
	const iteration = $derived(iterationAt(result, step));
	const limited = $derived(result.strategy === 'ids' || result.strategy === 'dls');

	const annotationOptions = $derived(
		ANNOTATIONS.map((a) => ({
			value: a,
			label:
				a === 'auto'
					? `Auto: ${ANNOTATION_NAMES[defaultAnnotation(settings.strategy)]}`
					: ANNOTATION_NAMES[a]
		}))
	);

	const orderOptions: { value: SuccessorOrder; label: string; title: string }[] = [
		{ value: 'alphabetical', label: 'Alphabetical', title: 'Successors in name order' },
		{ value: 'listed', label: 'As listed', title: 'Successors in the order the edges are written' }
	];

	const heuristicLink = $derived(spec.h ? toolLink('heuristics', { graph: validText }) : null);
	const strategiesLink = $derived(toolLink('strategies', { graph: validText }));

	// ------------------------------------------------------------------
	// Compact step bar on narrow screens while the step controls are out of view
	// ------------------------------------------------------------------

	let stepBar = $state<HTMLElement>();
	let runArea = $state<HTMLElement>();
	let barInView = $state(true);
	let runInView = $state(false);

	$effect(() => {
		const bar = stepBar;
		const run = runArea;
		if (!bar || !run || typeof IntersectionObserver === 'undefined') return;
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.target === bar) barInView = e.isIntersecting;
					else if (e.target === run) runInView = e.isIntersecting;
				}
			},
			{ rootMargin: '-56px 0px 0px 0px' }
		);
		io.observe(bar);
		io.observe(run);
		return () => io.disconnect();
	});

	function revealSteps() {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		// The run area starts with the step bar (which may be stuck further down while sticky).
		runArea?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
	}

	const graphLabel = $derived(
		`${facts.directed ? 'Directed' : 'Undirected'} state-space graph with ${facts.states} states, start ${facts.start}, ${
			facts.goals.length === 1 ? 'goal' : 'goals'
		} ${facts.goals.join(', ')}.${highlight.current ? ` Being expanded: ${highlight.current}.` : ''}${
			highlight.frontier.length ? ` On the frontier: ${highlight.frontier.join(', ')}.` : ''
		}${highlight.path.length ? ` Solution path: ${highlight.path.join(' → ')}.` : ''}`
	);
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu presets={SEARCH_PRESETS} selected={presetId} onselect={loadPreset} align="end" />
	{/snippet}

	<div class="tool" tabindex="-1" {@attach stepperKeys(stepper)}>
		<div class="setup">
			<Panel title="Problem" subtitle="{facts.states} states · {facts.edges} edges">
				<dl class="facts">
					<div class="fact">
						<dt>Start</dt>
						<dd>{facts.start}</dd>
					</div>
					<div class="fact">
						<dt>{facts.goals.length === 1 ? 'Goal' : 'Goals'}</dt>
						<dd>{facts.goals.join(', ')}</dd>
					</div>
					<div class="fact">
						<dt>h(n)</dt>
						<dd class:muted={facts.hCount === 0}>{facts.hText}</dd>
					</div>
				</dl>

				<div class="order">
					<SegmentedControl
						label="Successor order"
						showLabel
						size="sm"
						options={orderOptions}
						value={settings.order}
						onchange={(v) => change({ order: v })}
					/>
				</div>

				{#if preset}
					<div class="preset-note">
						<p>
							<strong>{preset.label}.</strong>
							{preset.description}
						</p>
						{#if preset.cite}<CitationTag cite={preset.cite} />{/if}
					</div>
				{/if}

				<div class="editor">
					<Disclosure summary="Edit graph" openSummary="Hide graph text" variant="boxed">
						<GraphEditor
							{text}
							diagnostics={parsed.diagnostics}
							shape={settings.shape}
							oninput={editText}
							onshape={(v) => change({ shape: v })}
						/>
					</Disclosure>
				</div>

				{#if heuristicLink || strategiesLink}
					<p class="links">
						{#if heuristicLink}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
							<a href={heuristicLink}><Icon name="arrow-right" size={14} /> Check this heuristic</a>
						{/if}
						{#if strategiesLink}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
							<a href={strategiesLink}><Icon name="arrow-right" size={14} /> Compare strategies</a>
						{/if}
					</p>
				{/if}
			</Panel>

			<Panel title="Strategy" subtitle={strategyName(settings.strategy)}>
				<StrategyControls
					{settings}
					missingHeuristic={missingHeuristic(settings.strategy, spec)}
					onchange={(patch) => change(patch)}
				/>
			</Panel>
		</div>

		<section class="run" aria-label="Search run" bind:this={runArea}>
			<div class="step-bar" bind:this={stepBar}>
				<StepControls {stepper} ariaLabel="Search steps" speeds={[0.5, 1, 2, 4, 8]}>
					{#snippet label(i)}{describeStep(result, i)}{/snippet}
				</StepControls>
			</div>

			{#if textHasErrors}
				<Callout tone="warn">
					The graph text has errors (listed under the editor). The views show the last graph without
					errors.
				</Callout>
			{/if}

			<div class="views">
				<Panel
					title="State space"
					subtitle={informed && facts.hCount > 0 ? 'with h(n)' : undefined}
					padding="none"
				>
					<div class="figure">
						<StateGraph
							graph={spec.graph}
							start={spec.start}
							goals={spec.goals}
							heuristic={informed ? (spec.h ?? {}) : undefined}
							{highlight}
							nodeShape={settings.shape}
							height={460}
							legend
							ariaLabel={graphLabel}
						/>
					</div>
				</Panel>
				<Panel
					title="Search tree"
					subtitle={limited ? `depth limit ${iteration}` : undefined}
					padding="none"
				>
					{#snippet actions()}
						<Select
							label="Labels"
							inline
							size="sm"
							options={annotationOptions}
							value={settings.annotation}
							onchange={(v) => change({ annotation: v })}
						/>
					{/snippet}
					<div class="figure">
						<SearchTree {result} {step} {annotation} goals={spec.goals} maxHeight={520} legend />
					</div>
				</Panel>
			</div>

			<div class="lists">
				<Panel>
					<FrontierView {result} {step} level={2} />
				</Panel>
				<Panel title="Expansion order">
					<ExpansionOrder {result} {pops} {step} />
				</Panel>
			</div>

			<p class="keys">
				With focus in the tool: <Kbd>←</Kbd>
				<Kbd>→</Kbd> previous and next step, <Kbd>Home</Kbd>
				<Kbd>End</Kbd> first and last step, <Kbd>Space</Kbd> play or pause.
			</p>
		</section>

		<Panel title="Result">
			<ResultSummary {result} {spec} />
		</Panel>

		<Panel title="Questions from the slides">
			<div class="questions">
				<div class="question">
					<p class="q">Properties of depth-first search: complete?</p>
					<CitationTag cite={{ deck: 'uninformed', slide: 32 }} />
					<Disclosure>
						<p>
							No: it fails in infinite-depth spaces and in spaces with loops. Depth-first tree
							search from Arad goes Arad, Sibiu, Arad, Sibiu, … until the expansion limit stops it.
							Avoiding repeated states along the path (Path check) makes it complete in finite
							spaces.
						</p>
						<Button size="sm" onclick={() => openPreset('dfs-path-check')}>
							{#snippet icon()}<Icon name="play" />{/snippet}
							Load “DFS with a path check”
						</Button>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">How can we fix the greedy problem?</p>
					<CitationTag cite={{ deck: 'informed', slide: 15 }} />
					<Disclosure>
						<p>
							Keep track of the distance already traveled, g(n), in addition to the estimated
							distance remaining, h(n): A* orders the frontier by f(n) = g(n) + h(n)
							<CitationTag cite={{ deck: 'informed', slide: 16 }} />. On the slide 15 graph, greedy
							best-first search returns a path of cost 6 and A* one of cost 3.
						</p>
						<Button size="sm" onclick={() => openPreset('greedy-vs-astar')}>
							{#snippet icon()}<Icon name="play" />{/snippet}
							Load “Greedy vs. A*”
						</Button>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">A* gone wrong?</p>
					<CitationTag cite={{ deck: 'informed', slide: 27 }} />
					<Disclosure>
						<p>
							Graph search never adds an explored state again, so the first path to a state that is
							expanded must be the cheapest one. An admissible heuristic that is not consistent can
							break that: on the slide 27 graph, C is expanded through B (g = 3) before A, and the
							path through A (g = 2) is dropped. A* tree search is optimal when h is admissible; A*
							graph search needs a consistent h
							<CitationTag cite={{ deck: 'informed', slide: 29 }} />.
						</p>
						<Button size="sm" onclick={() => openPreset('astar-wrong')}>
							{#snippet icon()}<Icon name="play" />{/snippet}
							Load “A* gone wrong”
						</Button>
					</Disclosure>
				</div>
			</div>
		</Panel>
	</div>
</ToolPage>

<StepDock {stepper} visible={!barInView && runInView} onreveal={revealSteps} />

<style>
	.tool {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}
	.tool:focus {
		outline: none;
	}
	.setup {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	@media (min-width: 1040px) {
		.setup {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		}
	}
	.facts {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		margin: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-size: var(--text-sm);
	}
	.fact {
		display: contents;
	}
	dt,
	dd {
		padding: 6px var(--space-3);
	}
	.fact + .fact dt,
	.fact + .fact dd {
		border-top: 1px solid var(--border);
	}
	dt {
		padding-right: 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		line-height: 1.9;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	dd.muted {
		color: var(--text-3);
	}
	.order {
		margin-top: var(--space-3);
	}
	.preset-note {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		margin-top: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--accent);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--accent-soft);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.preset-note p {
		margin: 0;
	}
	.editor {
		margin-top: var(--space-3);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin: var(--space-3) 0 0;
		font-size: var(--text-sm);
	}
	.links a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.run {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.step-bar {
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}
	@media (min-width: 720px) {
		.step-bar {
			position: sticky;
			top: calc(56px + var(--space-2));
			z-index: 20;
			box-shadow: var(--shadow);
		}
	}
	.views {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
		align-items: start;
	}
	@media (min-width: 1100px) {
		.views {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.figure {
		padding: 0 var(--space-3) var(--space-3);
	}
	.lists {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
		align-items: start;
	}
	@media (min-width: 900px) {
		.lists {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.keys {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
		line-height: 1.8;
	}
	@media (hover: none) {
		.keys {
			display: none;
		}
	}
	.questions {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4) var(--space-5);
	}
	@media (min-width: 1000px) {
		.questions {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	.question {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		min-width: 0;
	}
	.q {
		margin: 0;
		font-weight: 500;
	}
	.question :global(.disclosure) {
		align-self: stretch;
	}
	.question p:not(.q) {
		font-size: var(--text-sm);
	}
	.question :global(.content) {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}
	.question :global(.content p) {
		margin: 0;
	}
</style>
