<!--
@component
The strategy table as a quiz: a choice per strategy and property, graded
against the table of the slides. "Show answers" fills in the slide's text and
the qualifications from the per-strategy slides.
-->
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Callout from '$lib/components/ui/Callout.svelte';
	import Disclosure from '$lib/components/ui/Disclosure.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import {
		CHOICES,
		COLUMNS,
		QUIZ_ROWS,
		gradeQuiz,
		type Column,
		type QuizAnswers,
		type QuizGrade
	} from './practice/properties-quiz';

	type Answers = QuizAnswers & Record<string, Record<Column, string>>;
	const blank = (): Answers =>
		Object.fromEntries(
			QUIZ_ROWS.map((r) => [r.strategy, { complete: '', optimal: '', time: '', space: '' }])
		);

	let answers = $state<Answers>(blank());
	let grade = $state<QuizGrade | null>(null);
	let revealed = $state(false);

	const options = (column: Column) => [
		{ value: '', label: '—' },
		...CHOICES[column].map((c) => ({ value: c.id, label: c.label }))
	];

	function mark(strategy: string, column: Column): boolean | null {
		return grade ? grade.cells[strategy][column] : null;
	}

	function reset() {
		answers = blank();
		grade = null;
		revealed = false;
	}
</script>

<div class="quiz">
	<p class="prompt">
		Fill in the table of Informed Search, slide 42. Time is the worst case; b is the branching
		factor, d the depth of the optimal solution, m the maximum depth, C* the optimal cost.
	</p>

	<div class="table" role="group" aria-label="Strategy properties">
		<div class="row head" aria-hidden="true">
			<span>Strategy</span>
			{#each COLUMNS as c (c.id)}<span>{c.label}</span>{/each}
		</div>
		{#each QUIZ_ROWS as row (row.strategy)}
			<div class="row">
				<span class="name">{row.name}</span>
				{#each COLUMNS as c (c.id)}
					{@const ok = mark(row.strategy, c.id)}
					<div class={['cell', { right: ok === true, wrong: ok === false }]}>
						<span class="cell-label" aria-hidden="true">{c.label}</span>
						<div class="select-line">
							<Select
								label="{row.name}: {c.label}"
								hideLabel
								size="sm"
								options={options(c.id)}
								bind:value={answers[row.strategy][c.id]}
								onchange={() => (grade = null)}
							/>
							{#if ok !== null}
								<span class="mark" aria-label={ok ? 'right' : 'wrong'}>
									<Icon name={ok ? 'check' : 'x'} size={15} />
								</span>
							{/if}
						</div>
						{#if revealed}<span class="answer">{row.text[c.id]}</span>{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<div class="buttons">
		<Button variant="primary" size="sm" onclick={() => (grade = gradeQuiz(answers))}>Check</Button>
		<Button size="sm" onclick={() => (revealed = !revealed)}>
			{revealed ? 'Hide answers' : 'Show answers'}
		</Button>
		<Button size="sm" variant="ghost" onclick={reset}>Clear</Button>
	</div>

	<div aria-live="polite">
		{#if grade}
			<Callout tone={grade.right === grade.total ? 'success' : 'info'}>
				{grade.right} of {grade.total} right{grade.answered < grade.total
					? ` (${grade.total - grade.answered} not answered)`
					: ''}.
			</Callout>
		{/if}
	</div>

	{#if revealed}
		<Disclosure summary="Qualifications from the slides">
			<dl class="notes">
				{#each QUIZ_ROWS as row (row.strategy)}
					<dt>{row.name}</dt>
					<dd>
						<ul>
							{#each row.notes as note, i (i)}<li>{note}</li>{/each}
						</ul>
					</dd>
				{/each}
			</dl>
		</Disclosure>
	{/if}
</div>

<style>
	.quiz {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.prompt {
		margin: 0;
	}
	.table {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.row {
		display: grid;
		grid-template-columns: 4.5rem repeat(4, minmax(0, 1fr));
		align-items: start;
		gap: var(--space-2);
	}
	.head {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}
	.name {
		padding-top: 5px;
		font-weight: 600;
	}
	.cell {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.cell-label {
		display: none;
	}
	.select-line {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}
	.select-line :global(.field) {
		flex: 1;
	}
	.right :global(select) {
		border-color: var(--accept);
	}
	.wrong :global(select) {
		border-color: var(--reject);
	}
	.mark {
		display: flex;
		flex: none;
	}
	.right .mark {
		color: var(--accept);
	}
	.wrong .mark {
		color: var(--reject);
	}
	.answer {
		color: var(--text-2);
		font-size: var(--text-xs);
		line-height: 1.4;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.notes {
		margin: 0;
		font-size: var(--text-sm);
	}
	.notes dt {
		font-weight: 600;
	}
	.notes dd {
		margin: 0 0 var(--space-2);
	}
	.notes ul {
		margin: 0;
		padding-left: var(--space-5);
	}
	@media (max-width: 720px) {
		.head {
			display: none;
		}
		.row {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			padding-bottom: var(--space-3);
			border-bottom: 1px solid var(--border);
		}
		.name {
			grid-column: 1 / -1;
			padding-top: 0;
		}
		.cell-label {
			display: block;
			color: var(--text-3);
			font-size: var(--text-xs);
		}
	}
</style>
