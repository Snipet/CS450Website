<!--
@component
A Write exercise: the task, the test calls, an editor for the definition,
Check (runs the tests and shows each actual value), and a reference solution.
-->
<script lang="ts">
	import { Button, CodeEditor, Disclosure, Icon } from '$lib/components/ui';
	import { highlightLisp, readAll } from '$lib/theory/lisp';
	import { ATTEMPT_SOURCE, checkWrite, summarizeWrite, type WriteCheck } from './check';
	import type { WriteExercise } from './exercises';
	import LispCode from './LispCode.svelte';

	interface Props {
		exercise: WriteExercise;
		/** The code typed so far, or null for the starter. */
		attempt: string | null;
		onattempt: (code: string | null) => void;
		/** Opens code in the page's editor. */
		onopen: (code: string) => void;
	}

	let { exercise, attempt, onattempt, onopen }: Props = $props();

	const code = $derived(attempt ?? exercise.starter);
	/** The check of `checked` (cleared when the code changes). */
	let result = $state.raw<{ code: string; check: WriteCheck } | null>(null);
	const check = $derived(result && result.code === code ? result.check : null);
	const diagnostics = $derived(
		check ? check.diagnostics : readAll(code, { source: ATTEMPT_SOURCE }).diagnostics
	);
	const summary = $derived(check ? summarizeWrite(exercise, check) : '');

	function run() {
		result = { code, check: checkWrite(exercise, code) };
	}

	function edit(value: string) {
		onattempt(value === exercise.starter ? null : value);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			run();
		}
	}
</script>

<div class="write">
	<p class="task">{exercise.description}</p>

	<div class="tests-wrap">
		<table class="tests">
			<caption class="visually-hidden">Test calls</caption>
			<thead>
				<tr>
					<th scope="col">Call</th>
					<th scope="col">Expected</th>
					{#if check?.read}
						<th scope="col">Actual</th>
						<th scope="col"><span class="visually-hidden">Result</span></th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each exercise.tests as t, i (i)}
					{@const outcome = check?.read ? check.tests[i] : null}
					<tr class={[outcome && (outcome.pass ? 'pass' : 'fail')]}>
						<td class="call"><LispCode code={t.call} inline /></td>
						<td class="expected" data-label="Expected"><code class="value">{t.expected}</code></td>
						{#if outcome}
							<td class="actual" data-label="Actual">
								{#if outcome.error}
									<span class="error">{outcome.error}</span>
								{:else}
									<code class="value">{outcome.printed}</code>
								{/if}
							</td>
							<td class="mark">
								<Icon
									name={outcome.pass ? 'success' : 'error'}
									size={16}
									label={outcome.pass ? 'Passes' : 'Fails'}
								/>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="editor" {onkeydown}>
		<CodeEditor
			label="Definition of {exercise.name}"
			value={code}
			language="lisp"
			highlight={highlightLisp}
			{diagnostics}
			source={ATTEMPT_SOURCE}
			minRows={5}
			maxRows={18}
			oninput={edit}
		/>
	</div>

	<div class="actions">
		<Button variant="primary" size="sm" onclick={run}>
			{#snippet icon()}<Icon name="check" />{/snippet}
			Check
		</Button>
		<Button size="sm" variant="ghost" disabled={attempt === null} onclick={() => onattempt(null)}>
			{#snippet icon()}<Icon name="reset" />{/snippet}
			Reset to the starter
		</Button>
		<Button
			size="sm"
			variant="ghost"
			onclick={() => onopen(`${code}\n\n${exercise.tests.map((t) => t.call).join('\n')}\n`)}
		>
			{#snippet icon()}<Icon name="pencil" />{/snippet}
			Open in the editor
		</Button>
		<span class="shortcut">Ctrl+Enter checks</span>
	</div>

	<p class={['summary', check && (check.complete ? 'pass' : 'fail')]} aria-live="polite">
		{summary}
	</p>

	<Disclosure summary="Show a reference solution" openSummary="Hide the reference solution">
		<div class="solution">
			<LispCode code={exercise.solution} label="Reference solution" />
			<Button size="sm" variant="ghost" onclick={() => onattempt(exercise.solution)}>
				Copy into the answer editor
			</Button>
		</div>
	</Disclosure>
</div>

<style>
	.write {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.task {
		margin: 0;
	}
	.tests-wrap {
		overflow-x: auto;
		min-width: 0;
	}
	.tests {
		width: 100%;
		font-size: var(--text-sm);
	}
	.tests th {
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--border-strong);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.03em;
		text-align: left;
	}
	.tests td {
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--border);
		vertical-align: top;
		overflow-wrap: anywhere;
	}
	.tests tr.pass td {
		background: var(--accept-soft);
	}
	.tests tr.fail td {
		background: var(--reject-soft);
	}
	.value {
		padding: 0;
		border: 0;
		background: none;
		font-weight: 600;
	}
	.error {
		color: var(--reject);
	}
	.mark {
		width: 1.5rem;
	}
	/* Narrow screens: each test is a block with the call on its own line. */
	@media (max-width: 560px) {
		.tests thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
		}
		.tests,
		.tests tbody {
			display: block;
		}
		.tests tr {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 2px var(--space-3);
			padding: var(--space-2);
			border-bottom: 1px solid var(--border);
		}
		.tests tr.pass {
			background: var(--accept-soft);
		}
		.tests tr.fail {
			background: var(--reject-soft);
		}
		.tests td {
			display: block;
			padding: 0;
			border: 0;
			background: none !important;
		}
		.tests td.call {
			flex: 1 1 100%;
		}
		.tests td.expected,
		.tests td.actual {
			flex: 0 1 auto;
		}
		.tests td.actual {
			flex: 1 1 0;
			min-width: 0;
		}
		.tests td[data-label]::before {
			content: attr(data-label) ': ';
			color: var(--text-3);
			font-size: var(--text-xs);
		}
		.tests td.mark {
			width: auto;
		}
	}
	tr.pass .mark {
		color: var(--accept);
	}
	tr.fail .mark {
		color: var(--reject);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.shortcut {
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	@media (hover: none) {
		.shortcut {
			display: none;
		}
	}
	.summary {
		margin: 0;
		min-height: 1.4em;
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.summary.pass {
		color: var(--accept);
	}
	.summary.fail {
		color: var(--reject);
	}
	.solution {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}
	.solution :global(.lisp-block) {
		align-self: stretch;
	}
</style>
