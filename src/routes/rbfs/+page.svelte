<script lang="ts">
	import {
		Badge,
		Callout,
		CitationTag,
		Disclosure,
		Icon,
		Kbd,
		NumberField,
		Panel,
		PresetMenu,
		StepControls,
		Stepper,
		ToolPage,
		stepperKeys,
		type Preset
	} from '$lib/components/ui';
	import { StateGraph, formatCount, formatNumber } from '$lib/components/search';
	import type { NodeShape } from '$lib/components/search';
	import { hasErrors } from '$lib/theory/diagnostics';
	import { parseGraphText } from '$lib/theory/graphs';
	import { tool } from '$lib/tools/catalog/rbfs';
	import { toolLink } from '$lib/tools/links';
	import CodePanel from '$lib/tools/rbfs/CodePanel.svelte';
	import GraphEditor from '$lib/tools/rbfs/GraphEditor.svelte';
	import RecursionTree from '$lib/tools/rbfs/RecursionTree.svelte';
	import StepDock from '$lib/tools/rbfs/StepDock.svelte';
	import { NOTES, SLIDE_CITE, SOURCE } from '$lib/tools/rbfs/content';
	import { describeResult, describeStep } from '$lib/tools/rbfs/describe';
	import { RBFS_PRESETS, matchPreset } from '$lib/tools/rbfs/presets';
	import { linesOf } from '$lib/tools/rbfs/pseudocode';
	import {
		MAX_MAX_EXPANSIONS,
		MIN_MAX_EXPANSIONS,
		cleanMaxExpansions,
		completeRbfsState,
		defaultRbfsState,
		isSavedRbfsState,
		type RbfsScenario
	} from '$lib/tools/rbfs/state';
	import {
		graphHighlightAt,
		problemFacts,
		progressAt,
		runRbfs,
		treeAt
	} from '$lib/tools/rbfs/view';
	import { syncToHash } from '$lib/url-state';

	const initial = defaultRbfsState();

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	/** The graph text as typed. */
	let text = $state(initial.graph);
	/** The last graph text without errors: what the views show. */
	let validText = $state(initial.graph);
	let shape = $state<NodeShape>(initial.shape);
	let maxExpansions = $state(initial.maxExpansions);

	const parsed = $derived(parseGraphText(text));
	const textHasErrors = $derived(hasErrors(parsed.diagnostics));
	// Depends on the valid text only, so typing errors does not rerun the search.
	const spec = $derived(parseGraphText(validText).spec!);
	const facts = $derived(problemFacts(spec));

	// ------------------------------------------------------------------
	// The run (recomputed when the problem or the limit changes, not per step)
	// ------------------------------------------------------------------

	const run = $derived(runRbfs(spec, maxExpansions));
	const result = $derived(run.result);

	const stepper = new Stepper(() => result.steps.length, { speed: 1.5 });
	const step = $derived(stepper.index);

	syncToHash(() => ({ graph: validText, shape, maxExpansions, step }), {
		validate: isSavedRbfsState,
		onLoad(saved) {
			const s = completeRbfsState(saved);
			load(s, s.step);
		}
	});

	const scenario = $derived<RbfsScenario>({ graph: validText, shape, maxExpansions });
	const presetId = $derived(matchPreset(scenario)?.id ?? null);
	const preset = $derived(RBFS_PRESETS.find((p) => p.id === presetId) ?? null);

	function load(s: RbfsScenario, at = 0) {
		stepper.pause();
		text = s.graph;
		validText = s.graph;
		shape = s.shape;
		maxExpansions = s.maxExpansions;
		stepper.set(at);
	}

	function loadPreset(p: Preset<RbfsScenario>) {
		load(p.value, 0);
	}

	/** Applies a change; a run shown at its last step stays at its last step. */
	function change(apply: () => void) {
		const atEnd = stepper.total > 1 && stepper.atEnd;
		apply();
		if (atEnd) stepper.last();
	}

	function editText(value: string) {
		text = value;
		if (textHasErrors || value === validText) return;
		change(() => (validText = value));
	}

	function setLimit(v: number) {
		const next = cleanMaxExpansions(v);
		if (next !== maxExpansions) change(() => (maxExpansions = next));
	}

	// ------------------------------------------------------------------
	// Views at the current step
	// ------------------------------------------------------------------

	const view = $derived(treeAt(result, step));
	const highlight = $derived(graphHighlightAt(view));
	const lines = $derived(linesOf(result.steps[step]));
	const progress = $derived(progressAt(result, step));
	const atEnd = $derived(stepper.total > 0 && stepper.atEnd);
	const solvedNow = $derived(result.steps[step]?.kind === 'goal');

	const admissible = $derived(run.heuristic.admissible);
	const over = $derived(run.heuristic.nodes.filter((n) => !n.admissible).map((n) => n.id));
	const cheapest = $derived(
		result.solution && run.best ? Math.abs(result.solution.cost - run.best.cost) < 1e-9 : null
	);

	const searchLink = $derived(toolLink('search', { graph: validText, strategy: 'astar' }));
	const heuristicLink = $derived(spec.h ? toolLink('heuristics', { graph: validText }) : null);

	const graphLabel = $derived.by(() => {
		const parts = [
			`${facts.directed ? 'Directed' : 'Undirected'} state-space graph with ${facts.states} states, start ${facts.start}, ${
				facts.goals.length === 1 ? 'goal' : 'goals'
			} ${facts.goals.join(', ')}.`
		];
		if (highlight.current) parts.push(`Current call: ${highlight.current}.`);
		if (highlight.path?.length)
			parts.push(`${solvedNow ? 'Solution path' : 'Current path'}: ${highlight.path.join(' → ')}.`);
		if (highlight.frontier?.length)
			parts.push(`Stored successors: ${highlight.frontier.join(', ')}.`);
		return parts.join(' ');
	});

	const comparison = $derived([
		{
			label: 'Expansions',
			rbfs: formatCount(result.stats.expanded),
			astar: formatCount(run.astar.stats.expanded),
			note: result.stats.reexpanded ? `${formatCount(result.stats.reexpanded)} repeated` : ''
		},
		{
			label: 'Nodes generated',
			rbfs: formatCount(result.stats.generated),
			astar: formatCount(run.astar.stats.generated),
			note: result.stats.regenerated ? `${formatCount(result.stats.regenerated)} regenerated` : ''
		},
		{
			label: 'Memory',
			rbfs: formatCount(result.stats.maxStored),
			astar: formatCount(run.astar.stats.maxFrontier),
			note: 'RBFS: most nodes stored · A*: largest frontier'
		},
		{
			label: 'Solution cost',
			rbfs: result.solution ? formatNumber(result.solution.cost) : '–',
			astar: run.astar.solution ? formatNumber(run.astar.solution.cost) : '–',
			note: ''
		}
	]);

	// ------------------------------------------------------------------
	// Compact step bar on narrow screens while the step controls are out of view
	// ------------------------------------------------------------------

	let stepBar = $state<HTMLElement>();
	let runArea = $state<HTMLElement>();
	let barInView = $state(true);
	let runInView = $state(false);

	$effect(() => {
		const bar = stepBar;
		const area = runArea;
		if (!bar || !area || typeof IntersectionObserver === 'undefined') return;
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.target === bar) barInView = e.isIntersecting;
					else if (e.target === area) runInView = e.isIntersecting;
				}
			},
			{ rootMargin: '-56px 0px 0px 0px' }
		);
		io.observe(bar);
		io.observe(area);
		return () => io.disconnect();
	});

	function revealSteps() {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		runArea?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
	}
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu presets={RBFS_PRESETS} selected={presetId} onselect={loadPreset} align="end" />
	{/snippet}

	<div class="tool" tabindex="-1" {@attach stepperKeys(stepper)}>
		<p class="source">
			The Informed Search slides only name RBFS <CitationTag cite={SLIDE_CITE} />. The algorithm,
			the pseudocode, and the Romania example follow {SOURCE}.
		</p>

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

				<p class="admissible">
					{#if admissible}
						<Badge tone="accept">Admissible</Badge>
						<span>h(n) ≤ h*(n) for every state, so RBFS returns a cheapest path.</span>
					{:else}
						<Badge tone="reject">Not admissible</Badge>
						<span>
							h(n) &gt; h*(n) for {over.join(', ')}; RBFS may return a path that is not the
							cheapest.
						</span>
					{/if}
				</p>

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
							{shape}
							oninput={editText}
							onshape={(v) => change(() => (shape = v))}
						/>
					</Disclosure>
				</div>

				<div class="limit">
					<NumberField
						label="Expansion limit"
						value={maxExpansions}
						min={MIN_MAX_EXPANSIONS}
						max={MAX_MAX_EXPANSIONS}
						size="sm"
						onchange={setLimit}
					/>
					<p class="hint">
						Tree search can go around a cycle forever when no goal is reachable; the run stops after
						this many expansions.
					</p>
				</div>

				{#if searchLink || heuristicLink}
					<p class="links">
						{#if searchLink}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
							<a href={searchLink}
								><Icon name="arrow-right" size={14} /> Run A* in the search tool</a
							>
						{/if}
						{#if heuristicLink}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
							<a href={heuristicLink}><Icon name="arrow-right" size={14} /> Check this heuristic</a>
						{/if}
					</p>
				{/if}
			</Panel>

			<Panel title={NOTES[0].title}>
				<ul class="idea">
					{#each NOTES[0].points as point, i (i)}
						<li>{point}</li>
					{/each}
				</ul>
			</Panel>
		</div>

		<section class="run" aria-label="RBFS run" bind:this={runArea}>
			<div class="step-bar" bind:this={stepBar}>
				<StepControls {stepper} ariaLabel="RBFS steps" speeds={[0.5, 1, 2, 4, 8]}>
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
				<Panel title="Recursion tree" subtitle="open calls and their successors" padding="none">
					<div class="figure">
						<RecursionTree {view} goals={spec.goals} maxHeight={540} />
					</div>
				</Panel>
				<Panel title="Pseudocode" subtitle="RBFS">
					<CodePanel {lines} {view} />
					<p class="code-note">
						Russell & Norvig, Figure 3.26. A call whose best successor has f = ∞ returns failure, ∞
						even when f_limit = ∞; as printed, the loop would call that successor again forever.
						Ties go to the first successor in alphabetical order.
					</p>
				</Panel>
			</div>

			<div class="views">
				<Panel
					title="State space"
					subtitle={facts.hCount > 0 ? 'with h(n)' : undefined}
					padding="none"
				>
					<div class="figure">
						<StateGraph
							graph={spec.graph}
							start={spec.start}
							goals={spec.goals}
							heuristic={spec.h ?? {}}
							{highlight}
							nodeShape={shape}
							height={440}
							legend
							ariaLabel={graphLabel}
							statusText={{
								current: 'Current call',
								path: solvedNow ? 'Solution path' : 'Current path',
								frontier: 'Stored successor'
							}}
						/>
					</div>
				</Panel>
				<Panel title="Counts" subtitle="up to this step">
					<dl class="counts">
						<div class="count">
							<dt>Expansions</dt>
							<dd>
								{formatCount(progress.expanded)}
								{#if progress.reexpanded}<span class="of"
										>{formatCount(progress.reexpanded)} repeated</span
									>{/if}
							</dd>
						</div>
						<div class="count">
							<dt>Nodes generated</dt>
							<dd>
								{formatCount(progress.generated)}
								{#if progress.regenerated}<span class="of"
										>{formatCount(progress.regenerated)} regenerated</span
									>{/if}
							</dd>
						</div>
						<div class="count">
							<dt>Nodes stored</dt>
							<dd>
								{formatCount(progress.stored)}
								<span class="of">most {formatCount(progress.maxStored)}</span>
							</dd>
						</div>
						<div class="count">
							<dt>Call depth</dt>
							<dd>
								{formatCount(progress.depth)}
								<span class="of">deepest {formatCount(progress.maxDepth)}</span>
							</dd>
						</div>
					</dl>
					<p class="counts-note">
						Stored: the root plus the successors of every open call, O(bd). A node generated again
						after its subtree was forgotten counts as regenerated.
					</p>
					{#if atEnd}
						<p class="result" role="status">{describeResult(result)}</p>
					{/if}
				</Panel>
			</div>

			<p class="keys">
				With focus in the tool: <Kbd>←</Kbd>
				<Kbd>→</Kbd> previous and next step, <Kbd>Home</Kbd>
				<Kbd>End</Kbd> first and last step, <Kbd>Space</Kbd> play or pause.
			</p>
		</section>

		<Panel title="RBFS and A*" subtitle="whole run, same problem">
			<div class="compare">
				<p class="lead">
					{#if result.solution}
						<Badge tone="accept">Solution</Badge>
					{:else}
						<Badge tone="reject">No solution</Badge>
					{/if}
					<span>{describeResult(result)}</span>
				</p>
				{#if cheapest === true}
					<p class="optimal">
						<Badge tone="accept">Cheapest path</Badge>
						<span>No path from {facts.start} to a goal costs less.</span>
					</p>
				{:else if cheapest === false && run.best}
					<p class="optimal">
						<Badge tone="reject">Not the cheapest path</Badge>
						<span>
							The cheapest path is {run.best.states.join(' → ')} (cost {formatNumber(
								run.best.cost
							)}).
						</span>
					</p>
				{/if}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th scope="col"></th>
								<th scope="col">RBFS</th>
								<th scope="col">A* tree search</th>
							</tr>
						</thead>
						<tbody>
							{#each comparison as row (row.label)}
								<tr>
									<th scope="row">
										{row.label}
										{#if row.note}<span class="row-note">{row.note}</span>{/if}
									</th>
									<td>{row.rbfs}</td>
									<td>{row.astar}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="compare-note">
					A* (Informed Search, slides 16–22) keeps every node it generates and never generates one
					twice; RBFS keeps the current path and its siblings and regenerates forgotten subtrees.
					{#if run.astar.failure === 'limit'}The A* run stopped at its limit without a solution.{/if}
					<CitationTag cite={{ deck: 'informed', slide: 31 }} />
				</p>
				{#if result.failure === 'limit'}
					<Callout tone="warn">
						The expansion limit stopped this run after {formatCount(result.stats.expanded)}
						{result.stats.expanded === 1 ? 'expansion' : 'expansions'}. RBFS is a tree search: on a
						graph with cycles it can keep going around them when no goal is reachable.
					</Callout>
				{/if}
			</div>
		</Panel>

		<Panel title="Notes">
			<div class="notes">
				{#each NOTES.slice(1) as note (note.id)}
					<section class="note" aria-labelledby="note-{note.id}">
						<h3 id="note-{note.id}">{note.title}</h3>
						<ul>
							{#each note.points as point, i (i)}
								<li>{point}</li>
							{/each}
						</ul>
						{#if note.cite}<CitationTag cite={note.cite} />{/if}
					</section>
				{/each}
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
	.source {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.6;
	}
	.setup {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	@media (min-width: 1040px) {
		.setup {
			grid-template-columns: minmax(0, 6fr) minmax(0, 6fr);
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
	.facts dt,
	.facts dd {
		padding: 6px var(--space-3);
	}
	.fact + .fact dt,
	.fact + .fact dd {
		border-top: 1px solid var(--border);
	}
	.facts dt {
		padding-right: 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		line-height: 1.9;
	}
	.facts dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.facts dd.muted {
		color: var(--text-3);
	}
	.admissible,
	.optimal,
	.lead {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-2);
		margin: var(--space-3) 0 0;
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.admissible span,
	.optimal span,
	.lead span {
		flex: 1 1 14rem;
		min-width: 0;
	}
	.lead {
		margin: 0;
		font-size: var(--text-base);
	}
	.optimal {
		margin: 0;
		color: var(--text-2);
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
	.editor,
	.limit {
		margin-top: var(--space-3);
	}
	.limit {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-2) var(--space-4);
	}
	.hint {
		flex: 1 1 14rem;
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		line-height: 1.5;
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
	.idea {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding-left: 1.2rem;
		font-size: var(--text-sm);
		line-height: 1.55;
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
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
	}
	.figure {
		padding: 0 var(--space-3) var(--space-3);
	}
	.code-note,
	.counts-note,
	.compare-note {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		line-height: 1.5;
	}
	.counts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
		margin: 0;
	}
	.count {
		min-width: 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.count dt {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.count dd {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 var(--space-2);
		margin: 2px 0 0;
		font-size: var(--text-lg);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.of {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 500;
	}
	.result {
		margin: var(--space-3) 0 0;
		font-size: var(--text-sm);
		line-height: 1.55;
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
	.compare-note {
		margin: 0;
	}
	.compare {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		max-width: 40rem;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 6px var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: baseline;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	tbody th {
		font-weight: 500;
	}
	td {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.row-note {
		display: block;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 400;
	}
	.notes {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4) var(--space-5);
	}
	@media (min-width: 900px) {
		.notes {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.note {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		min-width: 0;
	}
	.note h3 {
		margin: 0;
		font-size: var(--text-base);
	}
	.note ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: 0;
		padding-left: 1.2rem;
		font-size: var(--text-sm);
		line-height: 1.55;
	}
</style>
