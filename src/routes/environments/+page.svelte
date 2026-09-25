<script lang="ts">
	import { tick } from 'svelte';
	import {
		Button,
		CitationTag,
		Disclosure,
		Icon,
		Panel,
		PresetMenu,
		ToolPage,
		toneStyle,
		type Preset
	} from '$lib/components/ui';
	import {
		COURSE_PREVIEW_CITE,
		DIMENSION_IDS,
		SEARCH_SETTING_CITE,
		SLIDE_17,
		courseMethods,
		courseRowTitle,
		dimension,
		valueInfo,
		type Dimension,
		type DimensionValue,
		type PeasPart
	} from '$lib/theory/agents/environments';
	import { tool } from '$lib/tools/catalog/environments';
	import ColumnEditor from '$lib/tools/environments/ColumnEditor.svelte';
	import CourseMethodsPanel from '$lib/tools/environments/CourseMethodsPanel.svelte';
	import CoursePreview from '$lib/tools/environments/CoursePreview.svelte';
	import DimensionReference from '$lib/tools/environments/DimensionReference.svelte';
	import EnvironmentTable from '$lib/tools/environments/EnvironmentTable.svelte';
	import PeasPanel from '$lib/tools/environments/PeasPanel.svelte';
	import { EXAMPLE_PRESETS } from '$lib/tools/environments/presets';
	import { POKER, searchSettingFits } from '$lib/tools/environments/questions';
	import {
		MAX_COLUMNS,
		addCustom,
		addExample,
		columnName,
		columnProfile,
		completeEnvironmentsState,
		defaultEnvironmentsState,
		duplicateColumn,
		findColumn,
		isDefaultTable,
		isSavedEnvironmentsState,
		removeColumn,
		renameColumn,
		resetColumn,
		selectColumn,
		setColumnPeas,
		setColumnValue,
		type EnvironmentsToolState,
		type SavedEnvironmentsState
	} from '$lib/tools/environments/state';
	import { VALUE_LEGEND, announceColumn } from '$lib/tools/environments/view';
	import { syncToHash } from '$lib/url-state';

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	let env = $state<EnvironmentsToolState>(defaultEnvironmentsState());
	/** Sentence for the aria-live region. */
	let message = $state('');

	syncToHash<SavedEnvironmentsState>(() => env, {
		validate: isSavedEnvironmentsState,
		onLoad(saved) {
			env = completeEnvironmentsState(saved);
		}
	});

	const current = $derived(findColumn(env, env.selected));
	const full = $derived(env.columns.length >= MAX_COLUMNS);
	const presetSelected = $derived(current?.kind === 'example' ? current.key : null);

	function commit(next: EnvironmentsToolState, announce?: 'added' | 'selected' | 'reset') {
		env = next;
		const column = findColumn(next, next.selected);
		if (announce && column) message = announceColumn(announce, column);
	}

	function select(key: string) {
		commit(selectColumn(env, key), 'selected');
	}

	function addPreset(preset: Preset<string>) {
		if (!findColumn(env, preset.value) && full) {
			message = `The table holds at most ${MAX_COLUMNS} environments. Remove one to add ${preset.label}.`;
			return;
		}
		const present = findColumn(env, preset.value) !== undefined;
		commit(addExample(env, preset.value), present ? 'selected' : 'added');
	}

	function addCustomColumn() {
		commit(addCustom(env), 'added');
	}

	let addButton: HTMLButtonElement | undefined = $state();

	/**
	 * Moves focus to a column's header button (or "Add custom" when there is
	 * none) after the control that had it went away.
	 */
	async function focusColumn(key: string | null) {
		await tick();
		const header = key ? document.querySelector<HTMLElement>(`button[data-column="${key}"]`) : null;
		(header ?? addButton)?.focus();
	}

	function remove(key: string) {
		const column = findColumn(env, key);
		if (!column) return;
		const i = env.columns.indexOf(column);
		env = removeColumn(env, key);
		message = announceColumn('removed', column);
		focusColumn((env.columns[i] ?? env.columns[i - 1])?.key ?? null);
	}

	function duplicate(key: string) {
		commit(duplicateColumn(env, key), 'added');
	}

	function setValue(key: string, d: Dimension, value: DimensionValue | undefined) {
		env = setColumnValue(env, key, d, value as never);
	}

	function resetTable() {
		env = defaultEnvironmentsState();
		message = 'Table reset to the slide 17 examples.';
		focusColumn(null);
	}

	function addPoker() {
		commit(addCustom(env, { name: POKER.name, values: POKER.values }), 'added');
	}

	// ------------------------------------------------------------------
	// Questions
	// ------------------------------------------------------------------

	const fits = searchSettingFits();
	const pokerRows = courseMethods(POKER.values);
</script>

