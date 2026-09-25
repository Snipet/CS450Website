<script lang="ts">
	import { untrack } from 'svelte';
	import {
		Button,
		Callout,
		CitationTag,
		Disclosure,
		Icon,
		Kbd,
		NumberField,
		Panel,
		PresetMenu,
		SegmentedControl,
		Select,
		StepControls,
		Stepper,
		Toggle,
		ToolPage,
		stepperKeys,
		type Preset
	} from '$lib/components/ui';
	import { strategyName, strategyShort } from '$lib/components/search/describe';
	import {
		DEFAULT_SEEDS,
		GRID_HEURISTICS,
		GRID_PRESETS,
		GRID_SIZES,
		cellLabel,
		clearWalls,
		concaveGrid,
		decodeGrid,
		encodeGrid,
		gridPreset,
		gridProblem,
		gridSearchLimits,
		gridSizeId,
		isAdmissible,
		optimalCost,
		resizeGrid,
		wallCount,
		type Grid,
		type GridHeuristic,
		type GridPresetId,
		type GridSizeId
	} from '$lib/theory/grid';
	import { search, usesHeuristic, type SearchResult } from '$lib/theory/search';
	import { tool } from '$lib/tools/catalog/grid';
	import GridLegend from '$lib/tools/grid/GridLegend.svelte';
	import RunCard from '$lib/tools/grid/RunCard.svelte';
	import { describeGridStep, pathSummary, shortGridStep } from '$lib/tools/grid/describe';
	import { GRID_TOOL_PRESETS, type GridScenario } from '$lib/tools/grid/presets';
	import {
		GRID_ALGORITHMS,
		MAX_WEIGHT,
		MIN_WEIGHT,
		completeGridState,
		defaultGridState,
		isSavedGridState,
		type GridAlgorithm
	} from '$lib/tools/grid/state';
	import { cellLayers, runStats, runTimeline, type RunTimeline } from '$lib/tools/grid/view';
	import { syncToHash } from '$lib/url-state';

	const initial = defaultGridState();

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	let grid = $state.raw<Grid>(concaveGrid());
	let algorithm = $state<GridAlgorithm>(initial.algorithm);
	let compare = $state<GridAlgorithm | null>(initial.compare);
	let diagonal = $state(initial.diagonal);
	let heuristic = $state<GridHeuristic>(initial.heuristic);
	let weight = $state(initial.weight);
	let shade = $state(initial.shade);

	/** The preset layout the grid still matches (rebuilt at a new size), or null once edited. */
	let source = $state<{ layout: GridPresetId; seed?: number } | null>({ layout: 'concave' });
	let presetId = $state<string | null>('astar-concave');

	const encoded = $derived(encodeGrid(grid));

	// ------------------------------------------------------------------
	// Searches (recomputed only when the grid or settings change)
	// ------------------------------------------------------------------

	const problem = $derived(gridProblem(grid, { diagonal, heuristic }));
	const limits = $derived(gridSearchLimits(grid));
	const runOf = (strategy: GridAlgorithm): SearchResult =>
		search(problem, { strategy, mode: 'graph', record: 'nodes', weight, ...limits });
	const runA = $derived(runOf(algorithm));
	const runB = $derived(compare ? runOf(compare) : null);
	const best = $derived(optimalCost(grid, { diagonal }));
	const cells = $derived(grid.width * grid.height);
	const timelineA = $derived(runTimeline(runA, cells));
	const timelineB = $derived(runB ? runTimeline(runB, cells) : null);

	// Both searches step together by the number of nodes taken off the frontier.
	const stepper = new Stepper(() => Math.max(timelineA.steps, timelineB?.steps ?? 0), {
		speed: 16
	});

	syncToHash(() => ({ grid: encoded, algorithm, compare, diagonal, heuristic, weight, shade }), {
		validate: isSavedGridState,
		onLoad(saved) {
			const s = completeGridState(saved);
			const decoded = decodeGrid(s.grid).grid;
			if (decoded) grid = decoded;
			algorithm = s.algorithm;
			compare = s.compare;
			diagonal = s.diagonal;
			heuristic = s.heuristic;
			weight = s.weight;
			shade = s.shade;
			source = null;
			presetId = null;
			stepper.last();
		}
	});

	// Stay on the last step when the searches change while it is shown.
	let previousTotal = 0;
	$effect(() => {
		const total = stepper.total;
		untrack(() => {
			if (stepper.index >= previousTotal - 1) stepper.last();
			previousTotal = total;
		});
	});

	const index = $derived(stepper.index);
	const buckets = $derived(shade ? 5 : 1);
	const layersA = $derived(cellLayers(timelineA, index, buckets));
	const layersB = $derived(timelineB ? cellLayers(timelineB, index, buckets) : null);
	const statsA = $derived(runStats(runA, timelineA, index));
	const statsB = $derived(runB && timelineB ? runStats(runB, timelineB, index) : null);

	// ------------------------------------------------------------------
	// Controls
	// ------------------------------------------------------------------

	const informed = $derived(
		usesHeuristic(algorithm) || (compare !== null && usesHeuristic(compare))
	);
	const weighted = $derived(algorithm === 'wastar' || compare === 'wastar');
	const sizeId = $derived(gridSizeId(grid.width, grid.height));
	const randomSource = $derived(
		source !== null && GRID_PRESETS.some((p) => p.id === source?.layout && p.random)
	);

	const algorithmOptions = GRID_ALGORITHMS.map((a) => ({ value: a, label: strategyName(a) }));
	const compareOptions: { value: GridAlgorithm | 'none'; label: string }[] = [
		{ value: 'none', label: 'None' },
		...algorithmOptions
	];
	const HEURISTIC_NAMES: Record<GridHeuristic, string> = {
		manhattan: 'Manhattan distance',
		euclidean: 'Euclidean distance',
		octile: 'Octile distance',
		chebyshev: 'Chebyshev distance',
		zero: 'Zero (h = 0)'
	};
	const FORMULAS: Record<GridHeuristic, string> = {
		manhattan: '|dx| + |dy|',
		euclidean: '√(dx² + dy²)',
		octile: 'max(|dx|, |dy|) + (√2 − 1)·min(|dx|, |dy|)',
		chebyshev: 'max(|dx|, |dy|)',
		zero: '0'
	};
	const EXACT: Partial<Record<GridHeuristic, string>> = {
		manhattan: '4-connected',
		octile: '8-connected'
	};
	const heuristicOptions = GRID_HEURISTICS.map((h) => ({ value: h, label: HEURISTIC_NAMES[h] }));
	const moveOptions = [
		{ value: false, label: '4-connected', title: 'Up, Right, Down, Left (cost 1)' },
		{ value: true, label: '8-connected', title: 'Plus diagonal moves (cost √2)' }
	];
	const sizeOptions: { value: GridSizeId | 'custom'; label: string; title: string }[] = (
		Object.entries(GRID_SIZES) as [GridSizeId, { width: number; height: number }][]
	).map(([id, s]) => ({
		value: id,
		label: id[0].toUpperCase() + id.slice(1),
		title: `${s.width} × ${s.height}`
	}));

	/** A setting or the grid changed by hand: no preset is loaded any more. */
	function touched() {
		presetId = null;
	}

	function edit(next: Grid) {
		if (next === grid) return;
		grid = next;
		source = null;
		touched();
	}

	function setSize(id: GridSizeId | 'custom') {
		if (id === 'custom') return;
		const { width, height } = GRID_SIZES[id];
		grid = source
			? gridPreset(source.layout, width, height, source.seed)
			: resizeGrid(grid, width, height);
	}

	function newLayout() {
		if (!source || (source.layout !== 'maze' && source.layout !== 'scattered')) return;
		const seed = (source.seed ?? DEFAULT_SEEDS[source.layout]) + 1;
		source = { layout: source.layout, seed };
		grid = gridPreset(source.layout, grid.width, grid.height, seed);
		touched();
	}

	function loadPreset(preset: Preset<GridScenario>) {
		const v = preset.value;
		const size = GRID_SIZES[sizeId ?? 'medium'];
		stepper.pause();
		grid = gridPreset(v.layout, size.width, size.height);
		source = { layout: v.layout };
		algorithm = v.algorithm;
		compare = v.compare;
		diagonal = v.diagonal;
		heuristic = v.heuristic;
		weight = v.weight;
		presetId = preset.id;
		stepper.last();
	}

	// ------------------------------------------------------------------
	// Text
	// ------------------------------------------------------------------

	function figureLabel(
		strategy: GridAlgorithm,
		result: SearchResult,
		timeline: RunTimeline,
		stats: ReturnType<typeof runStats>
	): string {
		const at = Math.min(index, timeline.steps - 1);
		const head = `${strategyName(strategy)} on the ${grid.width} × ${grid.height} grid, start ${cellLabel(grid, grid.start)}, goal ${cellLabel(grid, grid.goal)}, ${wallCount(grid)} walls.`;
		const now = `After step ${at + 1} of ${timeline.steps}: ${stats.expanded} cells expanded, ${stats.frontier} on the frontier.`;
		const end = stats.path
			? ` Path found: ${pathSummary(stats.path.moves, stats.path.cost)}.`
			: stats.failed && result.failure === 'exhausted'
				? ' No path to the goal.'
				: '';
		return `${head} ${now}${end}`;
	}

	const inadmissible = $derived(informed && !isAdmissible(heuristic, diagonal));
	const boardHeight = $derived(runB ? 460 : 600);
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu presets={GRID_TOOL_PRESETS} selected={presetId} onselect={loadPreset} align="end" />
	{/snippet}

	<Panel title="Search">
		<div class="controls">
			<div class="control algo">
				<Select
					label="Algorithm"
					options={algorithmOptions}
					value={algorithm}
					onchange={(v) => {
						algorithm = v;
						touched();
					}}
				/>
			</div>
			<div class="control algo">
				<Select
					label="Compare with"
					options={compareOptions}
					value={compare ?? 'none'}
					onchange={(v) => {
						compare = v === 'none' ? null : v;
						touched();
					}}
				/>
			</div>
			<div class="control">
				<span class="control-label" aria-hidden="true">Moves</span>
				<SegmentedControl
					label="Moves"
					options={moveOptions}
					value={diagonal}
					onchange={(v) => {
						diagonal = v;
						touched();
					}}
				/>
			</div>
			<div class="control heuristic">
				<Select
					label="Heuristic h(n)"
					options={heuristicOptions}
					value={heuristic}
					disabled={!informed}
					onchange={(v) => {
						heuristic = v;
						touched();
					}}
				/>
			</div>
			<div class="control">
				<NumberField
					label="Weight α"
					value={weight}
					min={MIN_WEIGHT}
					max={MAX_WEIGHT}
					step={0.5}
					disabled={!weighted}
					onchange={(v) => {
						weight = v;
						touched();
					}}
				/>
			</div>
		</div>
		<p class="note">
			Grids use graph search: a cell enters the explored set when it is expanded and is never added
			to the frontier again; a cheaper path to a cell already on a priority-queue frontier replaces
			it. <CitationTag cite={{ deck: 'search', slide: 36 }} />
		</p>
		{#if inadmissible}
			<div class="warn">
				<Callout tone="warn">
					With diagonal moves the Manhattan distance counts a diagonal step (cost √2) as 2, so it
					can overestimate the true cost: it is not admissible, and A* may return a costlier path.
				</Callout>
			</div>
		{/if}
	</Panel>

	<Panel title="Grid" subtitle="{grid.width} × {grid.height}">
		{#snippet actions()}
			<SegmentedControl
				label="Grid size"
				size="sm"
				options={sizeOptions}
				value={sizeId ?? 'custom'}
				onchange={setSize}
			/>
			{#if randomSource}
				<Button size="sm" variant="ghost" onclick={newLayout}>
					{#snippet icon()}<Icon name="shuffle" />{/snippet}
					New {source?.layout === 'maze' ? 'maze' : 'layout'}
				</Button>
			{/if}
			<Button
				size="sm"
				variant="ghost"
				disabled={!grid.walls.some(Boolean)}
				onclick={() => edit(clearWalls(grid))}
			>
				{#snippet icon()}<Icon name="eraser" />{/snippet}
				Clear walls
			</Button>
		{/snippet}

		<div class="board-body" tabindex="-1" {@attach stepperKeys(stepper)}>
			<StepControls {stepper} speeds={[0.25, 0.5, 1, 2, 4, 8]} ariaLabel="Search steps">
				{#snippet label(i)}
					{#if runB && compare}
						<span class="line"
							><strong>{strategyShort(algorithm)}</strong> {shortGridStep(runA, i)}.</span
						>
						<span class="line"
							><strong>{strategyShort(compare)}</strong> {shortGridStep(runB, i)}.</span
						>
					{:else}
						{describeGridStep(runA, Math.min(i, runA.steps.length - 1))}
					{/if}
				{/snippet}
			</StepControls>

			{#if best === null}
				<Callout tone="error">
					Walls cut the goal off from the start: every search ends with an empty frontier.
				</Callout>
			{/if}

			<div class={['runs', { pair: runB !== null }]}>
				<RunCard
					strategy={algorithm}
					{weight}
					{grid}
					layers={layersA}
					stats={statsA}
					optimal={best}
					label={figureLabel(algorithm, runA, timelineA, statsA)}
					editable
					onedit={edit}
					helpId="grid-help"
					maxHeight={boardHeight}
				/>
				{#if runB && compare && layersB && statsB && timelineB}
					<RunCard
						strategy={compare}
						{weight}
						{grid}
						layers={layersB}
						stats={statsB}
						optimal={best}
						label={figureLabel(compare, runB, timelineB, statsB)}
						editable
						onedit={edit}
						helpId="grid-help"
						maxHeight={boardHeight}
					/>
				{/if}
			</div>
		</div>

		{#snippet footer()}
			<div class="foot">
				<GridLegend {shade} />
				<Toggle label="Shade by expansion order" bind:checked={shade} />
			</div>
			<p class="help" id="grid-help">
				Click or drag on open cells to draw walls, on walls to erase them; drag the start or goal to
				move it. On a focused grid: <Kbd>←</Kbd><Kbd>↑</Kbd><Kbd>→</Kbd><Kbd>↓</Kbd> move the cursor,
				<Kbd>Space</Kbd> or <Kbd>Enter</Kbd> toggles a wall, <Kbd>S</Kbd> and <Kbd>G</Kbd> place the start
				and goal.
			</p>
		{/snippet}
	</Panel>

	<div class="reference">
		<Panel title="Heuristics">
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th scope="col">Heuristic</th>
							<th scope="col" class="formula-col">h(n)</th>
							<th scope="col">Admissible with</th>
						</tr>
					</thead>
					<tbody>
						{#each GRID_HEURISTICS as h (h)}
							<tr class:current={informed && h === heuristic}>
								<th scope="row">
									{HEURISTIC_NAMES[h]}
									<span class="formula formula-inline">h(n) = {FORMULAS[h]}</span>
								</th>
								<td class="formula formula-col">{FORMULAS[h]}</td>
								<td>
									{#if isAdmissible(h, true)}4- and 8-connected moves{:else}4-connected moves only{/if}
									{#if EXACT[h]}<span class="muted">(exact without walls, {EXACT[h]})</span>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="note">
				dx and dy count the columns and rows between a cell and the goal. An admissible heuristic
				never overestimates the true cost h*(n) <CitationTag
					cite={{ deck: 'informed', slide: 25 }}
				/>. Weighted A* orders the frontier by g(n) + α·h(n); with an admissible h its path costs at
				most α times the optimal cost
				<CitationTag cite={{ deck: 'informed', slide: 38 }} />. With h = 0, A* is uniform-cost
				search.
			</p>
		</Panel>

		<Panel title="Questions from the slides">
			<div class="questions">
				<div class="question">
					<p class="q">When is UCS equivalent to BFS?</p>
					<CitationTag cite={{ deck: 'uninformed', slide: 45 }} />
					<Disclosure>
						<p>
							When all step costs are equal. With 4-connected moves every step costs 1, so
							uniform-cost search takes cells off the frontier in the same order as breadth-first
							search (ties go to the node added first) and returns a path of the same cost. With
							diagonal moves (cost √2) they differ: see the preset “BFS vs. UCS with diagonal
							moves”.
						</p>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">How can we fix the greedy problem?</p>
					<CitationTag cite={{ deck: 'informed', slide: 15 }} />
					<Disclosure>
						<p>
							Keep track of the distance already traveled, g(n), in addition to the estimated
							distance remaining, h(n): A* orders the frontier by f(n) = g(n) + h(n)
							<CitationTag cite={{ deck: 'informed', slide: 16 }} />. The preset “Greedy best-first
							vs. A*” runs both on the concave obstacle.
						</p>
					</Disclosure>
				</div>
			</div>
		</Panel>
	</div>
</ToolPage>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3) var(--space-4);
	}
	.control {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.control.algo {
		flex: 1 1 12rem;
		max-width: 16rem;
	}
	.control.heuristic {
		flex: 1 1 11rem;
		max-width: 14rem;
	}
	.control-label {
		color: var(--text-2);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.note {
		margin: var(--space-3) 0 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.warn {
		margin-top: var(--space-3);
	}
	.board-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.board-body:focus {
		outline: none;
	}
	.line {
		display: block;
	}
	.runs {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	@media (min-width: 900px) {
		.runs.pair {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3) var(--space-5);
	}
	.help {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-sm);
		line-height: 1.7;
	}
	.reference {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	@media (min-width: 1000px) {
		.reference {
			grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		}
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: var(--space-2) var(--space-3) var(--space-2) 0;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
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
		white-space: nowrap;
	}
	tr.current th,
	tr.current td {
		background: var(--accent-soft);
	}
	tr.current th {
		box-shadow: inset 3px 0 var(--accent);
		padding-left: var(--space-3);
	}
	.formula {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-variant-ligatures: none;
	}
	.formula-inline {
		display: none;
	}
	@media (max-width: 560px) {
		.formula-col {
			display: none;
		}
		.formula-inline {
			display: block;
			margin-top: 2px;
			color: var(--text-2);
			font-weight: 400;
		}
		tbody th {
			white-space: normal;
		}
	}
	.muted {
		display: block;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.questions {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.question {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
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
</style>
