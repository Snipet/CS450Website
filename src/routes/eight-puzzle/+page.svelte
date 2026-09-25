<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Badge,
		Button,
		Callout,
		CitationTag,
		Disclosure,
		Icon,
		IconButton,
		Kbd,
		NumberField,
		Panel,
		PresetMenu,
		Select,
		StepControls,
		Stepper,
		TextField,
		Toggle,
		ToolPage,
		stepperKeys,
		type Preset
	} from '$lib/components/ui';
	import { formatCount } from '$lib/components/search/describe';
	import {
		REACHABLE_STATES,
		applyMove,
		blankCell,
		formatBoard,
		manhattanDistance,
		misplacedTiles,
		parseBoard,
		playMoves,
		scramble,
		tileAt,
		tileDistances,
		type Board,
		type PuzzleAction
	} from '$lib/theory/puzzle';
	import type { Diagnostic } from '$lib/theory/diagnostics';
	import { tool } from '$lib/tools/catalog/eight-puzzle';
	import HeuristicChart from '$lib/tools/eight-puzzle/HeuristicChart.svelte';
	import PuzzleBoard from '$lib/tools/eight-puzzle/PuzzleBoard.svelte';
	import SolverTable from '$lib/tools/eight-puzzle/SolverTable.svelte';
	import {
		ACTION_ARROWS,
		manhattanSum,
		moveSentence,
		playbackCaption,
		solvabilityText,
		speakBoard
	} from '$lib/tools/eight-puzzle/describe';
	import { PUZZLE_PRESETS, type PuzzleScenario } from '$lib/tools/eight-puzzle/presets';
	import { SolverQueue, type RunEntries } from '$lib/tools/eight-puzzle/queue';
	import { STATE_SPACE_SIZES, TYPICAL_COSTS } from '$lib/tools/eight-puzzle/reference';
	import {
		IDS_NODE_BUDGET,
		SOLVER_IDS,
		solverSpec,
		type SolverId,
		type SolverRun
	} from '$lib/tools/eight-puzzle/solvers';
	import {
		MAX_SCRAMBLE,
		MAX_SEED,
		MIN_SCRAMBLE,
		completePuzzleState,
		defaultPuzzleState,
		isSavedPuzzleState
	} from '$lib/tools/eight-puzzle/state';
	import { createSolverWorker } from '$lib/tools/eight-puzzle/worker';
	import { syncToHash } from '$lib/url-state';

	const initial = defaultPuzzleState();

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	let start = $state<Board>(initial.start);
	let goal = $state<Board>(initial.goal);
	let scrambleLength = $state(initial.moves);
	let seed = $state(initial.seed);
	let showMisplaced = $state(initial.misplaced);
	let showDistances = $state(initial.distances);

	let startText = $state(formatBoard(initial.start));
	let goalText = $state(formatBoard(initial.goal));
	/** Earlier (start, goal) pairs for Undo. */
	let history = $state<{ start: Board; goal: Board }[]>([]);
	/** Screen-reader announcement for board changes. */
	let announcement = $state('');

	syncToHash(
		() => ({
			start,
			goal,
			moves: scrambleLength,
			seed,
			misplaced: showMisplaced,
			distances: showDistances
		}),
		{
			validate: isSavedPuzzleState,
			onLoad(saved) {
				const s = completePuzzleState(saved);
				setBoards(s.start, s.goal, { remember: false });
				history = [];
				scrambleLength = s.moves;
				seed = s.seed;
				showMisplaced = s.misplaced;
				showDistances = s.distances;
			}
		}
	);

	const presetId = $derived(
		PUZZLE_PRESETS.find((p) => p.value.start === start && p.value.goal === goal)?.id ?? null
	);

	// ------------------------------------------------------------------
	// Boards
	// ------------------------------------------------------------------

	/** Sets the boards; the text fields follow unless the text is being typed. */
	function setBoards(
		nextStart: Board,
		nextGoal: Board,
		opts: { remember?: boolean; keepText?: 'start' | 'goal' } = {}
	) {
		if (nextStart === start && nextGoal === goal) return;
		if (opts.remember !== false) history = [...history.slice(-199), { start, goal }];
		start = nextStart;
		goal = nextGoal;
		if (opts.keepText !== 'start') startText = formatBoard(nextStart);
		if (opts.keepText !== 'goal') goalText = formatBoard(nextGoal);
		queue.clear();
	}

	function move(action: PuzzleAction) {
		const next = applyMove(start, action);
		if (!next) {
			announcement = `The blank cannot move ${action.toLowerCase()}.`;
			return;
		}
		const tile = tileAt(next, blankCell(start));
		setBoards(next, goal);
		const done = next === goal ? ' Goal reached.' : '';
		announcement = `${moveSentence(action, tile)} h1 = ${misplacedTiles(next, goal)}, h2 = ${manhattanDistance(next, goal)}.${done}`;
	}

	function undo() {
		const prev = history.at(-1);
		if (!prev) return;
		history = history.slice(0, -1);
		setBoards(prev.start, prev.goal, { remember: false });
		announcement = `Undone. Start state: ${speakBoard(prev.start)}.`;
	}

	function reset() {
		setBoards(goal, goal);
		announcement = 'Tiles reset to the goal state.';
	}

	function doScramble(nextSeed = seed) {
		seed = nextSeed;
		const board = scramble(goal, scrambleLength, nextSeed);
		setBoards(board, goal);
		announcement = `Scrambled with ${scrambleLength} random moves from the goal (seed ${nextSeed}): ${speakBoard(board)}.`;
	}

	function randomSeed() {
		let next = seed;
		while (next === seed) next = 1 + Math.floor(Math.random() * 9999);
		doScramble(next);
	}

	function loadPreset(preset: Preset<PuzzleScenario>) {
		setBoards(preset.value.start, preset.value.goal);
		announcement = `Loaded ${preset.label}.`;
	}

	const startParse = $derived(parseBoard(startText));
	const goalParse = $derived(parseBoard(goalText));

	function onStartInput() {
		const board = startParse.board;
		if (board && board !== start) setBoards(board, goal, { keepText: 'start' });
	}

	function onGoalInput() {
		const board = goalParse.board;
		if (board && board !== goal) setBoards(start, board, { keepText: 'goal' });
	}

	function fieldError(ds: readonly Diagnostic[]): string | undefined {
		const errors = ds.filter((d) => d.severity === 'error');
		if (!errors.length) return undefined;
		const more = errors.length > 1 ? ` (${errors.length - 1} more)` : '';
		return `${errors[0].message}${more}`;
	}

	// ------------------------------------------------------------------
	// Heuristics and solvability
	// ------------------------------------------------------------------

	const h1 = $derived(misplacedTiles(start, goal));
	const distances = $derived(tileDistances(start, goal));
	const h2 = $derived(manhattanDistance(start, goal));
	const solvability = $derived(solvabilityText(start, goal));

	// ------------------------------------------------------------------
	// Solvers (in a Web Worker)
	// ------------------------------------------------------------------

	let entries = $state.raw<RunEntries>({});
	let usesWorker = $state<boolean | null>(null);

	const queue = new SolverQueue({
		createWorker: createSolverWorker,
		onchange(next) {
			entries = next;
			usesWorker = queue.usesWorker;
		}
	});

	onMount(() => {
		queue.start();
		usesWorker = queue.usesWorker;
		return () => queue.dispose();
	});

	const busy = $derived(
		Object.values(entries).some((e) => e?.status === 'running' || e?.status === 'queued')
	);
	/**
	 * Every solver runs in the worker. Without one, only the light solvers run on
	 * the page, and only on solvable boards (otherwise they explore all 181,440 states).
	 */
	const canRun = (id: SolverId) =>
		usesWorker !== false || (solverSpec(id).light && solvability.solvable);
	const runnable = $derived(SOLVER_IDS.filter((id) => canRun(id)));

	function runSolvers(ids: readonly SolverId[]) {
		queue.run(ids.filter(canRun), start, goal);
	}

	const optimalLength = $derived.by(() => {
		for (const id of SOLVER_IDS) {
			const run = entries[id]?.run;
			if (run?.outcome === 'solved' && solverSpec(id).optimal) return run.length;
		}
		return null;
	});

	// ------------------------------------------------------------------
	// Solution playback
	// ------------------------------------------------------------------

	const PLAY_ORDER: readonly SolverId[] = [
		'astar-h2',
		'bfs',
		'astar-h1',
		'ids',
		'wastar',
		'greedy'
	];
	let chosen = $state<SolverId | null>(null);

	const solved = $derived(
		SOLVER_IDS.filter((id) => entries[id]?.run?.outcome === 'solved').map(
			(id) => entries[id]!.run as SolverRun
		)
	);
	const playRun = $derived(
		solved.find((r) => r.solver === chosen) ??
			PLAY_ORDER.map((id) => solved.find((r) => r.solver === id)).find(Boolean) ??
			null
	);
	const playBoards = $derived(playRun ? playMoves(playRun.start, playRun.actions) : []);
	const playOptions = $derived(
		solved.map((r) => ({
			value: r.solver,
			label: `${solverSpec(r.solver).label}: ${r.length} ${r.length === 1 ? 'move' : 'moves'}`
		}))
	);

	const stepper = new Stepper(() => playBoards.length, { speed: 2 });

	// A different solution starts from its first board.
	let shownRun: SolverRun | null = null;
	$effect(() => {
		const run = playRun;
		untrack(() => {
			if (run === shownRun) return;
			shownRun = run;
			stepper.pause();
			stepper.first();
		});
	});

	const playIndex = $derived(stepper.index);
	const playBoard = $derived(playBoards[playIndex] ?? start);
	const movedTile = $derived(
		playIndex > 0 && playBoards[playIndex - 1]
			? tileAt(playBoard, blankCell(playBoards[playIndex - 1]))
			: null
	);

	const helpId = 'puzzle-board-help';

	const TYPICAL_ROWS = [
		{ label: 'IDS', key: 'ids' },
		{ label: 'A*(h1)', key: 'astarH1' },
		{ label: 'A*(h2)', key: 'astarH2' }
	] as const;
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu presets={PUZZLE_PRESETS} selected={presetId} onselect={loadPreset} align="end" />
	{/snippet}

	<div class="top">
		<Panel title="Board">
			{#snippet actions()}
				<Button size="sm" variant="ghost" disabled={!history.length} onclick={undo}>
					{#snippet icon()}<Icon name="undo" />{/snippet}
					Undo
				</Button>
				<Button size="sm" variant="ghost" disabled={start === goal} onclick={reset}>
					{#snippet icon()}<Icon name="reset" />{/snippet}
					Reset
				</Button>
			{/snippet}

			<div class="boards">
				<figure class="board-fig">
					<PuzzleBoard
						board={start}
						{goal}
						label="Start state"
						size="lg"
						interactive
						onmove={move}
						{showMisplaced}
						{showDistances}
						describedBy={helpId}
					/>
					<figcaption>Start state</figcaption>
				</figure>
				<figure class="board-fig goal-fig">
					<PuzzleBoard board={goal} {goal} label="Goal state" size="sm" />
					<figcaption>Goal state</figcaption>
				</figure>
			</div>
			<p class="help" id={helpId}>
				Click a tile next to the blank to slide it. On the focused board, <Kbd>←</Kbd><Kbd>↑</Kbd
				><Kbd>→</Kbd><Kbd>↓</Kbd> move the blank.
			</p>
			<div class="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>

			<div class="fields">
				<TextField
					label="Start state"
					mono
					bind:value={startText}
					oninput={onStartInput}
					error={fieldError(startParse.diagnostics)}
					spellcheck="false"
				/>
				<TextField
					label="Goal state"
					mono
					bind:value={goalText}
					oninput={onGoalInput}
					error={fieldError(goalParse.diagnostics)}
					spellcheck="false"
				/>
			</div>
			<p class="note">
				Row by row, with <code>_</code> or <code>0</code> for the blank:
				<code>7 2 4 / 5 _ 6 / 8 3 1</code>, <code>724506831</code>, or one row per line.
			</p>

			<div class="scramble">
				<NumberField
					label="Random moves"
					bind:value={scrambleLength}
					min={MIN_SCRAMBLE}
					max={MAX_SCRAMBLE}
				/>
				<NumberField label="Seed" bind:value={seed} min={0} max={MAX_SEED} />
				<div class="scramble-buttons">
					<Button onclick={() => doScramble()}>
						{#snippet icon()}<Icon name="shuffle" />{/snippet}
						Scramble
					</Button>
					<IconButton
						icon="dice"
						variant="secondary"
						label="Scramble with a new random seed"
						onclick={randomSeed}
					/>
				</div>
			</div>
			<p class="note">
				Scramble walks the blank from the goal state for the given number of random moves, never
				undoing the previous move; the same seed gives the same board.
			</p>

			{#snippet footer()}
				<div class="solvability">
					<Badge tone={solvability.solvable ? 'accept' : 'reject'}>
						{solvability.solvable ? 'Solvable' : 'Not solvable'}
					</Badge>
					<p>
						{solvability.text}
						<CitationTag cite={{ deck: 'search', slide: 10 }} />
					</p>
				</div>
			{/snippet}
		</Panel>

		<Panel title="Heuristics">
			<div class="hrows">
				<div class="hrow">
					<div class="hname">
						<span class="sym">h1(n)</span>
						<span class="hdesc">number of misplaced tiles</span>
					</div>
					<div class="hval"><span class="mono">{h1}</span></div>
					<div class="hctl">
						<Toggle bind:checked={showMisplaced}>
							<span class="toggle-label"
								><span class="swatch misplaced" aria-hidden="true"></span>Outline misplaced tiles</span
							>
						</Toggle>
					</div>
				</div>
				<div class="hrow">
					<div class="hname">
						<span class="sym">h2(n)</span>
						<span class="hdesc">total Manhattan distance</span>
					</div>
					<div class="hval"><span class="mono">{manhattanSum(distances)}</span></div>
					<div class="hctl">
						<Toggle bind:checked={showDistances}>
							<span class="toggle-label"
								><span class="swatch badge" aria-hidden="true">2</span>Show each tile’s distance</span
							>
						</Toggle>
					</div>
				</div>
				<div class="hrow">
					<div class="hname">
						<span class="sym">max(h1, h2)</span>
						<span class="hdesc">combining heuristics</span>
					</div>
					<div class="hval">
						<span class="mono">{Math.max(h1, h2)}</span>
					</div>
					<div class="hctl"><CitationTag cite={{ deck: 'informed', slide: 37 }} /></div>
				</div>
				<div class="hrow">
					<div class="hname">
						<span class="sym">h*(n)</span>
						<span class="hdesc">true cost: moves in an optimal solution</span>
					</div>
					<div class="hval">
						{#if optimalLength !== null}
							<span class="mono">{optimalLength}</span>
						{:else if !solvability.solvable}
							<span class="muted">none (the goal cannot be reached)</span>
						{:else}
							<span class="muted">run BFS or A* below</span>
						{/if}
					</div>
				</div>
			</div>
			<p class="note">
				Tiles 1–8 in order; the blank is not counted. The terms of h2 are the numbers of squares
				each tile is from its goal square. <CitationTag cite={{ deck: 'informed', slide: 32 }} />
			</p>

			<div class="notes">
				<div class="notebox">
					<h3>Relaxed problems</h3>
					<p>
						If a tile can move anywhere, h1(n) gives the shortest solution. If a tile can move to
						any adjacent square, h2(n) gives the shortest solution. The cost of an optimal solution
						to a relaxed problem is an admissible heuristic for the original problem.
					</p>
					<CitationTag cite={{ deck: 'informed', slide: 33 }} />
				</div>
				<div class="notebox">
					<h3>Pattern databases</h3>
					<p>
						h3(n): the cost of getting a subset of tiles (say, 1, 2, 3, 4) into their correct
						positions. The exact solution cost for every possible subproblem instance can be
						precomputed and saved in a pattern database.
					</p>
					<CitationTag cite={{ deck: 'informed', slide: 34 }} />
				</div>
			</div>

			<div class="questions">
				<div class="question">
					<p class="q">Are h1 and h2 admissible?</p>
					<CitationTag cite={{ deck: 'informed', slide: 32 }} />
					<Disclosure>
						<p>
							Yes. Every misplaced tile has to move at least once, so h1 never overestimates. Each
							move slides one tile one square, so every tile needs at least its Manhattan distance
							in moves, and h2 never overestimates either. Both are exact solution costs of relaxed
							problems (slide 33).
						</p>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">Which one is better for search?</p>
					<CitationTag cite={{ deck: 'informed', slide: 35 }} />
					<Disclosure>
						<p>
							h2. Both are admissible and h2(n) ≥ h1(n) for every n, so h2 dominates h1. A* expands
							every node with h(n) &lt; C* − g(n), so with h1 it expands more nodes. Compare the A*
							(h1) and A* (h2) rows under Solvers.
						</p>
					</Disclosure>
				</div>
			</div>
		</Panel>
	</div>

	<Panel title="Solvers" subtitle="from the start state to the goal state">
		{#snippet actions()}
			{#if busy}
				<Button size="sm" onclick={() => queue.cancel()}>
					{#snippet icon()}<Icon name="x" />{/snippet}
					Cancel
				</Button>
			{/if}
			<Button
				size="sm"
				variant="primary"
				disabled={busy || !runnable.length}
				onclick={() => runSolvers(runnable)}
			>
				{#snippet icon()}<Icon name="play" />{/snippet}
				Run all
			</Button>
		{/snippet}

		{#if !solvability.solvable}
			<div class="callout">
				<Callout tone="warn">
					The goal cannot be reached from this board. The graph searches explore all {formatCount(
						REACHABLE_STATES
					)} states reachable from the start and stop with an empty frontier; IDS stops at its node budget.
				</Callout>
			</div>
		{/if}
		{#if usesWorker === false}
			<div class="callout">
				<Callout tone="info">
					Web Workers are unavailable, so only greedy best-first, A* (h2) and weighted A* run, on
					the page itself, and only on boards that can reach the goal.
				</Callout>
			</div>
		{/if}

		<div class="solver-grid">
			<SolverTable {entries} {canRun} onrun={(id) => runSolvers([id])} {optimalLength} />

			<aside class="typical" aria-labelledby="typical-title">
				<h3 id="typical-title">Typical search costs</h3>
				<p class="typical-sub">
					Average number of nodes expanded for different solution depths, as given on the slide.
				</p>
				<table>
					<thead>
						<tr>
							<th scope="col"><span class="visually-hidden">Strategy</span></th>
							{#each TYPICAL_COSTS as row (row.depth)}
								<th scope="col" class="num"><i>d</i> = {row.depth}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each TYPICAL_ROWS as strategy (strategy.key)}
							<tr>
								<th scope="row">{strategy.label}</th>
								{#each TYPICAL_COSTS as row (row.depth)}
									<td class="num">{row[strategy.key]}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
				<CitationTag cite={{ deck: 'informed', slide: 36 }} />
			</aside>
		</div>

		{#snippet footer()}
			<p class="foot-note">
				BFS, greedy best-first and the A* runs use graph search: an explored set plus the frontier
				check <CitationTag cite={{ deck: 'search', slide: 36 }} />. IDS is tree search that drops a
				child whose state is already on its path <CitationTag
					cite={{ deck: 'uninformed', slide: 32 }}
				/>; it stops after {formatCount(IDS_NODE_BUDGET)} generated nodes. Nodes generated include the
				root and children that were not added; max frontier is the largest frontier size. Solvers run
				in a background worker one after another; Cancel stops them.
			</p>
		{/snippet}
	</Panel>

	<Panel title="Solution playback">
		{#if playRun}
			<div class="playback" tabindex="-1" {@attach stepperKeys(stepper)}>
				<div class="play-head">
					<Select
						label="Solution"
						inline
						size="sm"
						options={playOptions}
						value={playRun.solver}
						onchange={(v) => (chosen = v)}
					/>
				</div>
				<div class="play-body">
					<figure class="board-fig">
						<PuzzleBoard
							board={playBoard}
							{goal}
							label="Board after move {playIndex}"
							size="lg"
							{showMisplaced}
							{showDistances}
							moved={movedTile}
						/>
					</figure>
					<div class="play-side">
						<StepControls {stepper} ariaLabel="Solution steps" noun="Board">
							{#snippet label(i)}
								{playbackCaption(playBoards, playRun?.actions ?? [], i, goal)}
							{/snippet}
						</StepControls>
						<ol class="moves" aria-label="Moves of the blank">
							{#each playRun.actions as action, k (k)}
								<li>
									<button
										type="button"
										tabindex="-1"
										class={['chip', { current: k === playIndex - 1, past: k < playIndex - 1 }]}
										title="Move {k + 1}: blank {action}"
										aria-label="Move {k + 1}: blank {action}"
										onclick={() => stepper.set(k + 1)}>{ACTION_ARROWS[action]}</button
									>
								</li>
							{/each}
						</ol>
						<HeuristicChart
							boards={playBoards}
							{goal}
							index={playIndex}
							optimal={solverSpec(playRun.solver).optimal}
							onselect={(i) => stepper.set(i)}
						/>
					</div>
				</div>
			</div>
		{:else}
			<div class="empty">
				<p>Run a solver to step through its solution here.</p>
				<Button
					variant="primary"
					size="sm"
					disabled={busy || !solvability.solvable}
					onclick={() => runSolvers(['astar-h2'])}
				>
					{#snippet icon()}<Icon name="play" />{/snippet}
					Run A* (h2)
				</Button>
			</div>
		{/if}
	</Panel>

	<Panel title="State space">
		<div class="space">
			<div>
				<table class="sizes">
					<thead>
						<tr>
							<th scope="col">Puzzle</th>
							<th scope="col" class="num">States</th>
						</tr>
					</thead>
					<tbody>
						{#each STATE_SPACE_SIZES as row (row.puzzle)}
							<tr>
								<th scope="row">{row.puzzle}</th>
								<td class="num"
									>{row.states}{#if row.note}&nbsp;<span class="muted">({row.note})</span>{/if}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="note">
					Actions: move the blank left, right, up, or down. Path cost: 1 per move. Finding the
					optimal solution of the n-puzzle is NP-hard. <CitationTag
						cite={{ deck: 'search', slide: 10 }}
					/>
				</p>
			</div>
			<div class="parity">
				<h3>Why 9!/2</h3>
				<p>
					Read the tiles row by row and skip the blank. An inversion is a pair of tiles in the wrong
					order. Moving the blank left or right keeps the order; moving it up or down carries one
					tile past two others, which changes the count by −2, 0, or +2. So no move changes the
					parity of the count, and the 9! = 362,880 arrangements split into two halves of {formatCount(
						REACHABLE_STATES
					)} that cannot reach each other.
				</p>
			</div>
		</div>
	</Panel>
</ToolPage>

<style>
	.top {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	@media (min-width: 1000px) {
		.top {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}
	}
	.boards {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-4) var(--space-6);
	}
	@media (max-width: 560px) {
		.boards,
		.play-body {
			justify-content: center;
		}
	}
	.board-fig {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
	}
	figcaption {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.help {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		line-height: 1.7;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	.note code {
		white-space: nowrap;
	}
	.note {
		margin: var(--space-2) 0 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.scramble {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	.scramble-buttons {
		display: flex;
		gap: var(--space-2);
	}
	.solvability {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}
	.solvability p {
		min-width: 0;
		margin: 0;
		color: var(--text-2);
		line-height: 1.55;
	}
	.solvability :global(.badge) {
		flex: none;
		margin-top: 1px;
	}

	.hrows {
		display: flex;
		flex-direction: column;
	}
	.hrow {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--border);
	}
	.hrow:first-child {
		padding-top: 0;
	}
	.hctl {
		display: flex;
		flex-basis: 100%;
		min-width: 0;
	}
	.hname {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 var(--space-2);
		min-width: 0;
	}
	.sym {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-style: italic;
		font-weight: 600;
	}
	.hdesc {
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.hval {
		margin-left: auto;
		font-size: var(--text-lg);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.hval .muted {
		font-size: var(--text-sm);
	}
	.toggle-label {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}
	.swatch {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: 16px;
		height: 16px;
	}
	.swatch.misplaced {
		border: 2px solid var(--heuristic);
		border-radius: 4px;
		background: var(--heuristic-soft);
	}
	.swatch.badge {
		border-radius: 8px;
		background: var(--heuristic);
		color: var(--surface);
		font-size: 10px;
		font-weight: 700;
	}
	.notes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	.notebox {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.notebox h3,
	.parity h3,
	.typical h3 {
		margin: 0;
		font-size: var(--text-base);
	}
	.notebox p {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.questions {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-4);
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

	.callout {
		margin-bottom: var(--space-4);
	}
	.solver-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	@media (min-width: 1100px) {
		.solver-grid {
			grid-template-columns: minmax(0, 1fr) 19rem;
			align-items: start;
		}
	}
	.typical {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.typical-sub {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.5;
	}
	.typical table {
		width: 100%;
		font-size: var(--text-sm);
	}
	.typical th,
	.typical td,
	.sizes th,
	.sizes td {
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
	}
	.typical th:first-child,
	.sizes th:first-child {
		padding-left: 0;
	}
	.typical thead th,
	.sizes thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.typical tbody th {
		font-weight: 500;
		white-space: nowrap;
	}
	.num {
		text-align: right !important;
		font-variant-numeric: tabular-nums;
	}
	.typical td.num {
		white-space: nowrap;
	}
	.foot-note {
		margin: 0;
		line-height: 1.6;
	}

	.playback {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.playback:focus {
		outline: none;
	}
	.play-head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
	.play-body {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--space-4) var(--space-5);
	}
	.play-side {
		display: flex;
		flex: 1 1 18rem;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.moves {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.chip {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text-2);
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.chip.past {
		background: var(--surface-2);
		color: var(--text-3);
	}
	.chip.current {
		border-color: var(--active);
		background: var(--active-soft);
		color: var(--text);
		font-weight: 700;
	}
	.chip:hover {
		border-color: var(--accent);
	}
	.empty {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}
	.empty p {
		margin: 0;
		color: var(--text-2);
	}

	.space {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	@media (min-width: 900px) {
		.space {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
	.sizes {
		width: 100%;
		max-width: 26rem;
		font-size: var(--text-sm);
	}
	.sizes tbody th {
		font-weight: 500;
	}
	.parity {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.parity p {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.6;
	}
	.muted {
		color: var(--text-3);
	}
</style>
