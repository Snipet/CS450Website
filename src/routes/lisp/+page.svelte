<script lang="ts">
	import { tick } from 'svelte';
	import {
		Badge,
		Button,
		Callout,
		CodeEditor,
		Icon,
		IconButton,
		Kbd,
		Panel,
		PresetMenu,
		SegmentedControl,
		Select,
		Toggle,
		ToolPage,
		type Preset
	} from '$lib/components/ui';
	import { Interpreter, highlightLisp, readAll, type RunResult } from '$lib/theory/lisp';
	import { tool } from '$lib/tools/catalog/lisp';
	import InterpretExercise from '$lib/tools/lisp/InterpretExercise.svelte';
	import ReferenceCard from '$lib/tools/lisp/ReferenceCard.svelte';
	import Repl from '$lib/tools/lisp/Repl.svelte';
	import ResultsList from '$lib/tools/lisp/ResultsList.svelte';
	import TraceView from '$lib/tools/lisp/TraceView.svelte';
	import WriteExercise from '$lib/tools/lisp/WriteExercise.svelte';
	import { exerciseById, exercisesFor, type ExerciseMode } from '$lib/tools/lisp/exercises';
	import { LISP_PRESETS, matchPreset, type LispProgram } from '$lib/tools/lisp/presets';
	import {
		completeLispState,
		defaultLispState,
		firstExercise,
		isSavedLispState
	} from '$lib/tools/lisp/state';
	import { summarizeRun } from '$lib/tools/lisp/view';
	import { afterNavigate } from '$app/navigation';
	import { syncToHash } from '$lib/url-state';

	const initial = defaultLispState();

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	let code = $state(initial.code);
	let trace = $state(initial.trace);
	let mode = $state<ExerciseMode>(initial.mode);
	let exerciseId = $state(initial.exercise);
	/** Code typed for Write exercises, by id (absent: the starter). */
	let attempts = $state<Record<string, string>>({});
	/** The exercise last open in each mode. */
	const lastByMode: Record<ExerciseMode, string> = {
		interpret: firstExercise('interpret'),
		write: firstExercise('write')
	};

	// ------------------------------------------------------------------
	// The session: Run evaluates the code in a fresh interpreter; the REPL
	// keeps evaluating in it.
	// ------------------------------------------------------------------

	let session = new Interpreter();
	let sessionId = $state(0);
	let ranCode = $state(initial.code);
	let run = $state.raw<RunResult>(session.run(initial.code, { trace: initial.trace }));

	function runCode() {
		session = new Interpreter();
		run = session.run(code, { trace });
		ranCode = code;
		sessionId++;
	}

	const evaluateLine = (text: string) => session.run(text, { source: 'repl', trace });

	const edited = $derived(code !== ranCode);
	// While editing, only reading problems are shown (runtime errors belong to the last run).
	const diagnostics = $derived(edited ? readAll(code).diagnostics : run.diagnostics);

	// A link from another page lands here after the router has reset the scroll
	// position, which cancels the reveal in onLoad; it is done again once
	// navigation ends.
	let revealOnNavigate = false;
	syncToHash(
		() => ({ code, trace, mode, exercise: exerciseId, attempt: attempts[exerciseId] ?? null }),
		{
			validate: isSavedLispState,
			onLoad(saved) {
				const s = completeLispState(saved);
				code = s.code;
				trace = s.trace;
				mode = s.mode;
				exerciseId = s.exercise;
				lastByMode[s.mode] = s.exercise;
				if (s.attempt !== null) attempts[s.exercise] = s.attempt;
				runCode();
				if (saved.exercise) {
					revealOnNavigate = true;
					tick().then(() => reveal(exercisesArea));
				}
			}
		}
	);
	afterNavigate(() => {
		if (!revealOnNavigate) return;
		revealOnNavigate = false;
		reveal(exercisesArea);
	});

	// ------------------------------------------------------------------
	// Presets and the editor
	// ------------------------------------------------------------------

	const preset = $derived(matchPreset(code));

	function loadPreset(p: Preset<LispProgram>) {
		code = p.value.code;
		runCode();
	}

	function onEditorKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			runCode();
		}
	}

	function setTrace(on: boolean) {
		trace = on;
		runCode();
	}

	let codeArea = $state<HTMLElement>();
	let exercisesArea = $state<HTMLElement>();
	let editorElement = $state<HTMLTextAreaElement>();
	let traceView = $state<ReturnType<typeof TraceView>>();

	function reveal(el: HTMLElement | undefined) {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
	}

	async function openInEditor(text: string) {
		code = text;
		runCode();
		await tick();
		reveal(codeArea);
		editorElement?.focus({ preventScroll: true });
	}

	// ------------------------------------------------------------------
	// Exercises
	// ------------------------------------------------------------------

	const exercise = $derived(exerciseById(exerciseId)!);
	const list = $derived(exercisesFor(mode));
	const position = $derived(list.findIndex((e) => e.id === exerciseId));
	const exerciseOptions = $derived(
		list.map((e, i) => ({ value: e.id, label: `${i + 1}. ${e.title}` }))
	);
	const modeOptions: { value: ExerciseMode; label: string; title: string }[] = [
		{ value: 'interpret', label: 'Interpret', title: 'Type what expressions return' },
		{ value: 'write', label: 'Write', title: 'Define functions that pass test calls' }
	];

	function setMode(next: ExerciseMode) {
		if (next === mode) return;
		lastByMode[mode] = exerciseId;
		mode = next;
		exerciseId = lastByMode[next];
	}

	function setExercise(id: string) {
		exerciseId = id;
		lastByMode[mode] = id;
	}

	function setAttempt(id: string, value: string | null) {
		if (value === null) delete attempts[id];
		else attempts[id] = value;
	}

	const fmt = (n: number) => n.toLocaleString('en-US');
	const resultsSubtitle = $derived(
		run.read ? `${fmt(run.forms.length)} form${run.forms.length === 1 ? '' : 's'}` : 'not run'
	);
	const traceSubtitle = $derived(
		trace ? `${fmt(run.trace.length)} line${run.trace.length === 1 ? '' : 's'}` : 'off'
	);
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu
			presets={LISP_PRESETS}
			selected={preset?.id ?? null}
			onselect={loadPreset}
			label="Examples"
			align="end"
		/>
	{/snippet}

	<div class="tool">
		<div class="workspace">
			<div class="code-area" bind:this={codeArea}>
				<Panel title="Code" subtitle="definitions and expressions, evaluated in order">
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="editor" onkeydown={onEditorKeydown}>
						<CodeEditor
							label="Lisp code"
							value={code}
							language="lisp"
							highlight={highlightLisp}
							{diagnostics}
							source={null}
							minRows={14}
							maxRows={30}
							bind:element={editorElement}
							oninput={(v) => (code = v)}
						/>
					</div>
					<div class="run-row">
						<Button variant="primary" onclick={runCode}>
							{#snippet icon()}<Icon name="play" />{/snippet}
							Run
						</Button>
						<span class="shortcut"><Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> runs</span>
						{#if edited}
							<Badge tone="active">Edited since the last run</Badge>
						{/if}
					</div>
					{#if preset}
						<p class="preset-note">
							<strong>{preset.label}.</strong>
							{preset.description}
						</p>
					{/if}
				</Panel>
			</div>

			<div class="side">
				<Panel title="Results" subtitle={resultsSubtitle}>
					{#if !run.read}
						<Callout tone="error">
							The code could not be read, so nothing was evaluated. The problems are listed under
							the editor.
						</Callout>
					{:else if !run.forms.length}
						<p class="muted">No forms to evaluate.</p>
					{:else}
						<ResultsList
							forms={run.forms}
							ontrace={trace && run.trace.length ? (line) => traceView?.show(line) : undefined}
						/>
					{/if}
					<p class="run-summary" aria-live="polite">{summarizeRun(run)}</p>
				</Panel>

				<Panel title="REPL" subtitle="one expression at a time">
					<Repl evaluate={evaluateLine} session={sessionId} />
				</Panel>
			</div>
		</div>

		<Panel title="Trace" subtitle={traceSubtitle}>
			<div class="trace-body">
				<Toggle
					label="Trace calls to user functions"
					description="Records each call to a function defined with DEFUN and the value it returns, indented by depth as Common Lisp’s TRACE prints them."
					checked={trace}
					onchange={setTrace}
				/>
				{#if !trace}
					<p class="muted">Tracing is off.</p>
				{:else if !run.trace.length}
					<p class="muted">The last run made no calls to functions defined with DEFUN.</p>
				{:else}
					<TraceView {run} bind:this={traceView} />
				{/if}
			</div>
		</Panel>

		<div class="exercises-area" bind:this={exercisesArea}>
			<Panel
				title="Exercises"
				subtitle="{mode === 'interpret' ? 'Interpret' : 'Write'} · {position + 1} of {list.length}"
			>
				<div class="exercise-bar">
					<SegmentedControl
						label="Exercise type"
						options={modeOptions}
						value={mode}
						onchange={setMode}
					/>
					<div class="picker">
						<IconButton
							icon="chevron-left"
							label="Previous exercise"
							disabled={position <= 0}
							onclick={() => setExercise(list[position - 1].id)}
						/>
						<Select
							label="Exercise"
							hideLabel
							size="sm"
							options={exerciseOptions}
							value={exerciseId}
							onchange={setExercise}
						/>
						<IconButton
							icon="chevron-right"
							label="Next exercise"
							disabled={position >= list.length - 1}
							onclick={() => setExercise(list[position + 1].id)}
						/>
					</div>
				</div>
				<p class="mode-note">
					{#if mode === 'interpret'}
						Type what each expression returns, as Lisp prints it (or <code>error</code>), and Check.
						Answers are read as Lisp data, so spacing and case do not matter.
					{:else}
						Define the function in the editor below; Check evaluates the definition and runs each
						test call.
					{/if}
				</p>
				<h3 class="exercise-title">{exercise.title}</h3>
				{#key exercise.id}
					{#if exercise.mode === 'interpret'}
						<InterpretExercise {exercise} onopen={openInEditor} />
					{:else}
						<WriteExercise
							{exercise}
							attempt={attempts[exercise.id] ?? null}
							onattempt={(v) => setAttempt(exercise.id, v)}
							onopen={openInEditor}
						/>
					{/if}
				{/key}
			</Panel>
		</div>

		<Panel title="Reference" subtitle="supported forms and functions">
			<ReferenceCard />
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
	.workspace {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		align-items: start;
	}
	@media (min-width: 1040px) {
		.workspace {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
	}
	.code-area,
	.exercises-area {
		min-width: 0;
		scroll-margin-top: calc(56px + var(--space-3));
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}
	.run-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		margin-top: var(--space-3);
	}
	.shortcut {
		color: var(--text-3);
		font-size: var(--text-sm);
	}
	@media (hover: none) {
		.shortcut {
			display: none;
		}
	}
	.preset-note {
		margin: var(--space-3) 0 0;
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--accent);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--accent-soft);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.muted {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.run-summary {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.trace-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.exercise-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	.picker {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
		flex: 0 1 24rem;
	}
	.picker :global(.field),
	.picker :global(.select) {
		flex: 1 1 auto;
		min-width: 0;
	}
	.mode-note {
		margin: var(--space-3) 0 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.exercise-title {
		margin: var(--space-4) 0 var(--space-3);
		font-size: var(--text-xl);
	}
</style>
