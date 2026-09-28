<!--
@component
Dominance and combining (Informed Search, slides 35 and 37): h (as h1)
against a second heuristic h2, state by state, with their pointwise maximum
and the nodes A* expands with each.
-->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import NumberField from '$lib/components/ui/NumberField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { formatCount } from '$lib/components/search/describe';
	import { formatValue, stepFor, stepFrom } from './edit';
	import {
		dominanceSentence,
		type DominanceReport,
		type RunReport,
		type SecondChoice,
		type SecondKind
	} from './analysis';
	import { SECOND_NAMES } from './second';
	import { DEFAULT_FACTOR, MAX_FACTOR, MIN_FACTOR, SECOND_KINDS } from './state';

	interface Props {
		report: DominanceReport;
		second: SecondChoice;
		/** What h1 and h2 are. */
		labels: { h1: string; h2: string };
		/** A* tree search with h1, h2, and max{h1, h2}. */
		runs: { h1: RunReport; h2: RunReport; max: RunReport };
		/** Whether the problem comes from a preset (enables "the preset's heuristic"). */
		hasPreset: boolean;
		disabled?: boolean;
		onsecond: (choice: SecondChoice) => void;
		/** Copy the values of h2 into a custom h2, or edit one of them. */
		oncustom: (id: string | null, value?: number) => void;
		onapply: (which: 'h2' | 'max') => void;
	}

	let {
		report,
		second,
		labels,
		runs,
		hasPreset,
		disabled = false,
		onsecond,
		oncustom,
		onapply
	}: Props = $props();

	const options = $derived(
		SECOND_KINDS.map((k) => ({
			value: k,
			label: SECOND_NAMES[k],
			disabled: k === 'preset' && !hasPreset
		}))
	);

	function choose(kind: SecondKind) {
		if (kind === second.kind) return;
		if (kind === 'scaled') onsecond({ kind, factor: DEFAULT_FACTOR });
		else if (kind === 'custom') oncustom(null);
		else onsecond({ kind });
	}

	const n = formatValue;
	const cmpSymbol = (c: -1 | 0 | 1) => (c === 0 ? '=' : c < 0 ? '>' : '<');

	const runRows = $derived([
		{ key: 'h1', name: 'h1', label: labels.h1, run: runs.h1 },
		{ key: 'h2', name: 'h2', label: labels.h2, run: runs.h2 },
		{ key: 'max', name: 'max{h1, h2}', label: 'the larger value at each state', run: runs.max }
	]);
</script>

