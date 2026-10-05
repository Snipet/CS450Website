<!--
@component
An Interpret exercise: definitions, then expressions whose printed results
are typed in and checked (read as Lisp data and compared with EQUAL). Each
answer can be revealed with its output and trace.
-->
<script lang="ts">
	import { Button, Disclosure, Icon } from '$lib/components/ui';
	import { formatTrace } from '$lib/theory/lisp';
	import { checkAnswer, runInterpret, type AnswerCheck } from './check';
	import type { InterpretExercise } from './exercises';
	import LispCode from './LispCode.svelte';
	import { displayOutput } from './view';

	interface Props {
		exercise: InterpretExercise;
		/** Opens the exercise's code in the editor. */
		onopen: (code: string) => void;
	}

	let { exercise, onopen }: Props = $props();

	const uid = $props.id();
	const run = $derived(runInterpret(exercise));
	// Reset when the exercise changes; overwritten as answers are typed and checked.
	let answers = $derived<string[]>(exercise.prompts.map(() => ''));
	let checks = $derived<(AnswerCheck | null)[]>(exercise.prompts.map(() => null));

	const replace = <T,>(xs: readonly T[], i: number, x: T): T[] =>
		xs.map((old, k) => (k === i ? x : old));

	function check(i: number) {
		checks = replace(checks, i, checkAnswer(answers[i], run.prompts[i]));
	}

	function edit(i: number, value: string) {
		answers = replace(answers, i, value);
		if (checks[i]) checks = replace(checks, i, null);
	}

	const program = $derived(
		[exercise.setup, ...exercise.prompts.map((p) => p.expr)].filter(Boolean).join('\n\n')
	);
	const correct = $derived(checks.filter((c) => c?.status === 'correct').length);
</script>

<div class="interpret">
	{#if exercise.setup}
		<div class="setup">
			<h4 class="label">Definitions</h4>
			<LispCode code={exercise.setup} label="Definitions" />
		</div>
	{/if}

	<ol class="prompts">
		{#each exercise.prompts as p, i (i)}
			{@const outcome = run.prompts[i]}
			{@const c = checks[i]}
			<li class="prompt">
				<label class="question" for="{uid}-a{i}">
					<span class="visually-hidden">Printed result of</span>
					<LispCode code={p.expr} inline />
				</label>
				<div class="answer-row">
					<span class="arrow" aria-hidden="true">⇒</span>
					<input
						id="{uid}-a{i}"
						class={['mono', c && c.status]}
						type="text"
						autocomplete="off"
						autocapitalize="off"
						spellcheck="false"
						placeholder="Result, or error"
						value={answers[i]}
						aria-describedby="{uid}-f{i}"
						aria-invalid={c && c.status !== 'correct' ? 'true' : undefined}
						oninput={(e) => edit(i, e.currentTarget.value)}
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.isComposing) {
								e.preventDefault();
								check(i);
							}
						}}
					/>
					<Button size="sm" onclick={() => check(i)}>Check</Button>
				</div>
				<p class={['feedback', c?.status]} id="{uid}-f{i}" aria-live="polite">
					{#if c}
						<Icon
							name={c.status === 'correct' ? 'success' : c.status === 'empty' ? 'info' : 'error'}
							size={15}
						/>
						{c.message}
					{/if}
				</p>
				<Disclosure summary="Show answer" openSummary="Hide answer">
					<div class="reveal">
						{#if outcome.error}
							<p class="result error">
								<strong>Error:</strong>
								{outcome.error}
							</p>
						{:else}
							<p class="result">
								<span class="arrow" aria-hidden="true">⇒</span> <code>{outcome.printed}</code>
							</p>
						{/if}
						{#if outcome.output}
							<div class="block">
								<h5 class="label">Output</h5>
								<pre>{displayOutput(outcome.output)}</pre>
							</div>
						{/if}
						{#if outcome.trace.length}
							<div class="block">
								<h5 class="label">Trace</h5>
								<pre>{formatTrace(outcome.trace)}</pre>
							</div>
						{/if}
					</div>
				</Disclosure>
			</li>
		{/each}
	</ol>

	<div class="footer">
		<p class="score" aria-live="polite">
			{correct} of {exercise.prompts.length} checked correct.
		</p>
		<Button size="sm" variant="ghost" onclick={() => onopen(program)}>
			{#snippet icon()}<Icon name="pencil" />{/snippet}
			Open in the editor
		</Button>
	</div>

	<Disclosure summary="Show note" openSummary="Hide note">
		<p class="note">{exercise.note}</p>
	</Disclosure>
</div>

<style>
	.interpret {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.label {
		margin: 0 0 var(--space-1);
		color: var(--text-3);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.prompts {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.prompt {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}
	.question {
		font-size: var(--text-base);
		font-weight: 500;
	}
	.answer-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		max-width: 34rem;
	}
	.arrow {
		color: var(--accept);
		font-weight: 600;
	}
	.answer-row input {
		flex: 1 1 auto;
		min-width: 0;
		height: 34px;
		padding: 0 10px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font-size: var(--text-sm);
	}
	.answer-row input:focus-visible {
		border-color: var(--accent);
	}
	.answer-row input::placeholder {
		color: var(--text-3);
	}
	.answer-row input.correct {
		border-color: var(--accept);
		background: var(--accept-soft);
	}
	.answer-row input.incorrect,
	.answer-row input.unreadable {
		border-color: var(--reject);
	}
	.feedback {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-height: 1.4em;
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.feedback.correct {
		color: var(--accept);
	}
	.feedback.incorrect,
	.feedback.unreadable {
		color: var(--reject);
	}
	.reveal {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.result {
		margin: 0;
		font-size: var(--text-sm);
	}
	.result code {
		font-weight: 600;
	}
	.result.error {
		color: var(--reject);
	}
	.block pre {
		padding: var(--space-1) var(--space-2);
		border-left: 3px solid var(--border-strong);
		background: var(--surface-2);
		font-size: 0.8125rem;
		white-space: pre;
		overflow-x: auto;
	}
	.footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}
	.score {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.note {
		margin: 0;
		font-size: var(--text-sm);
	}
</style>
