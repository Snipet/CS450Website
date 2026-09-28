<script lang="ts">
	import { untrack } from 'svelte';
	import {
		Badge,
		Button,
		Callout,
		CitationTag,
		Disclosure,
		Icon,
		NumberField,
		Panel,
		PresetMenu,
		Select,
		ToolPage,
		type Preset
	} from '$lib/components/ui';
	import { StateGraph, StatusLegend } from '$lib/components/search';
	import { hasErrors } from '$lib/theory/diagnostics';
	import {
		ROMANIA,
		checkHeuristic,
		layoutGraph,
		parseGraphText,
		shortestPath,
		type GraphProblemSpec,
		type WeightedGraph
	} from '$lib/theory/graphs';
	import { tool } from '$lib/tools/catalog/heuristics';
	import ConsistencyTable from '$lib/tools/heuristics/ConsistencyTable.svelte';
	import DominanceView from '$lib/tools/heuristics/DominanceView.svelte';
	import FBandList from '$lib/tools/heuristics/FBandList.svelte';
	import GraphTextEditor from '$lib/tools/heuristics/GraphTextEditor.svelte';
	import HeuristicTable from '$lib/tools/heuristics/HeuristicTable.svelte';
	import RunCard from '$lib/tools/heuristics/RunCard.svelte';
	import StatusStrip from '$lib/tools/heuristics/StatusStrip.svelte';
	import VerdictView from '$lib/tools/heuristics/VerdictView.svelte';
	import WeightedView from '$lib/tools/heuristics/WeightedView.svelte';
	import {
		consistencyRows,
		dominance,
		fBands,
		heuristicRows,
		optimalPath,
		runAStar,
		verdictSummary,
		verdicts,
		weightedBound,
		type SecondChoice
	} from '$lib/tools/heuristics/analysis';
	import {
		formatValue,
		fullHeuristic,
		perfectHeuristic,
		sameHeuristic,
		scaleHeuristic,
		scaledLabel,
		setStateH,
		specText,
		stepFrom,
		withGoal,
		withHeuristic,
		withStart,
		zeroHeuristic,
		type Heuristic
	} from '$lib/tools/heuristics/edit';
	import {
		HEURISTIC_PRESETS,
		basePresetFor,
		matchPreset,
		presetHeuristic,
		type HeuristicsScenario
	} from '$lib/tools/heuristics/presets';
	import { resolveSecond } from '$lib/tools/heuristics/second';
	import {
		MAX_FACTOR,
		MIN_FACTOR,
		completeHeuristicsState,
		defaultHeuristicsState,
		isSavedHeuristicsState,
		type HeuristicsState
	} from '$lib/tools/heuristics/state';
	import { toolLink } from '$lib/tools/links';
	import { syncToHash } from '$lib/url-state';

	const initial = defaultHeuristicsState();

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	/** The graph text as typed. */
	let text = $state(initial.graph);
	/** The last graph text without errors: what every view shows. */
	let validText = $state(initial.graph);
	let second = $state<SecondChoice>(initial.second);
	let alpha = $state(initial.alpha);
	let selected = $state<string | null>(initial.selected);
	let presetId = $state<string | null>(initial.preset);

	/** Factor for "Scale h" (not saved). */
	let factor = $state(2);
	/** Screen-reader announcement of actions and verdict changes. */
	let announcement = $state('');
	/** Asks the h table to scroll a state's row into view. */
	let reveal = $state<{ id: string; n: number } | null>(null);

	syncToHash(
		() => ({
			graph: validText,
			second,
			alpha,
			selected: selectedRow ? selected : null,
			preset: presetId
		}),
		{
			validate: isSavedHeuristicsState,
			onLoad(saved) {
				load(completeHeuristicsState(saved));
			}
		}
	);

	function load(s: HeuristicsState) {
		text = s.graph;
		validText = s.graph;
		second = s.second;
		alpha = s.alpha;
		selected = s.selected;
		presetId = s.preset;
		lastSummary = null;
	}

	const parsed = $derived(parseGraphText(text));
	const textHasErrors = $derived(hasErrors(parsed.diagnostics));
	// Depends on the valid text only, so typing errors does not rerun the searches.
	const spec = $derived(parseGraphText(validText).spec!);

	// ------------------------------------------------------------------
	// Presets
	// ------------------------------------------------------------------

	const exactPreset = $derived(matchPreset(validText) ?? null);
	/** The preset the problem comes from (for Reset and "the preset's heuristic"). */
	const basePreset = $derived(basePresetFor(presetId, validText, spec) ?? null);
	const baseH = $derived(basePreset ? presetHeuristic(basePreset) : null);
	const edited = $derived(basePreset !== null && exactPreset?.id !== basePreset.id);

	function loadPreset(p: Preset<HeuristicsScenario>) {
		text = p.value.graph;
		validText = p.value.graph;
		presetId = p.id;
		selected = null;
		if (second.kind === 'custom') second = { kind: 'zero' };
		announce(`Loaded ${p.label}.`);
	}

	// ------------------------------------------------------------------
	// Analysis
	// ------------------------------------------------------------------

	const h1 = $derived(fullHeuristic(spec));
	const report = $derived(checkHeuristic(spec, h1));
	const rows = $derived(heuristicRows(spec, report));
	const edgeRows = $derived(consistencyRows(report));
	const v = $derived(verdicts(spec, h1));

	const best = $derived(optimalPath(spec));
	const cStar = $derived(best?.cost ?? null);
	const treeRun = $derived(runAStar(spec, h1, 'tree', cStar));
	const graphRun = $derived(runAStar(spec, h1, 'graph', cStar));
	const bands = $derived(
		cStar !== null && treeRun.cost !== null ? fBands(treeRun.result, cStar) : null
	);

	/** The choice in effect: "the preset's heuristic" without a preset is h = 0. */
	const secondShown = $derived<SecondChoice>(
		second.kind === 'preset' && !baseH ? { kind: 'zero' } : second
	);
	const resolved = $derived(resolveSecond(secondShown, spec, h1, baseH));
	const dom = $derived(dominance(spec, h1, resolved.h));
	const domRuns = $derived({
		h1: treeRun,
		h2: runAStar(spec, resolved.h, 'tree', cStar),
		max: runAStar(spec, dom.max, 'tree', cStar)
	});

	const weightedRuns = $derived(
		(['tree', 'graph'] as const).map((mode) => ({
			mode,
			weighted: runAStar(spec, h1, mode, cStar, alpha),
			plain: mode === 'tree' ? treeRun : graphRun
		}))
	);

	// ------------------------------------------------------------------
	// Announcements
	// ------------------------------------------------------------------

	/** The verdict last read out; null until the page has settled. */
	let lastSummary: string | null = null;

	function announce(what: string) {
		const summary = verdictSummary(v);
		lastSummary = summary;
		announcement = `${what} ${summary}`;
	}

	// Edits in the table or the text: read the verdict out when it changes.
	$effect(() => {
		const summary = verdictSummary(v);
		untrack(() => {
			if (lastSummary !== null && summary !== lastSummary) announcement = summary;
			lastSummary = summary;
		});
	});

	// ------------------------------------------------------------------
	// Edits
	// ------------------------------------------------------------------

	function applySpec(next: GraphProblemSpec) {
		const t = specText(next);
		text = t;
		validText = t;
	}

	function editText(value: string) {
		text = value;
		if (textHasErrors || value === validText) return;
		validText = value;
	}

	function editH(id: string, value: number) {
		if (textHasErrors) return;
		let next = setStateH(spec, id, value);
		// Back to the preset's values: back to its label, so the preset matches again.
		if (baseH && next.h && sameHeuristic(spec, next.h, baseH.h)) {
			next = withHeuristic(spec, next.h, baseH.label ?? null);
		}
		applySpec(next);
	}

	function setHeuristic(h: Heuristic, label: string | null, what: string) {
		if (textHasErrors) return;
		applySpec(withHeuristic(spec, h, label));
		announce(what);
	}

	const setZero = () => setHeuristic(zeroHeuristic(spec), 'h = 0', 'h set to 0 at every state.');
	const setPerfect = () =>
		setHeuristic(
			perfectHeuristic(spec),
			'h*(n), the true cost to the nearest goal',
			'h set to the true cost h*.'
		);
	const scaleH = () =>
		setHeuristic(
			scaleHeuristic(spec, h1, factor),
			scaledLabel(spec.hLabel, factor),
			`h multiplied by ${formatValue(factor)}.`
		);
	const resetH = () => {
		if (!baseH || !basePreset) return;
		setHeuristic(
			fullHeuristic(spec, baseH.h),
			baseH.label ?? null,
			`h reset to ${basePreset.label}.`
		);
	};

	const atPreset = $derived(baseH !== null && sameHeuristic(spec, h1, baseH.h));
	const isZero = $derived(rows.every((r) => r.h === 0));
	const isPerfect = $derived(sameHeuristic(spec, h1, perfectHeuristic(spec)));

	function setStart(id: string) {
		if (textHasErrors || id === spec.start) return;
		applySpec(withStart(spec, id));
		announce(`Start state: ${id}.`);
	}

	const MULTI = '\u0000goals';
	function setGoal(id: string) {
		if (textHasErrors || id === MULTI || (spec.goals.length === 1 && spec.goals[0] === id)) return;
		applySpec(withGoal(spec, id));
		announce(`Goal state: ${id}.`);
	}

	const stateOptions = $derived(spec.graph.nodes.map((n) => ({ value: n.id, label: n.id })));
	const goalOptions = $derived(
		spec.goals.length > 1
			? [{ value: MULTI, label: spec.goals.join(', ') }, ...stateOptions]
			: stateOptions
	);
	const goalValue = $derived(spec.goals.length === 1 ? spec.goals[0] : MULTI);

	// ------------------------------------------------------------------
	// Second heuristic
	// ------------------------------------------------------------------

	function setSecond(choice: SecondChoice) {
		second = choice;
	}

	/** Starts a custom h2 as a copy of the current h2 (id null), or changes one of its values. */
	function editCustom(id: string | null, value?: number) {
		const h = { ...resolved.h };
		if (id !== null && value !== undefined) h[id] = Math.max(0, value);
		second = { kind: 'custom', h };
	}

	function applySecond(which: 'h2' | 'max') {
		if (which === 'h2') setHeuristic(resolved.h, resolved.label, 'h replaced by h2.');
		else
			setHeuristic(
				dom.max,
				`max{${spec.hLabel?.trim() || 'h1'}, ${resolved.label}}`,
				'h replaced by max{h1, h2}.'
			);
	}

	// ------------------------------------------------------------------
	// Selection
	// ------------------------------------------------------------------

	let revealCount = 0;

	function select(id: string, fromGraph = false) {
		selected = selected === id ? null : id;
		if (fromGraph && selected && window.matchMedia('(min-width: 1100px)').matches) {
			reveal = { id, n: ++revealCount };
		}
	}

	const selectedRow = $derived(rows.find((r) => r.id === selected) ?? null);
	const selectedPath = $derived(
		selectedRow ? shortestPath({ ...spec, start: selectedRow.id }) : null
	);

	// ------------------------------------------------------------------
	// Drawing
	// ------------------------------------------------------------------

	/**
	 * The graph to draw, with a position for every state. Typed graphs without
	 * `at:` lines are laid out once per graph (states and edges) instead of on
	 * every change of h, the start, or the goal: the layout of a 300-state graph
	 * takes about half a second.
	 */
	let drawnMemo: { key: string; graph: WeightedGraph } | null = null;
	const drawnGraph = $derived.by(() => {
		const g = spec.graph;
		const key = JSON.stringify([g.directed, g.nodes, g.edges]);
		if (drawnMemo?.key !== key) {
			const pos = layoutGraph(g);
			drawnMemo = {
				key,
				graph: { ...g, nodes: g.nodes.map((n) => ({ ...n, ...pos.get(n.id)! })) }
			};
		}
		return drawnMemo.graph;
	});

	const ROMANIA_CITIES = new Set(ROMANIA.nodes.map((n) => n.id));
	const isMap = $derived(
		spec.graph.nodes.length === ROMANIA_CITIES.size &&
			spec.graph.nodes.every((n) => ROMANIA_CITIES.has(n.id))
	);
	const overIds = $derived(v.over.map((r) => r.id));
	const highlight = $derived({ dropped: overIds, path: best?.states ?? [] });
	const legendItems = $derived([
		'goal' as const,
		...(best ? (['path'] as const) : []),
		...(overIds.length ? (['dropped'] as const) : []),
		'heuristic' as const
	]);
	const legendLabels = $derived({
		path: cStar !== null ? `Cheapest path (C* = ${formatValue(cStar)})` : 'Cheapest path',
		dropped: 'h(n) > h*(n)',
		heuristic: 'h(n)'
	});
	/** How the states name their marks: an overestimate, not a repeated state. */
	const graphStatusText = { dropped: 'h(n) > h*(n)', path: 'On a cheapest path' };
	const graphLabel = $derived(
		`${spec.graph.directed ? 'Directed' : 'Undirected'} state-space graph with ${spec.graph.nodes.length} states, start ${spec.start}, ${
			spec.goals.length === 1 ? 'goal' : 'goals'
		} ${spec.goals.join(', ')}, with h(n) under each state.${
			overIds.length ? ` h(n) > h*(n) at ${overIds.join(', ')}.` : ' h(n) ≤ h*(n) at every state.'
		}${best ? ` Cheapest path: ${best.states.join(' → ')} (cost ${formatValue(best.cost)}).` : ''}`
	);

	// ------------------------------------------------------------------
	// Links
	// ------------------------------------------------------------------

	const treeLink = $derived(
		toolLink('search', { graph: validText, strategy: 'astar', mode: 'tree' })
	);
	const graphLink = $derived(
		toolLink('search', { graph: validText, strategy: 'astar', mode: 'graph' })
	);
	const puzzleLink = toolLink('eight-puzzle', { start: '724506831' });

	const hText = $derived(
		spec.hLabel?.trim() ||
			(spec.h && Object.keys(spec.h).length
				? `Given for ${Object.keys(spec.h).length} of ${spec.graph.nodes.length} states`
				: 'None (h = 0 for every state)')
	);
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu
			presets={HEURISTIC_PRESETS}
			selected={exactPreset?.id ?? null}
			onselect={loadPreset}
			align="end"
		/>
	{/snippet}

	<div class="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>

	<div class="row top">
		<Panel
			title="Problem"
			subtitle="{spec.graph.nodes.length} states · {spec.graph.edges.length} edges"
		>
			<div class="endpoints">
				<Select
					label="Start"
					size="sm"
					options={stateOptions}
					value={spec.start}
					disabled={textHasErrors}
					onchange={setStart}
				/>
				<Select
					label={spec.goals.length === 1 ? 'Goal' : 'Goals'}
					size="sm"
					options={goalOptions}
					value={goalValue}
					disabled={textHasErrors}
					onchange={setGoal}
				/>
			</div>
			<dl class="facts">
				<div class="fact">
					<dt>h(n)</dt>
					<dd>{hText}</dd>
				</div>
				<div class="fact">
					<dt>C*</dt>
					<dd>
						{#if best}
							<span class="mono">{formatValue(best.cost)}</span>
							<span class="muted">· {best.states.join(' → ')}</span>
						{:else}
							<span class="muted">No goal state can be reached from {spec.start}.</span>
						{/if}
					</dd>
				</div>
			</dl>

			{#if basePreset}
				<div class="preset-note">
					<p>
						<strong>{basePreset.label}.</strong>
						{basePreset.description}
						{#if edited}<Badge tone="muted">edited</Badge>{/if}
					</p>
					{#if basePreset.cite}<CitationTag cite={basePreset.cite} />{/if}
				</div>
			{/if}

			<div class="editor">
				<Disclosure summary="Edit graph" openSummary="Hide graph text" variant="boxed">
					<GraphTextEditor {text} diagnostics={parsed.diagnostics} oninput={editText} />
				</Disclosure>
			</div>
			{#if textHasErrors}
				<div class="callout">
					<Callout tone="warn">
						The graph text has errors (listed under the editor). The views show the last graph
						without errors; h cannot be changed until the errors are fixed.
					</Callout>
				</div>
			{/if}
		</Panel>

		<Panel title="Admissibility and consistency">
			<VerdictView {v} tree={treeRun} graph={graphRun} {cStar} />
		</Panel>
	</div>

	<div class="row main">
		<Panel title="h(n) and h*(n)" subtitle="one row per state">
			<div class="quick" role="group" aria-label="Set h">
				<Button size="sm" disabled={textHasErrors || isZero} onclick={setZero}>h = 0</Button>
				<Button size="sm" disabled={textHasErrors || isPerfect} onclick={setPerfect}>h = h*</Button>
				<div class="scale">
					<NumberField
						label="Factor"
						hideLabel
						size="sm"
						bind:value={factor}
						min={MIN_FACTOR}
						max={MAX_FACTOR}
						step={stepFrom(factor, 0.1)}
						disabled={textHasErrors}
					/>
					<Button size="sm" disabled={textHasErrors} onclick={scaleH}>× h</Button>
				</div>
				{#if baseH}
					<Button size="sm" variant="ghost" disabled={textHasErrors || atPreset} onclick={resetH}>
						{#snippet icon()}<Icon name="reset" />{/snippet}
						Reset to preset
					</Button>
				{/if}
			</div>
			<HeuristicTable
				{rows}
				{selected}
				{reveal}
				disabled={textHasErrors}
				onselect={(id) => select(id)}
				onedit={editH}
			/>
			{#snippet footer()}
				<p class="foot-note">
					h*(n) is the cost of a cheapest path from n to a goal (∞ when no goal can be reached).
					Changing h rewrites the <code>h:</code> lines of the graph text, so Copy link keeps the values.
					h = h* gives states that cannot reach a goal the largest finite h*, which keeps it consistent.
				</p>
			{/snippet}
		</Panel>

		<div class="graph-col">
			<StatusStrip {v} tree={treeRun} graph={graphRun} />
			<Panel title="State space" subtitle="with h(n)" padding="none">
				<div class="figure">
					<StateGraph
						graph={drawnGraph}
						start={spec.start}
						goals={spec.goals}
						heuristic={h1}
						{highlight}
						nodeShape={isMap ? 'square' : 'circle'}
						{selected}
						onnodeclick={(id) => select(id, true)}
						height={440}
						ariaLabel={graphLabel}
						statusText={graphStatusText}
					/>
					<StatusLegend
						items={legendItems}
						labels={legendLabels}
						shape={isMap ? 'square' : 'circle'}
					/>
					<div class="selection" aria-live="polite">
						{#if selectedRow}
							<p>
								<strong>{selectedRow.id}</strong>: h =
								<span class="mono">{formatValue(selectedRow.h)}</span>, h* =
								<span class="mono">{formatValue(selectedRow.hStar)}</span>
								{#if selectedPath && selectedPath.states.length > 1}
									<span class="muted">({selectedPath.states.join(' → ')})</span>
								{/if}
								{#if !selectedRow.admissible}
									<Badge tone="reject">overestimates by {formatValue(-selectedRow.margin)}</Badge>
								{/if}
							</p>
							<Button size="sm" variant="ghost" onclick={() => (selected = null)}>
								{#snippet icon()}<Icon name="x" />{/snippet}
								Clear
							</Button>
						{:else}
							<p class="muted">Click a state to select its row.</p>
						{/if}
					</div>
				</div>
			</Panel>
		</div>
	</div>

	<div class="row pair">
		<Panel title="Consistency" subtitle="h(n) ≤ c(n, n') + h(n') on every edge direction">
			<ConsistencyTable rows={edgeRows} {selected} onselect={(id) => select(id)} />
			{#snippet footer()}
				<p class="foot-note">
					{spec.graph.directed
						? 'Each directed edge is one check.'
						: 'Each undirected edge is checked in both directions.'} A failed check means f can drop along
					that edge: f(n') = f(n) − (h(n) − h(n') − c(n, n')).
					<CitationTag cite={{ deck: 'informed', slide: 28 }} />
				</p>
			{/snippet}
		</Panel>

		<Panel title="A* with this h">
			<div class="runs">
				<RunCard
					title="Tree search"
					note="no repeated-state detection"
					run={treeRun}
					{cStar}
					href={treeLink}
				/>
				<RunCard
					title="Graph search"
					note="explored set and frontier check"
					run={graphRun}
					{cStar}
					href={graphLink}
				/>
			</div>

			<div class="bands">
				<h3>Nodes taken off the frontier by A* tree search, by f(n) = g(n) + h(n)</h3>
				{#if bands && cStar !== null}
					<FBandList {bands} {cStar} />
				{:else if cStar === null}
					<p class="muted">No goal state can be reached, so there is no C*.</p>
				{:else}
					<p class="muted">The tree search stopped before it returned a solution.</p>
				{/if}
				<blockquote>
					<p>
						A* is optimally efficient: no other tree-based algorithm that uses the same heuristic
						can expand fewer nodes and still be guaranteed to find the optimal solution. A* expands
						all nodes for which f(n) ≤ C*.
					</p>
					<CitationTag cite={{ deck: 'informed', slide: 30 }} />
				</blockquote>
			</div>

			<div class="question">
				<p class="q">A* gone wrong?</p>
				<CitationTag cite={{ deck: 'informed', slide: 27 }} />
				<Disclosure>
					<p>
						Graph search never puts a state back on the frontier once it is explored, so the first
						path to a state that A* expands has to be a cheapest one. An admissible heuristic that
						is not consistent can break that: on the slide 27 graph, h(A) = 4 makes the path through
						A look expensive, C is expanded through B (g = 3), and the cheaper path through A (g =
						2) is dropped when it reaches C. Graph search returns cost 6, tree search 5.
					</p>
					{#if exactPreset?.id !== 'astar-wrong'}
						<Button
							size="sm"
							onclick={() => loadPreset(HEURISTIC_PRESETS.find((p) => p.id === 'astar-wrong')!)}
						>
							{#snippet icon()}<Icon name="play" />{/snippet}
							Load “A* gone wrong”
						</Button>
					{/if}
				</Disclosure>
			</div>
		</Panel>
	</div>

	<Panel title="Dominance and combining">
		<DominanceView
			report={dom}
			second={secondShown}
			labels={{ h1: spec.hLabel?.trim() || 'this h', h2: resolved.label }}
			runs={domRuns}
			hasPreset={baseH !== null}
			disabled={textHasErrors}
			onsecond={setSecond}
			oncustom={editCustom}
			onapply={applySecond}
		/>
		<div class="slide-notes">
			<blockquote>
				<p>
					If h1 and h2 are both admissible and h2(n) ≥ h1(n) for all n, then h2 dominates h1. A*
					search expands every node with f(n) &lt; C*, or h(n) &lt; C* − g(n); therefore A* search
					with h1 will expand more nodes.
				</p>
				<CitationTag cite={{ deck: 'informed', slide: 35 }} />
			</blockquote>
			<blockquote>
				<p>
					With a collection of admissible heuristics h1(n), …, hm(n), none of which dominates the
					others: h(n) = max&#123;h1(n), …, hm(n)&#125;.
				</p>
				<CitationTag cite={{ deck: 'informed', slide: 37 }} />
			</blockquote>
		</div>
		{#if puzzleLink}
			<p class="link-note">
				The 8-puzzle’s h1 (misplaced tiles) and h2 (Manhattan distance) are compared in the 8-puzzle
				tool.
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
				<a href={puzzleLink}><Icon name="arrow-right" size={14} /> Open the slide 32 board</a>
			</p>
		{/if}
	</Panel>

	<Panel title="Weighted A*">
		<div class="weighted-layout">
			<WeightedView
				{alpha}
				runs={weightedRuns}
				{cStar}
				bound={weightedBound(v)}
				onalpha={(a) => (alpha = a)}
			/>
			<blockquote>
				<p>
					Take an admissible heuristic, “inflate” it by a multiple α &gt; 1, and then perform A*
					search as usual. Fewer nodes tend to get expanded, but the resulting solution may be
					suboptimal (its cost will be at most α times the cost of the optimal solution).
				</p>
				<CitationTag cite={{ deck: 'informed', slide: 38 }} />
			</blockquote>
		</div>
	</Panel>
</ToolPage>

<style>
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	.graph-col {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	@media (min-width: 1100px) {
		.row.top {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			align-items: stretch;
		}
		.row.main,
		.row.pair {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.graph-col {
			position: sticky;
			top: calc(56px + var(--space-3));
		}
	}
	.endpoints {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}
	.facts {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		margin: var(--space-3) 0 0;
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
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.muted {
		color: var(--text-3);
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
	.callout {
		margin-top: var(--space-3);
	}
	.quick {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}
	.scale {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.foot-note {
		margin: 0;
		line-height: 1.6;
	}
	.figure {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: 0 var(--space-3) var(--space-3);
	}
	.selection {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: 32px;
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
		font-size: var(--text-sm);
	}
	.selection p {
		flex: 1 1 14rem;
		margin: 0;
		line-height: 1.5;
	}
	.runs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: var(--space-3);
	}
	.bands {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	.bands h3 {
		margin: 0;
		font-size: var(--text-base);
	}
	.bands p.muted {
		margin: 0;
		font-size: var(--text-sm);
	}
	blockquote {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		margin: 0;
		padding: var(--space-1) 0 var(--space-1) var(--space-3);
		border-left: 3px solid var(--border-strong);
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	blockquote p {
		margin: 0;
	}
	.question {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		margin-top: var(--space-4);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
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
		line-height: 1.55;
	}
	.slide-notes {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	.link-note {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-2);
		margin: var(--space-4) 0 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.link-note a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.weighted-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4) var(--space-6);
		align-items: start;
	}
	@media (min-width: 900px) {
		.slide-notes,
		.weighted-layout {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.slide-notes {
			display: grid;
		}
	}
</style>
