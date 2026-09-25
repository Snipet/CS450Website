<script lang="ts">
	import {
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
		Tabs,
		ToolPage,
		stepperKeys,
		type Preset
	} from '$lib/components/ui';
	import {
		FrontierView,
		StateGraph,
		graphHighlightAt,
		strategyName,
		strategyShort
	} from '$lib/components/search';
	import type { NodeFrame } from '$lib/components/search/graph-scene';
	import type { GraphEdge, GraphProblemSpec } from '$lib/theory/graphs';
	import { SLIDE_GOAL, SLIDE_START } from '$lib/theory/puzzle';
	import { tool } from '$lib/tools/catalog/state-spaces';
	import { toolLink } from '$lib/tools/links';
	import AgentTypes from '$lib/tools/state-spaces/AgentTypes.svelte';
	import ComponentList from '$lib/tools/state-spaces/ComponentList.svelte';
	import CountTable from '$lib/tools/state-spaces/CountTable.svelte';
	import MiniBoard from '$lib/tools/state-spaces/MiniBoard.svelte';
	import SizeTable from '$lib/tools/state-spaces/SizeTable.svelte';
	import SuccessorTable from '$lib/tools/state-spaces/SuccessorTable.svelte';
	import VacuumGlyph from '$lib/tools/state-spaces/VacuumGlyph.svelte';
	import {
		BASIC_IDEA,
		COMPONENT_NAMES,
		OPTIMAL_SOLUTION,
		PROBLEM_IDS,
		PUZZLE_SIZES,
		SEARCH_SETTING,
		SLIDE_5_COMPONENTS,
		STATE_SPACE_DEFINITION,
		SUCCESSOR_DEFINITION,
		formatCount,
		problemInfo,
		type ProblemId
	} from '$lib/tools/state-spaces/content';
	import { STATE_SPACE_PRESETS, matchPreset } from '$lib/tools/state-spaces/presets';
	import {
		ACTION_LETTER,
		BASIC_STRATEGIES,
		LOOP_SIDE,
		MAX_DRAWN_SQUARES,
		MIN_DRAWN_SQUARES,
		basicSearch,
		describeBasicStep,
		describeVacuumState,
		graphSpec,
		initialState,
		isGraphProblem,
		searchToolGraph,
		successorRows,
		vacuumEdgeActions,
		type BasicStrategy
	} from '$lib/tools/state-spaces/space';
	import {
		completeStateSpaces,
		defaultStateSpaces,
		isSavedStateSpaces,
		stateForScenario,
		configOf,
		type StateSpacesConfig,
		type StateSpacesScenario
	} from '$lib/tools/state-spaces/state';
	import { syncToHash } from '$lib/url-state';

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	let cfg = $state<StateSpacesConfig>(configOf(defaultStateSpaces()));

	const drawn = $derived(isGraphProblem(cfg.problem) ? cfg.problem : null);
	const spec = $derived(drawn ? graphSpec(drawn, cfg.squares) : null);
	const result = $derived(drawn ? basicSearch(drawn, cfg.squares, cfg.strategy) : null);

	const stepper = new Stepper(() => result?.steps.length ?? 0, { speed: 1.5 });
	const step = $derived(stepper.index);

	syncToHash(() => ({ ...cfg, step }), {
		validate: isSavedStateSpaces,
		onLoad(saved) {
			const s = completeStateSpaces(saved);
			stepper.pause();
			cfg = configOf(s);
			stepper.set(s.step);
		}
	});

	const scenario = $derived<StateSpacesScenario>({
		problem: cfg.problem,
		squares: cfg.squares,
		strategy: cfg.strategy
	});
	const presetId = $derived(matchPreset(scenario)?.id ?? null);

	function loadPreset(p: Preset<StateSpacesScenario>) {
		stepper.pause();
		cfg = configOf(stateForScenario(p.value));
		stepper.first();
	}

	function setProblem(problem: ProblemId) {
		if (problem === cfg.problem) return;
		stepper.pause();
		cfg.problem = problem;
		cfg.selected = initialState(problem, cfg.squares);
		stepper.first();
	}

	function setSquares(n: number) {
		if (n === cfg.squares) return;
		stepper.pause();
		cfg.squares = n;
		cfg.selected = initialState('vacuum', n);
		stepper.first();
	}

	function setStrategy(s: BasicStrategy) {
		stepper.pause();
		cfg.strategy = s;
		stepper.first();
	}

	function select(state: string) {
		cfg.selected = state;
	}

	// ------------------------------------------------------------------
	// Problem views
	// ------------------------------------------------------------------

	const info = $derived(problemInfo(cfg.problem, cfg.squares));
	const problemTabs = PROBLEM_IDS.map((id) => ({ id, label: problemInfo(id).name }));

	const rows = $derived(successorRows(cfg.problem, cfg.squares, cfg.selected));
	const successorHighlight = $derived({
		current: cfg.selected,
		frontier: [...new Set(rows.filter((r) => !r.same).map((r) => r.state))]
	});

	const stateOptions = $derived(
		spec
			? [...spec.graph.nodes.map((n) => n.id)]
					.sort((a, b) => (drawn === 'romania' ? a.localeCompare(b) : 0))
					.map((id) => ({ value: id, label: id }))
			: []
	);

	// Vacuum world drawing: pictures in boxes, edges labelled L, R, S (slide 9).
	const edgeActions = $derived(drawn === 'vacuum' ? vacuumEdgeActions(cfg.squares) : []);
	const vacuumEdgeLabel = $derived((_: GraphEdge, i: number) =>
		edgeActions[i] ? ACTION_LETTER[edgeActions[i]] : null
	);
	const vacuumLoopSide = $derived((_: GraphEdge, i: number) =>
		edgeActions[i] ? LOOP_SIDE[edgeActions[i]] : null
	);
	/** Picture scale per number of squares (1 = the vacuum tool's 27 × 24 px per square). */
	const PICTURE_SCALE: Record<number, number> = { 2: 1, 3: 0.8, 4: 0.62 };
	const vacuumBox = $derived({
		width: 27 * cfg.squares * PICTURE_SCALE[cfg.squares],
		height: 24 * PICTURE_SCALE[cfg.squares]
	});
	/** A vacuum state's accessible name in the search view: its picture in words and its status. */
	const vacuumName = (id: string, status: readonly string[]) =>
		[`${id}: ${describeVacuumState(id)}`, ...status].join(', ');

	/**
	 * Accessible names in the successor view: the selected state and its
	 * successors instead of search statuses.
	 */
	const successorSet = $derived(new Set(successorHighlight.frontier));
	const successorName = (id: string, status: readonly string[]) =>
		[
			drawn === 'vacuum' ? `${id}: ${describeVacuumState(id)}` : id,
			id === cfg.selected ? 'selected' : null,
			successorSet.has(id) ? `successor of ${cfg.selected}` : null,
			...status.filter((w) => w === 'goal state' || w === 'start state')
		]
			.filter(Boolean)
			.join(', ');

	const graphHeight = $derived(drawn === 'vacuum' ? (cfg.squares === 4 ? 560 : 460) : 440);
	/** The vacuum world with 3 or 4 squares is drawn across the whole width. */
	const wide = $derived(drawn === 'vacuum' && cfg.squares >= 3);
	const squaresOptions = Array.from(
		{ length: MAX_DRAWN_SQUARES - MIN_DRAWN_SQUARES + 1 },
		(_, i) => {
			const n = MIN_DRAWN_SQUARES + i;
			return { value: n, label: String(n), title: `${n} squares` };
		}
	);

	const stateCount = $derived(spec?.graph.nodes.length ?? 0);
	const actionCount = $derived(spec?.graph.edges.length ?? 0);
	const selectedLabel = $derived(
		cfg.problem === 'puzzle'
			? cfg.selected === SLIDE_START
				? 'the start state'
				: 'the selected board'
			: cfg.selected
	);

	// ------------------------------------------------------------------
	// Search: basic idea
	// ------------------------------------------------------------------

	const highlight = $derived(result ? graphHighlightAt(result, step) : undefined);
	const strategyOptions = BASIC_STRATEGIES.map((s) => ({
		value: s,
		label: strategyShort(s),
		title: strategyName(s)
	}));
	const searchLink = $derived(
		drawn
			? toolLink('search', {
					graph: searchToolGraph(drawn, cfg.squares),
					strategy: cfg.strategy,
					mode: 'graph'
				})
			: null
	);
	const searchLabel = $derived.by(() => {
		if (!result || !spec || !highlight) return '';
		const parts = [
			`${drawn === 'vacuum' ? `Vacuum world with ${cfg.squares} squares` : 'Romania'}: ${strategyName(cfg.strategy)} from ${spec.start}.`
		];
		if (highlight.current) parts.push(`Being expanded: ${highlight.current}.`);
		if (highlight.frontier.length) parts.push(`On the frontier: ${highlight.frontier.join(', ')}.`);
		if (highlight.explored.length) parts.push(`Explored: ${highlight.explored.join(', ')}.`);
		if (highlight.path.length) parts.push(`Solution path: ${highlight.path.join(' → ')}.`);
		return parts.join(' ');
	});

	// ------------------------------------------------------------------
	// Links and sizes
	// ------------------------------------------------------------------

	const puzzleLink = toolLink('eight-puzzle', { start: SLIDE_START });
	const vacuumLink = toolLink('vacuum', { program: 'reflex' });
	const sizeMark = $derived(
		cfg.problem === 'romania'
			? ['Romania']
			: cfg.problem === 'vacuum'
				? ['Vacuum world, 2 squares', 'Vacuum world, 10 squares']
				: cfg.problem === 'puzzle'
					? ['8-puzzle', '15-puzzle', '24-puzzle']
					: ['Robot motion planning']
	);
