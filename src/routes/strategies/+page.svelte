<script lang="ts">
	import { tick } from 'svelte';
	import {
		Button,
		Callout,
		CitationTag,
		Disclosure,
		Icon,
		NumberField,
		Panel,
		PresetMenu,
		SegmentedControl,
		ToolPage,
		type Preset
	} from '$lib/components/ui';
	import { strategyShort } from '$lib/components/search/describe';
	import { hasErrors } from '$lib/theory/diagnostics';
	import { parseGraphText } from '$lib/theory/graphs';
	import type { Citation } from '$lib/lectures';
	import { COMPLEXITY_SYMBOLS, DEFAULT_IDS_MAX_LIMIT, type RepeatMode } from '$lib/theory/search';
	import { tool } from '$lib/tools/catalog/strategies';
	import { toolLink } from '$lib/tools/links';
	import ComparisonTable from '$lib/tools/strategies/ComparisonTable.svelte';
	import EightPuzzleCosts from '$lib/tools/strategies/EightPuzzleCosts.svelte';
	import HanoiNote from '$lib/tools/strategies/HanoiNote.svelte';
	import NodeChart from '$lib/tools/strategies/NodeChart.svelte';
	import NodeCounts from '$lib/tools/strategies/NodeCounts.svelte';
	import ProblemView from '$lib/tools/strategies/ProblemView.svelte';
	import PropertiesTable from '$lib/tools/strategies/PropertiesTable.svelte';
	import { CHART_METRICS, metricTitle, type ChartMetric } from '$lib/tools/strategies/chart';
	import {
		NODE_LIMIT,
		comparisonSummary,
		compareStrategies,
		type CompareSettings,
		type ComparedStrategy
	} from '$lib/tools/strategies/compare';
	import { pathOptions, type PathChoice } from '$lib/tools/strategies/problem-view';
	import {
		PRESETS,
		PROBLEMS,
		problemText,
		type ProblemPreset
	} from '$lib/tools/strategies/problems';
	import {
		MAX_ALPHA,
		MAX_LIMIT,
		MIN_ALPHA,
		MIN_LIMIT,
		completeStrategiesState,
		defaultStrategiesState,
		isSavedStrategiesState,
		savedStateOf,
		type StrategiesState
	} from '$lib/tools/strategies/state';
	import { syncToHash } from '$lib/url-state';

	// ------------------------------------------------------------------
	// State (mirrored in the URL hash)
	// ------------------------------------------------------------------

	const s = $state<StrategiesState>(defaultStrategiesState());

	syncToHash(() => savedStateOf(s), {
		validate: isSavedStrategiesState,
		onLoad(saved) {
			Object.assign(s, completeStrategiesState(saved));
			pathChoice = 'cheapest';
		}
	});

	/** Which path the drawing highlights (not saved). */
	let pathChoice = $state<PathChoice>('cheapest');
	let metric = $state<ChartMetric>('generated');

	// ------------------------------------------------------------------
	// The problem and the runs
	// ------------------------------------------------------------------

	const custom = $derived(s.graph !== null);
	const text = $derived(s.graph ?? problemText(s.preset));
	const parsed = $derived(parseGraphText(text));
	const textHasErrors = $derived(hasErrors(parsed.diagnostics));
	const spec = $derived(
		s.graph === null ? PROBLEMS[s.preset].spec : textHasErrors ? null : parsed.spec
	);
	const problem = $derived(s.graph === null ? PROBLEMS[s.preset] : null);

	const settings = $derived<CompareSettings>({ mode: s.mode, alpha: s.alpha, limit: s.limit });
	const comparison = $derived(spec ? compareStrategies(spec, settings) : null);
	const options = $derived(comparison ? pathOptions(comparison) : []);
	const summary = $derived(
		comparison
			? comparisonSummary(comparison, strategyShort)
			: 'The graph text has errors; no strategy was run.'
	);

	const editLink = $derived(spec ? toolLink('search', { graph: text }) : null);
	const linkFor = (strategy: ComparedStrategy) =>
		spec ? toolLink('search', { graph: text, strategy, mode: s.mode }) : null;

	const presetId = $derived(custom ? null : s.preset);
	/** The loaded preset while its mode is on (its description is about that mode). */
	const presetNote = $derived(
		PRESETS.find((p) => p.id === presetId && p.value.mode === s.mode) ?? null
	);

	function loadPreset(p: Preset<ProblemPreset>) {
		s.preset = p.value.problem;
		s.graph = null;
		s.mode = p.value.mode;
		pathChoice = 'cheapest';
	}

	// ------------------------------------------------------------------
	// Controls
	// ------------------------------------------------------------------

	const MODE_OPTIONS: { value: RepeatMode; label: string; title: string }[] = [
		{ value: 'tree', label: 'Tree search', title: 'No repeated-state check' },
		{
			value: 'path',
			label: 'Path check',
			title: 'Avoid repeated states along the path'
		},
		{ value: 'graph', label: 'Graph search', title: 'Explored set and frontier check' }
	];

	const MODE_NOTES: Record<RepeatMode, { text: string; cite: Citation }> = {
		tree: {
			text: 'Every child goes on the frontier; states can repeat.',
			cite: { deck: 'search', slide: 28 }
		},
		path: {
			text: 'A child whose state is already on the path from the root is not added.',
			cite: { deck: 'uninformed', slide: 32 }
		},
		graph: {
			text: 'Expanded states go into the explored set. A child whose state is explored or already on the frontier is not added; with a priority queue, a cheaper path to a frontier state replaces that node.',
			cite: { deck: 'search', slide: 36 }
		}
	};

	// ------------------------------------------------------------------
	// Question actions
	// ------------------------------------------------------------------

	let resultsPanel = $state<HTMLElement>();
	let countsPanel = $state<HTMLElement>();

	async function reveal(el: HTMLElement | undefined) {
		await tick();
		if (!el) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
	}

	function openPreset(id: string, mode?: RepeatMode) {
		const p = PRESETS.find((x) => x.id === id);
		if (!p) return;
		loadPreset(p);
		if (mode) s.mode = mode;
		reveal(resultsPanel);
	}

	function setCounts(values: Partial<Pick<StrategiesState, 'b' | 'd' | 'm' | 'cStar' | 'eps'>>) {
		Object.assign(s, values);
		reveal(countsPanel);
	}
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu presets={PRESETS} selected={presetId} onselect={loadPreset} align="end" />
	{/snippet}

	<div class="page">
		<Panel title="All search strategies">
			<div class="props">
				<PropertiesTable />
				<div class="symbols">
					<dl>
						{#each COMPLEXITY_SYMBOLS as sym (sym.symbol)}
							<div>
								<dt>{sym.symbol}</dt>
								<dd>{sym.meaning}</dd>
							</div>
						{/each}
					</dl>
					<p class="cites">
						<CitationTag cite={{ deck: 'uninformed', slide: 45 }} />
						<CitationTag cite={{ deck: 'informed', slide: 42 }} />
					</p>
				</div>
			</div>
		</Panel>

		<div class="run">
			<Panel title="Problem" subtitle={problem ? problem.label : 'Graph from a link'}>
				{#if presetNote}
					<div class="preset-note">
						<p>{presetNote.description}</p>
						{#if presetNote.cite}<CitationTag cite={presetNote.cite} />{/if}
					</div>
				{:else if problem}
					<p class="problem-cite"><CitationTag cite={problem.cite} /></p>
				{/if}
				{#if textHasErrors}
					<Callout tone="error" title="The graph text has errors" class="error">
						No strategy can run on it. Pick a problem from the menu, or fix the text in the search
						tool.
					</Callout>
				{/if}
				<ProblemView
					{spec}
					{text}
					diagnostics={parsed.diagnostics}
					showText={custom}
					{options}
					path={pathChoice}
					{editLink}
					onpath={(v) => (pathChoice = v)}
				/>
			</Panel>

			<div class="side">
				<Panel title="Settings">
					<div class="settings">
						<SegmentedControl
							label="Repeated states"
							showLabel
							size="sm"
							options={MODE_OPTIONS}
							value={s.mode}
							onchange={(v) => (s.mode = v)}
						/>
						<p class="mode-note">
							{MODE_NOTES[s.mode].text}
							<CitationTag cite={MODE_NOTES[s.mode].cite} />
						</p>
						<div class="numbers">
							<NumberField
								label="Weighted A* α"
								bind:value={s.alpha}
								min={MIN_ALPHA}
								max={MAX_ALPHA}
								step={0.1}
								size="sm"
							/>
							<NumberField
								label="Expansion limit"
								bind:value={s.limit}
								min={MIN_LIMIT}
								max={MAX_LIMIT}
								size="sm"
							/>
						</div>
						<p class="fine">
							A run stops after taking {s.limit.toLocaleString('en-US')} nodes off the frontier or generating
							{NODE_LIMIT.toLocaleString('en-US')} nodes. IDS tries depth limits 0 to {DEFAULT_IDS_MAX_LIMIT}.
							Successors in name order; the goal test runs when a node is taken off the frontier.
						</p>
					</div>
				</Panel>

				<Panel title={metricTitle(metric)}>
					{#snippet actions()}
						<SegmentedControl
							label="Count"
							size="sm"
							options={CHART_METRICS}
							value={metric}
							onchange={(v) => (metric = v)}
						/>
					{/snippet}
					{#if comparison}
						<NodeChart rows={comparison.rows} {metric} label="{metricTitle(metric)} per strategy" />
					{:else}
						<p class="fine">No runs.</p>
					{/if}
				</Panel>
			</div>
		</div>

		<div bind:this={resultsPanel} class="anchor">
			<Panel
				title="Results"
				subtitle="{MODE_OPTIONS.find((o) => o.value === s.mode)?.label.toLowerCase()}{problem
					? ` · ${problem.label}`
					: ''}"
			>
				{#if comparison}
					<ComparisonTable {comparison} {settings} {linkFor} />
					<p class="fine table-note">
						Cheapest? compares each path with the cheapest path in the graph. Generated counts the
						root and children that were not added; max frontier is the largest frontier size.
					</p>
				{:else}
					<p class="fine">The graph text has errors; no strategy was run.</p>
				{/if}
				<p class="visually-hidden" aria-live="polite">{summary}</p>
			</Panel>
		</div>

		<div class="counts-grid">
			<div bind:this={countsPanel} class="anchor">
				<Panel title="Node counts">
					<NodeCounts
						bind:b={s.b}
						bind:d={s.d}
						bind:m={s.m}
						bind:cStar={s.cStar}
						bind:eps={s.eps}
					/>
				</Panel>
			</div>
			<div class="side">
				<Panel title="A note on the complexity of search">
					<HanoiNote bind:disks={s.disks} />
				</Panel>
				<Panel title="Typical search costs for the 8-puzzle">
					<EightPuzzleCosts />
				</Panel>
			</div>
		</div>

		<Panel title="Questions from the slides">
			<div class="questions">
				<div class="question">
					<p class="q">When is UCS equivalent to BFS?</p>
					<CitationTag cite={{ deck: 'uninformed', slide: 45 }} />
					<Disclosure>
						<p>
							When all step costs are equal
							<CitationTag cite={{ deck: 'uninformed', slide: 40 }} />. The path cost g(n) then
							grows with the depth, so UCS takes the nodes off the frontier level by level, as BFS
							does (ties go to the node added first). On the IDS binary tree, where every step costs
							1, both take A, B, C, D, E, F, G, H, … off the frontier in the same order.
						</p>
						<Button size="sm" onclick={() => openPreset('binary-tree')}>
							{#snippet icon()}<Icon name="play" />{/snippet}
							Load “IDS binary tree”
						</Button>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">Can the complexity of UCS exceed the complexity of BFS?</p>
					<CitationTag cite={{ deck: 'uninformed', slide: 45 }} />
					<Disclosure>
						<p>
							Yes. UCS takes time and space O(b<sup>C*/ε</sup>), which can be greater than O(bᵈ):
							the search can explore long paths of small steps before shorter paths of larger steps
							<CitationTag cite={{ deck: 'uninformed', slide: 44 }} />. The tiny search problem has
							b = 3, C* = 10, ε = 1, and d = 5 (the cheapest path has 5 steps): the UCS bound is 1 +
							3 + … + 3¹⁰ = 88,573 nodes against 1 + 3 + … + 3⁵ = 364 for BFS.
						</p>
						<Button size="sm" onclick={() => setCounts({ b: 3, d: 5, cStar: 10, eps: 1 })}>
							{#snippet icon()}<Icon name="arrow-right" />{/snippet}
							Count with b = 3, d = 5, C* = 10, ε = 1
						</Button>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">How to make DFS complete?</p>
					<CitationTag cite={{ deck: 'uninformed', slide: 45 }} />
					<Disclosure>
						<p>
							Modify it to avoid repeated states along the path: it is then complete in finite
							spaces <CitationTag cite={{ deck: 'uninformed', slide: 32 }} />. Depth-first tree
							search from Arad goes Arad, Sibiu, Arad, Sibiu, … until the limit stops it; with the
							path check it returns Arad → Sibiu → Fagaras → Bucharest.
						</p>
						<Button size="sm" onclick={() => openPreset('romania', 'path')}>
							{#snippet icon()}<Icon name="play" />{/snippet}
							Load Romania with a path check
						</Button>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">When is DFS better than BFS?</p>
					<CitationTag cite={{ deck: 'uninformed', slide: 45 }} />
					<Disclosure>
						<p>
							When there are lots of solutions, DFS may be much faster than BFS
							<CitationTag cite={{ deck: 'uninformed', slide: 32 }} />. It also needs only linear
							space, O(bm), where BFS needs O(bᵈ), and for BFS space is the bigger problem
							<CitationTag cite={{ deck: 'uninformed', slide: 31 }} />: with b = 10, d = 5, and m =
							10, BFS keeps 100,000 nodes and DFS 101. DFS is terrible if m is much larger than d.
						</p>
						<Button size="sm" onclick={() => setCounts({ b: 10, d: 5, m: 10 })}>
							{#snippet icon()}<Icon name="arrow-right" />{/snippet}
							Count with b = 10, d = 5, m = 10
						</Button>
					</Disclosure>
				</div>
			</div>
		</Panel>
	</div>
</ToolPage>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}
	.props {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4) var(--space-6);
		align-items: start;
	}
	@media (min-width: 1040px) {
		.props {
			grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
		}
	}
	.symbols dl {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--space-1) var(--space-3);
		margin: 0;
		font-size: var(--text-sm);
	}
	.symbols dl > div {
		display: contents;
	}
	.symbols dt {
		font-family: var(--font-serif);
		font-style: italic;
		font-weight: 600;
		white-space: nowrap;
	}
	.symbols dd {
		margin: 0;
		color: var(--text-2);
	}
	.cites {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-2);
		margin: var(--space-3) 0 0;
	}
	.run,
	.counts-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	@media (min-width: 1040px) {
		.run {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
		.counts-grid {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}
	.anchor {
		min-width: 0;
		scroll-margin-top: calc(56px + var(--space-4));
	}
	.run :global(.error) {
		margin-bottom: var(--space-3);
	}
	.preset-note {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		margin: calc(-1 * var(--space-1)) 0 var(--space-3);
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
	.problem-cite {
		margin: calc(-1 * var(--space-2)) 0 var(--space-3);
	}
	.settings {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.mode-note {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-2);
	}
	.numbers {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: var(--space-3);
	}
	.fine {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	.table-note {
		margin-top: var(--space-3);
	}
	.questions {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4) var(--space-6);
	}
	@media (min-width: 900px) {
		.questions {
			grid-template-columns: repeat(2, minmax(0, 1fr));
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
	.question :global(.content) {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}
	.question :global(.content p) {
		margin: 0;
		font-size: var(--text-sm);
	}
</style>