<div class="box">
	<div class="dominance">
		<div class="side">
			<div class="controls">
				<Select
					label="h2"
					inline
					size="sm"
					{options}
					value={second.kind}
					onchange={choose}
					{disabled}
				/>
				{#if second.kind === 'scaled'}
					<NumberField
						label="Factor"
						inline
						size="sm"
						value={second.factor}
						min={MIN_FACTOR}
						max={MAX_FACTOR}
						step={stepFrom(second.factor, 0.1)}
						{disabled}
						onchange={(v) => onsecond({ kind: 'scaled', factor: v })}
					/>
				{/if}
			</div>

			<p class="sentence">{dominanceSentence(report)}</p>
			<ul class="badges" aria-label="Admissibility">
				<li>
					<Badge tone={report.admissible1 ? 'accept' : 'reject'}>
						h1 {report.admissible1 ? 'admissible' : 'not admissible'}
					</Badge>
				</li>
				<li>
					<Badge tone={report.admissible2 ? 'accept' : 'reject'}>
						h2 {report.admissible2 ? 'admissible' : 'not admissible'}
					</Badge>
				</li>
				<li>
					<Badge tone={report.admissibleMax ? 'accept' : 'reject'}>
						max {report.admissibleMax ? 'admissible' : 'not admissible'}
					</Badge>
				</li>
			</ul>

			<table class="runs">
				<caption>A* tree search with each heuristic</caption>
				<thead>
					<tr>
						<th scope="col">Heuristic</th>
						<th scope="col" class="num">Expanded</th>
						<th scope="col" class="num">Cost</th>
					</tr>
				</thead>
				<tbody>
					{#each runRows as r (r.key)}
						<tr>
							<th scope="row">
								<span class="sym">{r.name}</span>
								<span class="what">{r.label}</span>
							</th>
							<td class="num">
								{formatCount(r.run.expanded)}{#if r.run.stopped}<span class="muted">
										(limit)</span
									>{/if}
							</td>
							<td class="num">
								{#if r.run.cost !== null}
									{#if r.run.optimal === false}<span class="bad"
											><span class="over">&gt; C*</span> {n(r.run.cost)}</span
										>{:else}{n(r.run.cost)}{/if}
								{:else}
									<span class="muted">–</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="actions">
				<Button size="sm" {disabled} onclick={() => onapply('max')}>
					{#snippet icon()}<Icon name="arrow-right" />{/snippet}
					Use max&#123;h1, h2&#125; as h
				</Button>
				<Button size="sm" variant="ghost" {disabled} onclick={() => onapply('h2')}
					>Use h2 as h</Button
				>
				{#if second.kind !== 'custom'}
					<Button size="sm" variant="ghost" {disabled} onclick={() => oncustom(null)}>
						{#snippet icon()}<Icon name="pencil" />{/snippet}
						Edit a copy of h2
					</Button>
				{/if}
			</div>
		</div>

		<!-- A scrollable region must be focusable to scroll by keyboard. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="wrap" role="region" aria-label="h1, h2 and their maximum by state" tabindex="0">
			<table class="values">
				<caption class="visually-hidden">h1, h2 and max&#123;h1, h2&#125; for every state</caption>
				<thead>
					<tr>
						<th scope="col">State</th>
						<th scope="col" class="num">h1(n)</th>
						<th scope="col" class="cmp"><span class="visually-hidden">h1 against h2</span></th>
						<th scope="col" class="num">h2(n)</th>
						<th scope="col" class="num">max</th>
					</tr>
				</thead>
				<tbody>
					{#each report.rows as r (r.id)}
						<tr>
							<th scope="row">{r.id}</th>
							<td class={['num', 'mono', { larger: r.cmp < 0 }]}>
								{n(r.h1)}{#if r.cmp < 0}<span class="visually-hidden">&nbsp;(larger)</span>{/if}
							</td>
							<td class="cmp" aria-hidden="true">{cmpSymbol(r.cmp)}</td>
							<td class={['num', 'mono', { larger: r.cmp > 0 }]}>
								{#if second.kind === 'custom'}
									<div class="field">
										<NumberField
											label="h2({r.id})"
											hideLabel
											size="sm"
											value={r.h2}
											min={0}
											step={stepFor(r.h2)}
											{disabled}
											onchange={(v) => oncustom(r.id, v)}
										/>
									</div>
								{:else}
									{n(r.h2)}
								{/if}
								{#if r.cmp > 0}<span class="visually-hidden">&nbsp;(larger)</span>{/if}
							</td>
							<td class="num mono">{n(r.max)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.box {
		container-type: inline-size;
		min-width: 0;
	}
	.dominance {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-3) var(--space-5);
		align-items: start;
		min-width: 0;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.sentence {
		margin: 0;
		line-height: 1.55;
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	caption {
		padding-bottom: var(--space-1);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-align: left;
		text-transform: uppercase;
	}
	th,
	td {
		padding: 4px var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}
	th:first-child {
		padding-left: 0;
	}
	tbody th {
		font-weight: 500;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.sym {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	.what {
		display: block;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 400;
		overflow-wrap: anywhere;
	}
	.runs tbody th {
		padding-top: 5px;
		padding-bottom: 5px;
	}
	.bad {
		color: var(--reject);
		font-weight: 600;
		white-space: nowrap;
	}
	.over {
		font-size: var(--text-xs);
		font-weight: 500;
	}
	.muted {
		color: var(--text-3);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.wrap {
		container-type: inline-size;
		max-height: 22rem;
		min-width: 0;
		overflow: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.wrap:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.values thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		padding-top: 5px;
		padding-bottom: 5px;
		background: var(--surface-2);
	}
	.values th:first-child {
		padding-left: var(--space-3);
	}
	.values tbody tr:last-child th,
	.values tbody tr:last-child td {
		border-bottom: 0;
	}
	.cmp {
		width: 1.5rem;
		color: var(--text-3);
		text-align: center;
	}
	.larger {
		color: var(--heuristic);
		font-weight: 650;
	}
	.field {
		display: flex;
		justify-content: flex-end;
	}
	/* Narrow: no comparison column, tighter cells. */
	@container (max-width: 24rem) {
		.cmp {
			display: none;
		}
		.values th,
		.values th:first-child,
		.values td {
			padding-left: 5px;
			padding-right: 5px;
		}
	}
	/* Wide: the summary beside the values. */
	@container (min-width: 46rem) {
		.side,
		.wrap {
			grid-row: 1;
		}
		.dominance {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
		.wrap {
			max-height: 30rem;
		}
	}
</style>
