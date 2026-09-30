<script lang="ts">
	import { tick } from 'svelte';
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
		TextField,
		Toggle,
		ToolPage,
		stepperKeys,
		type Preset
	} from '$lib/components/ui';
	import { GameTree } from '$lib/components/games';
	import { hasErrors } from '$lib/theory/diagnostics';
	import {
		maxRandomDepth,
		parseGameTree,
		parsePlayerOrder,
		playerOrder,
		treeFacts,
		withPlayerOrder,
		withRootPlayer,
		type Ordering,
		type Player
	} from '$lib/theory/games';
	import { tool } from '$lib/tools/catalog/minimax';
	import CodePanel from '$lib/tools/minimax/CodePanel.svelte';
	import CountsTable from '$lib/tools/minimax/CountsTable.svelte';
	import TreeEditor from '$lib/tools/minimax/TreeEditor.svelte';
	import { NOTES, QUESTIONS } from '$lib/tools/minimax/content';
	import { describeResult, describeStep } from '$lib/tools/minimax/describe';
	import { MINIMAX_PRESETS, matchPreset, randomTreeText } from '$lib/tools/minimax/presets';
	import { codeFor, lineOf } from '$lib/tools/minimax/pseudocode';
	import {
		MAX_BRANCHING,
		MAX_SEED,
		MIN_BRANCHING,
		VALUE_LIMIT,
		completeMinimaxState,
		defaultMinimaxState,
		isSavedMinimaxState,
		wholeIn,
		type MinimaxScenario
	} from '$lib/tools/minimax/state';
	import { countsTable, runCounts, runGame, viewAt, type Algorithm } from '$lib/tools/minimax/view';
	import { syncToHash } from '$lib/url-state';

	const initial = defaultMinimaxState();

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	/** The tree text as typed. */
	let text = $state(initial.tree);
	/** The last tree text without errors: what the views show. */
	let validText = $state(initial.tree);
	let algorithm = $state<Algorithm>(initial.algorithm);
	let ordering = $state<Ordering>(initial.ordering);
	let cutoffSetting = $state<number | null>(initial.cutoff);
	let showActions = $state(initial.actions);
	let gen = $state({
		branching: initial.branching,
		depth: initial.depth,
		seed: initial.seed,
		min: initial.min,
		max: initial.max
	});

	const parsed = $derived(parseGameTree(text));
	const textHasErrors = $derived(hasErrors(parsed.diagnostics));
	// Depends on the valid text only, so typing errors does not rerun the search.
	const tree = $derived(parseGameTree(validText).tree!);
	const facts = $derived(treeFacts(tree));
	/** The cutoff in use: only depths where every internal node has an evaluation value. */
	const cutoff = $derived(
		cutoffSetting !== null && facts.cutoffDepths.includes(cutoffSetting) ? cutoffSetting : null
	);

	// ------------------------------------------------------------------
	// The run (recomputed when the tree or a setting changes, not per step)
	// ------------------------------------------------------------------

	const run = $derived(runGame(tree, { algorithm, ordering, cutoff }));
	const stepper = new Stepper(() => run.result.steps.length, { speed: 1.5 });
	const step = $derived(stepper.index);
	const view = $derived(viewAt(run, step));
	const listing = $derived(codeFor(run));
	const line = $derived(lineOf(run, run.result.steps[step]));
	const order = $derived(run.kind === 'maxn' ? run.result.order : playerOrder(tree));
	const counts = $derived(runCounts(run));
	const table = $derived(countsTable(tree, cutoff));

	syncToHash(
		() => ({
			tree: validText,
			algorithm,
			ordering,
			cutoff: cutoffSetting,
			actions: showActions,
			...gen,
			step
		}),
		{
			validate: isSavedMinimaxState,
			onLoad(saved) {
				const s = completeMinimaxState(saved);
				load(s, s.step);
			}
		}
	);

	const scenario = $derived<MinimaxScenario>({
		tree: validText,
		algorithm,
		ordering,
		cutoff: cutoffSetting,
		actions: showActions,
		...gen
	});
	const presetId = $derived(matchPreset(scenario, tree.tuples)?.id ?? null);
	const preset = $derived(MINIMAX_PRESETS.find((p) => p.id === presetId) ?? null);

	function load(s: MinimaxScenario, at = 0) {
		stepper.pause();
		text = s.tree;
		validText = s.tree;
		algorithm = s.algorithm;
		ordering = s.ordering;
		cutoffSetting = s.cutoff;
		showActions = s.actions;
		gen = { branching: s.branching, depth: s.depth, seed: s.seed, min: s.min, max: s.max };
		stepper.set(at);
	}

	function loadPreset(p: Preset<MinimaxScenario>) {
		load(p.value, 0);
	}

	async function openPreset(id: string) {
		const p = MINIMAX_PRESETS.find((x) => x.id === id);
		if (!p) return;
		loadPreset(p);
		await tick();
		revealSteps();
	}

	/** Applies a change; a run shown at its last step stays at its last step. */
	function change(apply: () => void) {
		const atEnd = stepper.total > 1 && stepper.atEnd;
		apply();
		if (atEnd) stepper.last();
	}

	function editText(value: string) {
		text = value;
		if (hasErrors(parseGameTree(value).diagnostics) || value === validText) return;
		change(() => (validText = value));
	}

	function setRoot(player: Player) {
		editText(withRootPlayer(text, player));
	}

	let orderText = $state('');
	let orderError = $state('');
	$effect(() => {
		// Follow the tree's order when it changes from elsewhere.
		orderText = order.join(' ');
		orderError = '';
	});
	function editOrder(value: string) {
		orderText = value;
		const next = parsePlayerOrder(value, tree.players);
		if (!next) {
			orderError = `Player numbers from 1 to ${tree.players}, separated by spaces.`;
			return;
		}
		orderError = '';
		editText(withPlayerOrder(text, next));
	}

	// ------------------------------------------------------------------
	// Random trees
	// ------------------------------------------------------------------

	const depthMax = $derived(maxRandomDepth(gen.branching));

	function generate(seed = gen.seed) {
		const b = wholeIn(gen.branching, MIN_BRANCHING, MAX_BRANCHING);
		const d = wholeIn(gen.depth, 1, maxRandomDepth(b));
		const lo = wholeIn(Math.min(gen.min, gen.max), -VALUE_LIMIT, VALUE_LIMIT);
		const hi = wholeIn(Math.max(gen.min, gen.max), -VALUE_LIMIT, VALUE_LIMIT);
		gen = { branching: b, depth: d, seed, min: lo, max: hi };
		const next = randomTreeText(gen);
		stepper.pause();
		text = next;
		validText = next;
		showActions = b ** d <= 27;
		stepper.set(0);
	}

	function newSeed() {
		let next = gen.seed;
		while (next === gen.seed) next = 1 + Math.floor(Math.random() * 9999);
		generate(next);
	}

	// ------------------------------------------------------------------
	// Controls
	// ------------------------------------------------------------------

	const algorithmOptions: { value: Algorithm; label: string; title: string }[] = [
		{ value: 'minimax', label: 'Minimax', title: 'Minimax values of every node (slide 11)' },
		{ value: 'alphabeta', label: 'Alpha-beta', title: 'Alpha-beta pruning (slides 21–22)' }
	];
	const orderingOptions: { value: Ordering; label: string }[] = [
		{ value: 'given', label: 'As given' },
		{ value: 'best-first', label: 'Best moves first' },
		{ value: 'worst-first', label: 'Worst moves first' }
	];
	const cutoffOptions = $derived([
		{ value: 0, label: 'Off' },
		...facts.cutoffDepths.map((d) => ({ value: d, label: `Depth ${d}` }))
	]);
	const rootOptions = $derived<{ value: Player; label: string; disabled: boolean }[]>([
		{ value: 'max', label: 'MAX', disabled: textHasErrors },
		{ value: 'min', label: 'MIN', disabled: textHasErrors }
	]);

	const algorithmName = $derived(
		run.kind === 'maxn'
			? 'Backing up utility tuples'
			: run.kind === 'minimax'
				? 'Minimax'
				: `Alpha-beta${ordering === 'best-first' ? ', best moves first' : ordering === 'worst-first' ? ', worst moves first' : ''}`
	);
	const treeSubtitle = $derived(
		`${facts.nodes} nodes · ${facts.leaves} terminal · depth ${facts.depth}${cutoff !== null ? ` · cut off at ${cutoff}` : ''}`
	);
	const atEnd = $derived(stepper.total > 0 && stepper.atEnd);
	const fmt = (n: number) => n.toLocaleString('en-US');

	// ------------------------------------------------------------------
	// Scrolling back to the step controls
	// ------------------------------------------------------------------

	let runArea = $state<HTMLElement>();
	function revealSteps() {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		runArea?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
	}
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu presets={MINIMAX_PRESETS} selected={presetId} onselect={loadPreset} align="end" />
	{/snippet}

	<div class="tool" tabindex="-1" {@attach stepperKeys(stepper)}>
		<div class="setup">
			<Panel title="Game tree" subtitle={treeSubtitle}>
				<div class="tree-facts">
					{#if tree.tuples}
						<div class="order-field">
							<TextField
								label="Player order"
								description="Player to move at each level from the root, cycling. Players are the tuple positions 1 to {tree.players}."
								value={orderText}
								mono
								size="sm"
								error={orderError || undefined}
								disabled={textHasErrors}
								oninput={(e) => editOrder(e.currentTarget.value)}
							/>
						</div>
					{:else}
						<SegmentedControl
							label="To move at the root"
							showLabel
							size="sm"
							options={rootOptions}
							value={tree.root}
							onchange={setRoot}
						/>
					{/if}
					<p class="shape-note">
						{#if facts.uniform}
							Uniform tree: b = {facts.uniform.b}, d = {facts.uniform.d}.
						{:else}
							Branching up to {facts.branching}.
						{/if}
						{#if tree.tuples}Utilities are tuples, one per player.{/if}
					</p>
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

				<div class="disclosures">
					<Disclosure summary="Edit tree" openSummary="Hide tree text" variant="boxed">
						<TreeEditor {text} diagnostics={parsed.diagnostics} oninput={editText} />
					</Disclosure>
					<Disclosure summary="Random tree" openSummary="Hide random tree" variant="boxed">
						<div class="random">
							<div class="random-fields">
								<NumberField
									label="Branching b"
									bind:value={gen.branching}
									min={MIN_BRANCHING}
									max={MAX_BRANCHING}
									size="sm"
								/>
								<NumberField
									label="Depth d"
									bind:value={gen.depth}
									min={1}
									max={depthMax}
									size="sm"
								/>
								<NumberField label="Seed" bind:value={gen.seed} min={0} max={MAX_SEED} size="sm" />
								<NumberField
									label="Lowest utility"
									bind:value={gen.min}
									min={-VALUE_LIMIT}
									max={VALUE_LIMIT}
									size="sm"
								/>
								<NumberField
									label="Highest utility"
									bind:value={gen.max}
									min={-VALUE_LIMIT}
									max={VALUE_LIMIT}
									size="sm"
								/>
							</div>
							<div class="random-actions">
								<Button size="sm" variant="primary" onclick={() => generate()}>
									{#snippet icon()}<Icon name="dice" />{/snippet}
									Generate
								</Button>
								<Button size="sm" onclick={newSeed}>
									{#snippet icon()}<Icon name="shuffle" />{/snippet}
									New seed
								</Button>
							</div>
							<p class="hint">
								A uniform tree with b<sup>d</sup> terminal nodes and whole-number utilities drawn at
								random; the same settings give the same tree. At most {fmt(
									maxRandomDepth(gen.branching)
								)} levels for b = {gen.branching}.
							</p>
						</div>
					</Disclosure>
				</div>
			</Panel>

			<Panel title="Search" subtitle={algorithmName}>
				<div class="controls">
					{#if tree.tuples}
						<p class="multi-note">
							The utilities are tuples: each player maximizes their own utility at their node, and
							the tuples are backed up from children to parents.
							<CitationTag cite={{ deck: 'adversarial', slide: 13 }} />
						</p>
					{:else}
						<SegmentedControl
							label="Algorithm"
							showLabel
							options={algorithmOptions}
							value={algorithm}
							onchange={(v) => change(() => (algorithm = v))}
						/>
						<div class="row">
							<Select
								label="Move ordering"
								size="sm"
								options={orderingOptions}
								value={ordering}
								disabled={algorithm !== 'alphabeta'}
								onchange={(v) => change(() => (ordering = v))}
							/>
						</div>
						{#if algorithm === 'alphabeta'}
							<p class="hint">
								Move ordering sorts each node’s children by their minimax value before searching:
								best first is perfect ordering. The tree is drawn in the order searched.
							</p>
						{/if}
					{/if}
					<div class="row">
						<Select
							label="Depth cutoff"
							size="sm"
							options={cutoffOptions}
							value={cutoff ?? 0}
							disabled={cutoffOptions.length < 2}
							onchange={(v) => change(() => (cutoffSetting = v === 0 ? null : v))}
						/>
					</div>
					{#if cutoffOptions.length < 2}
						<p class="hint">
							A cutoff needs evaluation values on the internal nodes of a level, written in braces:
							<code>{'{5}[3 12 8]'}</code>.
						</p>
					{/if}
					<Toggle label="Action labels on the edges" bind:checked={showActions} />
				</div>
			</Panel>
		</div>

		<section class="run" aria-label="Search run" bind:this={runArea}>
			<div class="step-bar">
				<StepControls {stepper} ariaLabel="Search steps" speeds={[0.5, 1, 2, 4, 8]}>
					{#snippet label(i)}{describeStep(run, i)}{/snippet}
				</StepControls>
			</div>

			{#if textHasErrors}
				<Callout tone="warn">
					The tree text has errors (listed under the editor). The views show the last tree without
					errors.
				</Callout>
			{/if}
			{#each run.result.diagnostics as d, i (i)}
				<Callout tone={d.severity === 'error' ? 'error' : 'warn'}>{d.message}</Callout>
			{/each}

			<div class="views">
				<div class="main">
					<Panel title="Game tree" subtitle={algorithmName} padding="none">
						<div class="figure">
							<GameTree
								tree={run.result.tree}
								display={view.display}
								{order}
								actions={showActions}
								maxHeight={560}
							/>
						</div>
					</Panel>
					<Panel title="Counts" subtitle="at this step">
						<dl class="counts">
							<div class="count">
								<dt>Nodes visited</dt>
								<dd>{fmt(view.progress.visited)} <span class="of">of {fmt(counts.total)}</span></dd>
							</div>
							<div class="count">
								<dt>{cutoff !== null ? 'Utilities and evaluations' : 'Terminal utilities'}</dt>
								<dd>
									{fmt(view.progress.evaluated)} <span class="of">of {fmt(counts.positions)}</span>
								</dd>
							</div>
							{#if run.kind === 'alphabeta'}
								<div class="count">
									<dt>Subtrees pruned</dt>
									<dd>
										{fmt(view.progress.pruned)}
									</dd>
								</div>
							{/if}
						</dl>
						{#if atEnd}
							<p class="result" role="status">{describeResult(run)}</p>
						{/if}
					</Panel>
				</div>
				<div class="side">
					<Panel title="Pseudocode" subtitle={listing.title}>
						<CodePanel
							{listing}
							{line}
							stack={run.kind === 'alphabeta' ? view.stack : null}
							tree={run.result.tree}
						/>
						{#if run.result.cutoff !== null}
							<p class="code-cite">
								The Cutoff line replaces the terminal test at the cutoff depth. <CitationTag
									cite={{ deck: 'adversarial', slide: 24 }}
								/>
							</p>
						{:else}
							<p class="code-cite">
								<CitationTag
									cite={run.kind === 'alphabeta'
										? { deck: 'adversarial', slide: tree.root === 'max' ? 22 : 21 }
										: run.kind === 'minimax'
											? { deck: 'adversarial', slide: 11 }
											: { deck: 'adversarial', slide: 13 }}
								/>
							</p>
						{/if}
					</Panel>
				</div>
			</div>

			<p class="keys">
				With focus in the tool: <Kbd>←</Kbd>
				<Kbd>→</Kbd> previous and next step, <Kbd>Home</Kbd>
				<Kbd>End</Kbd> first and last step, <Kbd>Space</Kbd> play or pause.
			</p>
		</section>

		{#if table}
			<Panel title="Pruning and move ordering" subtitle="whole search">
				<CountsTable {table} {algorithm} {ordering} cutoff={cutoff !== null} />
			</Panel>
		{/if}

		<Panel title="From the slides">
			<div class="notes">
				{#each NOTES as note (note.id)}
					<section class="note" aria-labelledby="note-{note.id}">
						<h3 id="note-{note.id}">{note.title}</h3>
						<CitationTag cite={note.cite} />
						<ul>
							{#each note.points as point, i (i)}
								<li>{point}</li>
							{/each}
						</ul>
						{#if note.preset}
							{@const p = note.preset}
							<Button size="sm" variant="ghost" onclick={() => openPreset(p.id)}>
								{#snippet icon()}<Icon name="play" />{/snippet}
								Load “{p.label}”
							</Button>
						{/if}
					</section>
				{/each}
			</div>
		</Panel>

		<Panel title="Questions from the slides">
			<div class="questions">
				{#each QUESTIONS as q (q.id)}
					<div class="question">
						<p class="q">{q.question}</p>
						<CitationTag cite={q.cite} />
						<Disclosure openSummary="Hide answer">
							<p>{q.answer}</p>
							{#if q.preset}
								{@const p = q.preset}
								<Button size="sm" onclick={() => openPreset(p.id)}>
									{#snippet icon()}<Icon name="play" />{/snippet}
									Load “{p.label}”
								</Button>
							{/if}
						</Disclosure>
					</div>
				{/each}
			</div>
		</Panel>
	</div>
</ToolPage>

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
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
	}
	.tree-facts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.order-field {
		flex: 1 1 16rem;
		max-width: 26rem;
	}
	.shape-note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
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
	.disclosures {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}
	.random {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.random-fields {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: var(--space-2) var(--space-3);
	}
	.random-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.controls {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-3);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		min-width: 12rem;
	}
	.hint,
	.multi-note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
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
	.main,
	.side {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.figure {
		padding: 0 var(--space-3) var(--space-3);
	}
	.code-cite {
		margin: var(--space-2) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.counts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: var(--space-3);
		margin: 0;
	}
	.count {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.count dt {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.03em;
	}
	.count dd {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.of {
		color: var(--text-3);
		font-size: var(--text-sm);
		font-weight: 400;
	}
	.result {
		margin: var(--space-3) 0 0;
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--accept);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--accept-soft);
		font-size: var(--text-sm);
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
	.notes {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	@media (min-width: 900px) {
		.notes {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (min-width: 1280px) {
		.notes {
			grid-template-columns: repeat(3, minmax(0, 1fr));
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
		font-size: var(--text-lg);
	}
	.note ul {
		margin: 0;
		padding-left: 1.2rem;
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.note li + li {
		margin-top: var(--space-1);
	}
	.questions {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4) var(--space-5);
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
