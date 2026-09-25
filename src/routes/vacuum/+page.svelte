<script lang="ts">
	import {
		Badge,
		CitationTag,
		Disclosure,
		Icon,
		NumberField,
		Panel,
		PresetMenu,
		Select,
		StepControls,
		Stepper,
		ToolPage,
		stepperKeys,
		type Preset
	} from '$lib/components/ui';
	import {
		INITIAL_WORLDS,
		MEASURES,
		MEASURE_IDS,
		PROGRAM_IDS,
		REFLEX_TABLE,
		agentProgram,
		bestEvaluations,
		evaluate,
		formatPercept,
		parseWorldName,
		perceptIndex,
		simulate,
		tableActions,
		tableFromActions,
		type MeasureId,
		type ProgramId,
		type SquareModel,
		type VacuumAction
	} from '$lib/theory/agents/vacuum';
	import { vacuumStateCount } from '$lib/theory/agents/vacuum-space';
	import { tool } from '$lib/tools/catalog/vacuum';
	import { toolLink } from '$lib/tools/links';
	import HistoryTable from '$lib/tools/vacuum/HistoryTable.svelte';
	import ProgramCode from '$lib/tools/vacuum/ProgramCode.svelte';
	import ScoreChart from '$lib/tools/vacuum/ScoreChart.svelte';
	import StatePicker from '$lib/tools/vacuum/StatePicker.svelte';
	import TableEditor from '$lib/tools/vacuum/TableEditor.svelte';
	import VacuumWorldView from '$lib/tools/vacuum/VacuumWorldView.svelte';
	import {
		announceStep,
		describeModel,
		environmentProperties,
		explainStep,
		formatNumber,
		scoreSummary,
		signed,
		worldFigureLabel
	} from '$lib/tools/vacuum/describe';
	import { VACUUM_PRESETS } from '$lib/tools/vacuum/presets';
	import {
		MAX_SEED,
		MAX_TOOL_STEPS,
		MIN_TOOL_STEPS,
		completeVacuumState,
		decodeTable,
		defaultVacuumState,
		encodeTable,
		isSavedVacuumState,
		type VacuumToolState
	} from '$lib/tools/vacuum/state';
	import { syncToHash } from '$lib/url-state';

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	let cfg = $state<VacuumToolState>(defaultVacuumState());
	let presetId = $state<string | null>('slide-3');

	/** A control changed by hand: no preset is loaded any more. */
	function set<K extends keyof VacuumToolState>(key: K, value: VacuumToolState[K]) {
		cfg[key] = value;
		presetId = null;
	}

	function loadPreset(preset: Preset<VacuumToolState>) {
		stepper.pause();
		Object.assign(cfg, preset.value);
		presetId = preset.id;
		stepper.first();
	}

	// ------------------------------------------------------------------
	// Simulation
	// ------------------------------------------------------------------

	const table = $derived(decodeTable(cfg.table) ?? REFLEX_TABLE);
	const program = $derived(agentProgram(cfg.program, table));
	const initial = $derived(parseWorldName(cfg.initial) ?? INITIAL_WORLDS[0]);
	const measure = $derived(MEASURES[cfg.measure]);
	const run = $derived(
		simulate({
			program,
			initial,
			steps: cfg.steps,
			dirtProbability: cfg.p,
			measure: cfg.measure,
			seed: cfg.seed
		})
	);
	const evaluations = $derived(
		evaluate(PROGRAM_IDS, {
			table,
			steps: cfg.steps,
			dirtProbability: cfg.p,
			measure: cfg.measure,
			seed: cfg.seed
		})
	);
	const best = $derived(new Set(bestEvaluations(evaluations)));
	const randomRuns = $derived(Math.max(...evaluations.map((e) => e.runs)));

	const stepper = new Stepper(() => run.steps.length, { speed: 2 });

	syncToHash(() => ({ ...cfg }), {
		validate: isSavedVacuumState,
		onLoad(saved) {
			Object.assign(cfg, completeVacuumState(saved));
			presetId = null;
			stepper.first();
		}
	});

	const index = $derived(stepper.index);
	const step = $derived(run.steps[index]);
	const fresh = $derived(index > 0 ? run.steps[index - 1].dirtied : []);
	const tableRows = $derived(tableActions(table));

	// ------------------------------------------------------------------
	// Options and text
	// ------------------------------------------------------------------

	const programOptions = PROGRAM_IDS.map((id) => ({ value: id, label: agentProgram(id).name }));
	const measureOptions = MEASURE_IDS.map((id) => ({ value: id, label: MEASURES[id].name }));
	const properties = $derived(environmentProperties(cfg.p));
	const spaceLink = toolLink('state-spaces', { problem: 'vacuum', squares: 2 });

	const worldLabel = $derived(step ? worldFigureLabel(step, fresh) : 'Vacuum world');
	const chartLabel = $derived(
		scoreSummary(
			run.steps.map((s) => s.total),
			measure.name
		)
	);

	function setTable(next: VacuumAction[]) {
		set('table', encodeTable(tableFromActions(next)));
	}
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu presets={VACUUM_PRESETS} selected={presetId} onselect={loadPreset} align="end" />
	{/snippet}

	<Panel title="Setup">
		<div class="controls">
			<div class="control wide">
				<Select
					label="Agent program"
					options={programOptions}
					value={cfg.program}
					onchange={(v: ProgramId) => set('program', v)}
				/>
			</div>
			<div class="control wide">
				<Select
					label="Performance measure"
					options={measureOptions}
					value={cfg.measure}
					onchange={(v: MeasureId) => set('measure', v)}
				/>
			</div>
			<div class="control">
				<NumberField
					label="Time steps"
					value={cfg.steps}
					min={MIN_TOOL_STEPS}
					max={MAX_TOOL_STEPS}
					onchange={(v) => set('steps', v)}
				/>
			</div>
			<div class="control">
				<NumberField
					label="Dirt probability p"
					value={cfg.p}
					min={0}
					max={1}
					step={0.05}
					onchange={(v) => set('p', v)}
				/>
			</div>
			<div class="control">
				<NumberField
					label="Seed"
					value={cfg.seed}
					min={0}
					max={MAX_SEED}
					onchange={(v) => set('seed', v)}
				/>
			</div>
		</div>
		<div class="initial">
			<span class="control-label" aria-hidden="true">Initial state</span>
			<StatePicker
				label="Initial state"
				value={cfg.initial}
				onchange={(name) => set('initial', name)}
			/>
		</div>
		<p class="note">
			{measure.description}. After each time step, each clean square becomes dirty with probability
			p (0: dirt never comes back). The seed fixes the random dirt and the random agent's choices.
		</p>
		{#snippet footer()}
			<div class="env">
				<span class="env-label">Task environment</span>
				<ul class="env-list" aria-label="Task environment properties">
					{#each properties as prop (prop.name)}
						<li title={prop.name}>{prop.label}</li>
					{/each}
				</ul>
				<CitationTag cite={{ deck: 'agents', slide: [9, 16] }} />
			</div>
		{/snippet}
	</Panel>

	<div class="main">
		<Panel title="Vacuum world" subtitle="t = {step?.t ?? 0} of {run.steps.length}">
			<div class="stage" tabindex="-1" {@attach stepperKeys(stepper)}>
				{#if step}
					<VacuumWorldView world={step.before} action={step.action} {fresh} label={worldLabel} />
					<dl class="readout">
						<div class="read percept">
							<dt>Percept</dt>
							<dd class="mono">{formatPercept(step.percept)}</dd>
						</div>
						<Icon name="arrow-right" size={18} class="read-arrow" />
						<div class="read action">
							<dt>Action</dt>
							<dd>{step.action}</dd>
						</div>
						<div class="read score">
							<dt>Score</dt>
							<dd>
								{formatNumber(step.total)}
								<span class="delta">({signed(step.reward)})</span>
							</dd>
						</div>
					</dl>
				{/if}
				<StepControls {stepper} noun="Time step" ariaLabel="Time step controls">
					{#snippet label(i)}
						{@const s = run.steps[i]}
						{#if s}
							<strong>{announceStep(s)}.</strong>
							{explainStep(s, program)}
						{/if}
					{/snippet}
				</StepControls>
			</div>
		</Panel>
		<div class="side">
			<Panel title="Agent program" subtitle={program.name}>
				<div class="program">
					<p class="description">{program.description}</p>
					<ProgramCode
						program={cfg.program}
						rule={step?.rule ?? null}
						label="Pseudocode of the {program.name.toLowerCase()}"
					/>
					{#if cfg.program === 'reflex-state' && step}
						<p class="memory">
							<span class="memory-label">Model after this percept</span>
							<span class="mono">{describeModel(step.memory as SquareModel)}</span>
						</p>
					{:else if cfg.program === 'table'}
						<TableEditor
							actions={tableRows}
							current={step ? perceptIndex(step.percept) : null}
							isReflex={cfg.table === encodeTable(REFLEX_TABLE)}
							onchange={setTable}
							onreset={() => set('table', encodeTable(REFLEX_TABLE))}
						/>
					{:else if cfg.program === 'reflex'}
						<p class="source">
							As written on the slide. <CitationTag cite={{ deck: 'agents', slide: 3 }} />
						</p>
					{/if}
				</div>
			</Panel>

			<Panel title="Score over time" subtitle={measure.name}>
				<ScoreChart
					totals={run.steps.map((s) => s.total)}
					current={step?.t ?? 0}
					label={chartLabel}
					onselect={(t) => stepper.set(t - 1)}
				/>
				<p class="note">
					Total {formatNumber(run.total)} after {run.steps.length} time steps. Click the chart to show
					a time step.
				</p>
			</Panel>
		</div>
	</div>

	<div class="results">
		<Panel title="History" subtitle="{run.steps.length} time steps">
			<HistoryTable steps={run.steps} current={index} onselect={(i) => stepper.set(i)} />
		</Panel>
		<Panel title="Expected performance" subtitle={measure.name}>
			<div class="table-wrap">
				<table class="compare">
					<thead>
						<tr>
							<th scope="col">Agent program</th>
							<th scope="col" class="num">Average</th>
							<th scope="col" class="num step-col">Per step</th>
							<th scope="col" class="num range-col">Range</th>
						</tr>
					</thead>
					<tbody>
						{#each evaluations as e, i (e.program)}
							<tr class={{ best: best.has(i), selected: e.program === cfg.program }}>
								<th scope="row">
									<span class="prog">
										{e.name}
										{#if best.has(i)}<Badge tone="accept">Best</Badge>{/if}
										{#if e.program === cfg.program}<Badge tone="accent">Selected</Badge>{/if}
									</span>
								</th>
								<td class="num strong">{formatNumber(e.average)}</td>
								<td class="num step-col">{formatNumber(e.average / Math.max(1, cfg.steps))}</td>
								<td class="num range-col">{formatNumber(e.min)} – {formatNumber(e.max)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="note">
				Average total score over the {INITIAL_WORLDS.length} initial states{#if randomRuns > 1}, {randomRuns}
					seeded runs each for programs or environments with random choices{/if}, with {cfg.steps} time
				steps, p = {formatNumber(cfg.p)}, and the measure above. Range: the lowest and highest
				average of a single initial state. The table-driven agent uses the table shown when it is
				selected.
			</p>
		</Panel>
	</div>

	<Panel title="Rational agents">
		<div class="theory">
			<div class="defs">
				<blockquote class="definition">
					<p>
						For each possible percept sequence, a <strong>rational agent</strong> should select an
						action that is expected to maximize its <strong>performance measure</strong>, given the
						evidence provided by the percept sequence and the agent’s built-in knowledge.
					</p>
					<footer><CitationTag cite={{ deck: 'agents', slide: 4 }} /></footer>
				</blockquote>
				<p class="term">
					<strong>Performance measure (utility function):</strong> an objective criterion for
					success of an agent’s behavior. <strong>Expected utility:</strong>
				</p>
				<div
					class="formula"
					role="math"
					aria-label="E U of action equals the sum over outcomes of P of outcome given action times U of outcome"
				>
					<span><i>EU</i>(<i>action</i>) =</span>
					<span class="sum"><span class="sigma">Σ</span><span class="under">outcomes</span></span>
					<span><i>P</i>(<i>outcome</i> | <i>action</i>) <i>U</i>(<i>outcome</i>)</span>
				</div>
			</div>

			<div class="questions">
				<div class="question">
					<p class="q">Can a rational agent make mistakes?</p>
					<CitationTag cite={{ deck: 'agents', slide: 4 }} />
					<Disclosure>
						<p>
							Yes. A rational agent maximizes <em>expected</em> performance given its percepts and built-in
							knowledge; it is not omniscient, and a good choice can still have a bad outcome.
						</p>
						<p>
							Example with −1 per move over 10 time steps: the agent is in A, A is clean, and it has
							not perceived B. Moving Right scores 18 if B is dirty and 19 if B is clean; staying
							(NoOp) scores 10 or 20. With q = P(B dirty):
						</p>
						<p class="eu">
							EU(Right) = 18q + 19(1 − q)<br />EU(NoOp) = 10q + 20(1 − q)
						</p>
						<p>
							so Right is the rational choice whenever q &gt; 1/9. When B turns out to be clean,
							Right scores one point less than NoOp would have (initial state A CC, reflex agent
							with state).
						</p>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">Is this agent rational?</p>
					<CitationTag cite={{ deck: 'agents', slide: 5 }} />
					<Disclosure>
						<p>
							It depends on the performance measure and the properties of the environment. With +1
							per clean square per time step and dirt that stays cleaned (p = 0), no agent program
							scores higher than the reflex agent from any of the eight initial states: it is
							rational.
						</p>
						<p>
							With −1 per move, it is not: once both squares are clean it keeps moving Left and
							Right. From A with both squares dirty it scores 10 in 10 time steps; the reflex agent
							with state, which returns NoOp once it has perceived both squares clean, scores 17
							(presets “Reflex agent with a move penalty” and “Reflex agent with state, move
							penalty”).
						</p>
						<p>
							When clean squares can become dirty again (p &gt; 0), an agent that stops for good
							misses the new dirt; “Expected performance” compares the programs in that environment.
						</p>
					</Disclosure>
				</div>
				<div class="question">
					<p class="q">How many possible states? What if there are n possible locations?</p>
					<CitationTag cite={{ deck: 'search', slide: 8 }} />
					<Disclosure>
						<p>
							2 locations × 2² dirt patterns = {vacuumStateCount(2)} states: the eight initial states
							above. With n locations there are n·2ⁿ states ({vacuumStateCount(3)} for n = 3, {vacuumStateCount(
								4
							)} for n = 4, {vacuumStateCount(5)} for n = 5): the size of the state space grows exponentially
							with the size of the world.
							{#if spaceLink}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
								<a href={spaceLink}>Open the state-space graph</a>.
							{/if}
						</p>
					</Disclosure>
				</div>
			</div>
		</div>
	</Panel>
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
		min-width: 0;
	}
	.control.wide {
		flex: 1 1 13rem;
		max-width: 17rem;
	}
	.control-label {
		color: var(--text-2);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.initial {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: var(--space-4);
	}
	.note {
		margin: var(--space-3) 0 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.env {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
	}
	.env-label {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.env-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--text-2);
	}
	.env-list li:not(:last-child)::after {
		content: '·';
		margin-left: var(--space-2);
		color: var(--text-3);
	}

	.main,
	.results {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	@media (min-width: 1000px) {
		.main {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
		.results {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}
	.stage {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.stage:focus {
		outline: none;
	}
	.readout {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--space-2) var(--space-4);
		margin: 0;
	}
	.readout :global(.read-arrow) {
		color: var(--text-3);
	}
	.read {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		min-width: 5.5rem;
	}
	.read dt {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.read dd {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.3;
	}
	.percept dd {
		color: var(--syn-number);
		font-size: var(--text-base);
	}
	.action dd {
		color: var(--syn-escape);
	}
	.score {
		margin-left: var(--space-3);
		padding-left: var(--space-4);
		border-left: 1px solid var(--border);
	}
	.delta {
		color: var(--text-3);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}

	.program {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.description {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.memory {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-2);
		align-items: baseline;
		margin: 0;
		font-size: var(--text-sm);
	}
	.memory-label {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.memory .mono {
		font-size: var(--text-xs);
	}
	.source {
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-sm);
	}

	.table-wrap {
		overflow-x: auto;
	}
	.compare {
		width: 100%;
		font-size: var(--text-sm);
	}
	.compare th,
	.compare td {
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}
	.compare thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.compare tbody th {
		font-weight: 500;
	}
	.prog {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 6px;
	}
	.compare .num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.compare .strong {
		font-weight: 600;
	}
	.compare tr.best th,
	.compare tr.best td {
		background: var(--accept-soft);
	}
	.compare tr.best th {
		box-shadow: inset 3px 0 var(--accept);
	}
	@media (max-width: 480px) {
		.range-col,
		.step-col {
			display: none;
		}
		.score {
			margin-left: 0;
			padding-left: 0;
			border-left: 0;
		}
	}

	.theory {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5) var(--space-6);
		align-items: start;
	}
	@media (min-width: 1000px) {
		.theory {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
	.defs {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.definition {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		border-left: 3px solid var(--accent);
		border-radius: 0 var(--radius) var(--radius) 0;
		background: var(--surface-2);
		font-family: var(--font-serif);
		font-size: var(--text-base);
		line-height: 1.55;
	}
	.definition p {
		margin: 0 0 var(--space-2);
	}
	.definition footer {
		display: flex;
		font-family: var(--font-sans);
	}
	.term {
		margin: 0;
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.formula {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0 0.4em;
		padding: var(--space-2) 0;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
	}
	.sum {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
	}
	.sigma {
		font-size: 1.6em;
		font-style: normal;
	}
	.under {
		font-size: var(--text-xs);
		font-style: italic;
	}
	.questions {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.eu {
		padding-left: var(--space-3);
		font-family: var(--font-serif);
		font-style: italic;
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