</script>

{#snippet vacuumPicture(f: NodeFrame)}
	<VacuumGlyph name={f.id} x={f.x} y={f.y} width={f.width} height={f.height} />
{/snippet}

{#snippet inlineGlyph(name: string)}
	{@const w = 27 * (name.length - 2)}
	<svg
		class="inline-glyph"
		viewBox="-0.5 -0.5 {w + 1} 25"
		width={(w + 1) * 0.75}
		height={25 * 0.75}
		aria-hidden="true"
	>
		<VacuumGlyph {name} width={w} height={24} frame />
	</svg>
{/snippet}

{#snippet componentsPanel()}
	<Panel title={info.title}>
		{#snippet actions()}<CitationTag cite={info.cite} />{/snippet}
		{#if info.setting.length}
			<p class="lede">{info.setting.join(' ')}</p>
		{/if}
		{#if cfg.problem === 'vacuum'}
			<div class="squares">
				<SegmentedControl
					label="Squares n"
					showLabel
					size="sm"
					options={squaresOptions}
					value={cfg.squares}
					onchange={setSquares}
				/>
			</div>
		{/if}
		<ComponentList components={info.components} />
		{#if cfg.problem === 'puzzle'}
			<p class="note strong-note">Finding the optimal solution of the n-puzzle is NP-hard.</p>
		{/if}
	</Panel>
{/snippet}

{#snippet successorPanel()}
	<Panel title="Successor function" subtitle="of {selectedLabel}">
		{#snippet actions()}<CitationTag cite={{ deck: 'search', slide: 14 }} />{/snippet}
		<div class="succ-head">
			{#if spec}
				<Select
					label="State"
					inline
					size="sm"
					options={stateOptions}
					value={cfg.selected}
					onchange={select}
				/>
				{#if drawn === 'vacuum'}
					<span class="succ-picture">
						{@render inlineGlyph(cfg.selected)}
						<span class="muted">{describeVacuumState(cfg.selected)}</span>
					</span>
				{/if}
			{:else if cfg.problem === 'puzzle'}
				<MiniBoard board={cfg.selected} size="sm" label="Selected board" />
				{#if cfg.selected !== SLIDE_START}
					<button type="button" class="link-button" onclick={() => select(SLIDE_START)}>
						<Icon name="reset" size={14} /> Back to the start state
					</button>
				{/if}
			{/if}
		</div>
		<SuccessorTable
			problem={cfg.problem}
			stateLabel={cfg.problem === 'puzzle' ? selectedLabel : cfg.selected}
			{rows}
			onselect={select}
		/>
		<p class="note">
			{#if spec}
				Select a state here or in the state space; select a successor to apply the successor
				function to it.
			{:else}
				Select a successor to apply the successor function to it.
			{/if}
		</p>
		{#snippet footer()}
			<p class="definition">{SUCCESSOR_DEFINITION.join(' ')}</p>
		{/snippet}
	</Panel>
{/snippet}

{#snippet statePanel()}
	{#if spec}{@render stateSpace(spec)}{/if}
{/snippet}

{#snippet stateSpace(spec: GraphProblemSpec)}
	<Panel
		title="State space"
		subtitle="{formatCount(stateCount)} states · {formatCount(actionCount)} {spec.graph.directed
			? 'actions'
			: 'roads'}"
		padding="none"
	>
		{#snippet actions()}
			<CitationTag
				cite={drawn === 'vacuum' ? { deck: 'search', slide: 9 } : { deck: 'search', slide: 7 }}
			/>
		{/snippet}
		<div class="figure">
			{#if drawn === 'vacuum'}
				<StateGraph
					graph={spec.graph}
					start={spec.start}
					goals={spec.goals}
					highlight={successorHighlight}
					selected={cfg.selected}
					onnodeclick={select}
					edgeLabel={vacuumEdgeLabel}
					loopSide={vacuumLoopSide}
					nodeBox={vacuumBox}
					nodePicture={vacuumPicture}
					describeNode={successorName}
					height={graphHeight}
				/>
			{:else}
				<StateGraph
					graph={spec.graph}
					start={spec.start}
					goals={spec.goals}
					highlight={successorHighlight}
					selected={cfg.selected}
					onnodeclick={select}
					nodeShape="square"
					describeNode={successorName}
					height={graphHeight}
				/>
			{/if}
			<div class="key">
				<span class="key-item">
					<span class="swatch current" aria-hidden="true"></span> Selected state
				</span>
				<span class="key-item">
					<span class="swatch successor" aria-hidden="true"></span> Its successors
				</span>
				<span class="key-item">
					<span class="swatch goal" aria-hidden="true"></span>
					{spec.goals.length === 1 ? 'Goal state' : 'Goal states'}
				</span>
				{#if drawn === 'vacuum'}
					<span class="key-item">
						{@render inlineGlyph('A CD')}
						<span>
							<span class="mono">A CD</span>: agent in A, A clean, B dirty; L, R, S = Left, Right,
							Suck
						</span>
					</span>
				{/if}
			</div>
		</div>
		<div class="caption">
			<p>{STATE_SPACE_DEFINITION.join(' ')}</p>
			{#if drawn === 'romania'}
				<div class="question">
					<p class="q">What is the state space for the Romania problem?</p>
					<Disclosure>
						<p>
							The map: the 20 cities are the states, and each of the 23 roads is an action in both
							directions (46 actions). Every city can be reached from Arad, so the state space is
							the whole map.
						</p>
					</Disclosure>
				</div>
			{/if}
		</div>
	</Panel>
{/snippet}

{#snippet vacuumSizePanel()}
	<Panel title="Size of the state space">
		{#snippet actions()}<CitationTag cite={{ deck: 'search', slide: 8 }} />{/snippet}
		<div class="size-body">
			<div class="size-text">
				<p class="lede">
					The size of the state space grows exponentially with the “size” of the world.
				</p>
				<div class="question">
					<p class="q">How many possible states? What if there are n possible locations?</p>
					<Disclosure>
						<p>
							The agent is in one of the n squares and each square is dirty or clean: n · 2ⁿ states,
							8 for the two squares of slide 9.
						</p>
					</Disclosure>
				</div>
			</div>
			<CountTable current={cfg.squares} />
		</div>
	</Panel>
{/snippet}

{#snippet puzzleBoardsPanel()}
	<Panel title="Start and goal states">
		{#snippet actions()}<CitationTag cite={{ deck: 'search', slide: 10 }} />{/snippet}
		<div class="boards">
			<figure>
				<MiniBoard board={SLIDE_START} label="Start state" />
				<figcaption>Start State</figcaption>
			</figure>
			<figure>
				<MiniBoard board={SLIDE_GOAL} label="Goal state" />
				<figcaption>Goal State</figcaption>
			</figure>
		</div>
		{#if puzzleLink}
			<p class="links">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
				<a href={puzzleLink}
					><Icon name="arrow-right" size={14} /> Solve the start state in the 8-puzzle tool</a
				>
			</p>
		{/if}
	</Panel>
{/snippet}

{#snippet puzzleSizePanel()}
	<Panel title="Size of the state space">
		{#snippet actions()}<CitationTag cite={{ deck: 'search', slide: 10 }} />{/snippet}
		<dl class="sizes">
			{#each PUZZLE_SIZES as p (p.name)}
				<div class="size">
					<dt>{p.name}</dt>
					<dd>{p.text} states</dd>
				</div>
			{/each}
		</dl>
		<p class="note">
			Counts as on the slide. From a given state, half of the (n + 1)! arrangements of the tiles and
			the blank can be reached: 9!/2 = 181,440 for the 8-puzzle, 16!/2 ≈ 1.05 × 10¹³ (about 10.5
			trillion) for the 15-puzzle, and 25!/2 ≈ 7.8 × 10²⁴ for the 24-puzzle.
		</p>
	</Panel>
{/snippet}

{#snippet robotPanel()}
	<Panel title="State space">
		{#snippet actions()}<CitationTag cite={{ deck: 'search', slide: 11 }} />{/snippet}
		<p class="lede">
			States are real-valued joint parameters and actions are continuous motions, so the state space
			is continuous: it has infinitely many states, and a successor function cannot list every
			action applicable in a state.
		</p>
		<p class="note">{STATE_SPACE_DEFINITION[0]}</p>
	</Panel>
{/snippet}

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu
			presets={STATE_SPACE_PRESETS}
			selected={presetId}
			onselect={loadPreset}
			align="end"
		/>
	{/snippet}

	<div class="page">
		<div class="intro">
			<Panel title="Types of agents">
				{#snippet actions()}<CitationTag cite={{ deck: 'search', slide: 2 }} />{/snippet}
				<AgentTypes />
				<div class="question">
					<p class="q">Can a reflex agent be rational?</p>
					<Disclosure>
						<p>
							Yes, when choosing each action from the current percept is enough to maximize the
							expected performance. The reflex vacuum agent is rational in the two-square vacuum
							world scored with one point per clean square per time step
							<CitationTag cite={{ deck: 'agents', slide: 5 }} />.
							{#if vacuumLink}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
								<a href={vacuumLink}>Run it in the vacuum tool</a>.
							{/if}
						</p>
						<p>
							It does not consider the future consequences of its actions, so it cannot plan a
							sequence of actions that reaches a goal: that is what the planning agent and search
							are for.
						</p>
					</Disclosure>
				</div>
				{#snippet footer()}
					<div class="setting">
						<span class="setting-label">Search</span>
						<ul>
							{#each SEARCH_SETTING as line (line)}<li>{line}</li>{/each}
						</ul>
						<CitationTag cite={{ deck: 'search', slide: [3, 4] }} />
					</div>
				{/snippet}
			</Panel>

			<Panel title="Search problem components">
				{#snippet actions()}<CitationTag cite={{ deck: 'search', slide: 5 }} />{/snippet}
				<ol class="slide5">
					{#each SLIDE_5_COMPONENTS as comp (comp.id)}
						<li>
							<span class="comp-name">{COMPONENT_NAMES[comp.id]}</span>
							{#if comp.note}<span class="comp-note">{comp.note}</span>{/if}
						</li>
					{/each}
				</ol>
				<p class="optimal">{OPTIMAL_SOLUTION}</p>
			</Panel>
		</div>

		<section class="examples" aria-label="Example problems">
			<Tabs
				label="Example problem"
				tabs={problemTabs}
				value={cfg.problem}
				onchange={(id) => setProblem(id as ProblemId)}
			>
				{#snippet children(id: string)}
					<div class="tab-body" data-problem={id}>
						{#if cfg.problem === 'vacuum'}
							<div class="problem">
								{@render componentsPanel()}
								{@render successorPanel()}
							</div>
							{@render statePanel()}
							{@render vacuumSizePanel()}
						{:else}
							<div class="problem">
								<div class="col">
									{@render componentsPanel()}
									{#if cfg.problem !== 'robot'}{@render successorPanel()}{/if}
								</div>
								<div class="col">
									{#if cfg.problem === 'romania'}
										{@render statePanel()}
									{:else if cfg.problem === 'puzzle'}
										{@render puzzleBoardsPanel()}
										{@render puzzleSizePanel()}
									{:else}
										{@render robotPanel()}
									{/if}
								</div>
							</div>
						{/if}

						{#if drawn && spec && result && highlight}
							<Panel
								title="Search: basic idea"
								subtitle="{strategyShort(cfg.strategy)} from {spec.start}"
								class="search-panel"
							>
								{#snippet actions()}
									<SegmentedControl
										label="Strategy"
										size="sm"
										options={strategyOptions}
										value={cfg.strategy}
										onchange={setStrategy}
									/>
									<CitationTag cite={{ deck: 'search', slide: [13, 26] }} />
								{/snippet}
								<ol class="idea">
									{#each BASIC_IDEA as line (line)}<li>{line}</li>{/each}
								</ol>
								<div class="run" tabindex="-1" {@attach stepperKeys(stepper)}>
									<StepControls {stepper} ariaLabel="Search steps">
										{#snippet label(i)}{describeBasicStep(result, i, drawn === 'vacuum')}{/snippet}
									</StepControls>
									<div class={['run-views', { wide }]}>
										<div class="run-graph">
											{#if drawn === 'vacuum'}
												<StateGraph
													graph={spec.graph}
													start={spec.start}
													goals={spec.goals}
													{highlight}
													edgeLabel={vacuumEdgeLabel}
													loopSide={vacuumLoopSide}
													nodeBox={vacuumBox}
													nodePicture={vacuumPicture}
													describeNode={vacuumName}
													height={graphHeight}
													legend
													ariaLabel={searchLabel}
												/>
											{:else}
												<StateGraph
													graph={spec.graph}
													start={spec.start}
													goals={spec.goals}
													{highlight}
													nodeShape="square"
													height={graphHeight}
													legend
													ariaLabel={searchLabel}
												/>
											{/if}
										</div>
										<div class="run-side">
											<FrontierView {result} {step} level={3} />
											<p class="note">
												Graph search: a state enters the explored set when it is expanded and is not
												put on the frontier again.
												<CitationTag cite={{ deck: 'search', slide: 36 }} />
											</p>
											{#if searchLink}
												<p class="links">
													<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
													<a href={searchLink}
														><Icon name="arrow-right" size={14} /> Open in the search tool (search tree,
														other strategies)</a
													>
												</p>
											{/if}
										</div>
									</div>
									<p class="keys">
										With focus in the search: <Kbd>←</Kbd>
										<Kbd>→</Kbd> previous and next step, <Kbd>Home</Kbd>
										<Kbd>End</Kbd> first and last step, <Kbd>Space</Kbd> play or pause.
									</p>
								</div>
							</Panel>
						{/if}
					</div>
				{/snippet}
			</Tabs>
		</section>

		<Panel title="Why not build the state space and use Dijkstra’s algorithm?">
			{#snippet actions()}<CitationTag cite={{ deck: 'search', slide: 12 }} />{/snippet}
			<div class="dijkstra">
				<div class="dijkstra-text">
					<p>
						Given the initial state, actions, transition model, goal state, and path cost: how do we
						find the optimal solution? How about building the state space and then using Dijkstra’s
						shortest path algorithm?
					</p>
					<ul>
						<li>
							Complexity of Dijkstra’s algorithm is <span class="math"
								>O(<i>E</i> + <i>V</i> log <i>V</i>)</span
							>, where <i>V</i> is the size of the state space (and <i>E</i> the number of actions).
						</li>
						<li>The state space may be huge: the table lists the example problems.</li>
					</ul>
					<p class="note">
						Uniform-cost search is equivalent to Dijkstra’s algorithm in general
						<CitationTag cite={{ deck: 'uninformed', slide: 40 }} />, but it generates states with
						the successor function only when it expands them, and stops when it takes a goal state
						off the frontier.
					</p>
				</div>
				<SizeTable marked={sizeMark} />
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
	.intro {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	@media (min-width: 1000px) {
		.intro {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
	}

	/* ---------- questions ---------- */
	.question {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		margin-top: var(--space-4);
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

	/* ---------- slide 5 ---------- */
	.slide5 {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding-left: 1.4rem;
	}
	.slide5 li::marker {
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}
	.comp-name {
		font-weight: 600;
	}
	.comp-note {
		display: block;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.optimal {
		margin: var(--space-3) 0 0;
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--accent);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--accent-soft);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.setting {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		font-size: var(--text-sm);
	}
	.setting-label {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.setting ul {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--text-2);
		line-height: 1.5;
	}

	/* ---------- problems ---------- */
	.examples {
		min-width: 0;
	}
	.tab-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}
	.size-body {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4) var(--space-6);
		align-items: start;
	}
	@media (min-width: 900px) {
		.size-body {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		}
	}
	.size-text .question {
		margin-top: 0;
	}
	.examples :global(.tablist) {
		margin-bottom: var(--space-1);
	}
	.problem {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	@media (min-width: 1040px) {
		.problem {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		}
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}
	.lede {
		margin: 0 0 var(--space-3);
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.squares {
		margin-bottom: var(--space-3);
	}
	.note {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.strong-note {
		color: var(--text-2);
	}
	.muted {
		color: var(--text-3);
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.succ-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-3);
	}
	.succ-picture {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}
	.inline-glyph {
		display: inline-block;
		flex: none;
		vertical-align: middle;
		overflow: visible;
	}
	.link-button {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent);
		font: inherit;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.link-button:hover {
		color: var(--accent-hover);
		text-decoration: underline;
	}
	.definition {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.figure {
		padding: 0 var(--space-3) var(--space-3);
	}
	.key {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-4);
		margin-top: var(--space-2);
		padding: 0 2px;
		color: var(--text-2);
		font-size: var(--text-xs);
	}
	.key-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.swatch {
		display: inline-block;
		width: 12px;
		height: 12px;
		border: 1.5px solid var(--node-stroke);
		border-radius: 50%;
		background: var(--node-fill);
	}
	.swatch.current {
		border-color: var(--active);
		background: var(--active-soft);
		border-width: 2px;
	}
	.swatch.successor {
		border-color: var(--info);
		border-width: 2.5px;
	}
	.swatch.goal {
		box-shadow:
			0 0 0 1.5px var(--node-fill),
			0 0 0 3px var(--accept);
	}
	.caption {
		padding: var(--space-3) var(--space-4) var(--space-4);
		border-top: 1px solid var(--border);
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.caption p {
		margin: 0;
	}
	.caption .question {
		margin-top: var(--space-3);
		color: var(--text);
	}
	.boards {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-5);
		justify-content: center;
	}
	.boards figure {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
	}
	.boards figcaption {
		font-family: var(--font-serif);
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin: var(--space-4) 0 0;
		font-size: var(--text-sm);
	}
	.links a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.sizes {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		margin: 0;
		font-size: var(--text-base);
	}
	.size {
		display: contents;
	}
	.size dt,
	.size dd {
		padding: var(--space-2) var(--space-3) var(--space-2) 0;
		border-bottom: 1px solid var(--border);
	}
	.size dt {
		font-weight: 600;
	}
	.size dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	/* ---------- search ---------- */
	.idea {
		columns: 2 18rem;
		column-gap: var(--space-6);
		margin: 0 0 var(--space-4);
		padding-left: 1.3rem;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.idea li {
		break-inside: avoid;
		margin-bottom: var(--space-1);
	}
	.run {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.run:focus {
		outline: none;
	}
	.run-views {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
		align-items: start;
	}
	@media (min-width: 1040px) {
		.run-views {
			grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);
		}
		.run-views.wide {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (min-width: 720px) {
		.run-views.wide .run-side {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 0 var(--space-6);
		}
	}
	.run-graph,
	.run-side {
		min-width: 0;
	}
	.run-side .note {
		margin-top: var(--space-4);
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

	/* ---------- Dijkstra ---------- */
	.dijkstra {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4) var(--space-6);
		align-items: start;
	}
	@media (min-width: 1000px) {
		.dijkstra {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		}
	}
	.dijkstra-text p {
		margin: 0 0 var(--space-2);
	}
	.dijkstra-text ul {
		margin: 0 0 var(--space-2);
		padding-left: 1.2rem;
		line-height: 1.6;
	}
	.dijkstra-text .note {
		margin-top: var(--space-3);
	}
	.math {
		font-family: var(--font-serif);
		white-space: nowrap;
	}
</style>