{#snippet legend()}
	<div class="legend">
		<ul class="swatches" aria-label="Value colors">
			{#each VALUE_LEGEND as entry (entry.tone)}
				<li title={entry.values}>
					<span class="dot" style={toneStyle(entry.tone)} aria-hidden="true"></span>
					{entry.label}
				</li>
			{/each}
			<li><span class="unset" aria-hidden="true">—</span> Not set</li>
		</ul>
		<span class="legend-note"
			>Select a column to edit its values, see its PEAS, and see the course methods that fit it.</span
		>
		<CitationTag cite={SLIDE_17} />
	</div>
{/snippet}

<ToolPage {tool}>
	<Panel
		title="Examples of different environments"
		padding="none"
		footer={env.columns.length ? legend : undefined}
	>
		{#snippet actions()}
			<PresetMenu
				presets={EXAMPLE_PRESETS}
				selected={presetSelected}
				onselect={addPreset}
				label="Add example"
				size="sm"
				align="end"
			/>
			<Button size="sm" onclick={addCustomColumn} disabled={full} bind:element={addButton}>
				{#snippet icon()}<Icon name="plus" size={15} />{/snippet}
				Add custom
			</Button>
			{#if !isDefaultTable(env)}
				<Button size="sm" variant="ghost" onclick={resetTable}>
					{#snippet icon()}<Icon name="reset" size={15} />{/snippet}
					Reset
				</Button>
			{/if}
		{/snippet}

		{#if env.columns.length}
			<EnvironmentTable
				columns={env.columns}
				selected={env.selected}
				onselect={select}
				onremove={remove}
			/>
			{#if full}
				<p class="limit">
					The table holds at most {MAX_COLUMNS} environments; remove one to add another.
				</p>
			{/if}
		{:else}
			<p class="empty">
				The table is empty. Add an example from the slides or a custom environment.
			</p>
		{/if}
	</Panel>

	<p class="visually-hidden" aria-live="polite">{message}</p>

	{#if current}
		<div class="details">
			<ColumnEditor
				column={current}
				onvalue={(d, v) => setValue(current.key, d, v)}
				onrename={(name) => (env = renameColumn(env, current.key, name))}
				onreset={() => commit(resetColumn(env, current.key), 'reset')}
				onduplicate={() => duplicate(current.key)}
				onremove={() => remove(current.key)}
			/>
			<div class="side">
				<PeasPanel
					column={current}
					onpeas={(part: PeasPart, text: string) =>
						(env = setColumnPeas(env, current.key, part, text))}
					onduplicate={() => duplicate(current.key)}
				/>
				<CourseMethodsPanel name={columnName(current)} profile={columnProfile(current)} />
			</div>
		</div>
	{/if}

	<Panel title="Environment types">
		{#snippet actions()}<CitationTag cite={{ deck: 'agents', slide: [9, 16] }} />{/snippet}
		<DimensionReference />
	</Panel>

	<div class="lower">
		<Panel title="Preview of the course">
			{#snippet actions()}<CitationTag cite={COURSE_PREVIEW_CITE} />{/snippet}
			<CoursePreview columns={env.columns} selected={env.selected} onselect={select} />
		</Panel>

		<Panel title="Questions">
			<div class="questions">
				<div class="question">
					<p class="q">
						Which of the slide 17 environments fit the setting of the search lectures: fully
						observable, deterministic, discrete, known?
					</p>
					<CitationTag cite={SEARCH_SETTING_CITE} />
					<Disclosure openSummary="Hide answer">
						<ul class="answer-list">
							{#each fits as f (f.id)}
								<li>
									<strong>{f.name}</strong>:
									{#if f.fits}
										fits{#if f.missing.length}; Known is not in the table, and the rules of a word
											jumble are known{/if}.
									{:else}
										does not fit ({f.differs.join(', ')}).
									{/if}
								</li>
							{/each}
						</ul>
					</Disclosure>
				</div>

				<div class="question">
					<p class="q">Why is chess with a clock semidynamic rather than static?</p>
					<CitationTag cite={{ deck: 'agents', slide: 13 }} />
					<Disclosure openSummary="Hide answer">
						<p>
							The position does not change while a player thinks, but the clock does, and running
							out of time loses the game: the environment does not change with the passage of time,
							but the performance score does (slide 13). Without the clock, chess would be static.
						</p>
					</Disclosure>
				</div>

				<div class="question">
					<p class="q">Is known vs. unknown a property of the environment?</p>
					<CitationTag cite={{ deck: 'agents', slide: 16 }} />
					<Disclosure openSummary="Hide answer">
						<p>
							Strictly speaking, no: it is a property of the agent’s state of knowledge. The same
							game is known to an agent that has been given its rules (transition model and rewards)
							and unknown to one that has to find them out by acting. For a stochastic, sequential
							environment it decides between Markov decision processes and reinforcement learning
							(slide 18).
						</p>
					</Disclosure>
				</div>

				<div class="question">
					<p class="q">
						Classify poker along the seven dimensions. Which rows of the course preview apply?
					</p>
					<Disclosure openSummary="Hide answer">
						<p>One classification (this site’s):</p>
						<ul class="answer-list">
							{#each DIMENSION_IDS as d (d)}
								<li>
									<strong>{dimension(d).label}</strong>: {valueInfo(d, POKER.values[d])?.label}.
									{POKER.reasons[d]}
								</li>
							{/each}
						</ul>
						<p>
							Course preview:
							{pokerRows
								.map((m) => `${courseRowTitle(m.row).toLowerCase()} (${m.row.methods})`)
								.join('; ')}.
						</p>
						<Button size="sm" onclick={addPoker} disabled={full}>
							{#snippet icon()}<Icon name="plus" size={15} />{/snippet}
							Add to the table as a custom environment
						</Button>
					</Disclosure>
				</div>
			</div>
		</Panel>
	</div>
</ToolPage>

<style>
	.empty {
		margin: 0;
		padding: var(--space-5) var(--space-4);
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.limit {
		margin: 0;
		padding: var(--space-2) var(--space-4);
		border-top: 1px solid var(--border);
		background: var(--active-soft);
		color: var(--text-2);
		font-size: var(--text-xs);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--text-2);
		font-size: var(--text-xs);
	}
	.swatches li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--tone-fg);
		box-shadow: 0 0 0 2px var(--tone-bg);
	}
	.unset {
		color: var(--text-3);
	}
	.legend-note {
		flex: 1 1 16rem;
		color: var(--text-3);
		font-size: var(--text-xs);
	}

	.details,
	.lower {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	@media (min-width: 1000px) {
		.details {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
		.lower {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
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
	.answer-list {
		margin: 0 0 var(--space-3);
		padding-left: var(--space-4);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.answer-list li + li {
		margin-top: 2px;
	}
</style>
