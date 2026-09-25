<!--
@component
The h table: one row per state with h(n) (editable), the true cost h*(n),
and h*(n) − h(n), marked ✓ when h(n) ≤ h*(n) (Informed Search, slide 25).
Clicking a state name selects its row.
-->
<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import NumberField from '$lib/components/ui/NumberField.svelte';
	import { formatValue, stepFor } from './edit';
	import type { HRow } from './analysis';

	interface Props {
		rows: readonly HRow[];
		selected: string | null;
		/** Values cannot be edited (the graph text has errors). */
		disabled?: boolean;
		/** Scrolls this state's row into view when it changes (a state picked elsewhere). */
		reveal?: { id: string; n: number } | null;
		onselect: (id: string) => void;
		onedit: (id: string, value: number) => void;
	}

	let { rows, selected, disabled = false, reveal = null, onselect, onedit }: Props = $props();

	let body = $state<HTMLTableSectionElement>();

	$effect(() => {
		const id = reveal?.id;
		if (!id || !body) return;
		const row = body.querySelector<HTMLElement>(`tr[data-state="${CSS.escape(id)}"]`);
		if (!row || row.contains(document.activeElement)) return;
		const r = row.getBoundingClientRect();
		if (r.top >= 64 && r.bottom <= window.innerHeight) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		row.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
	});

	const marginText = (r: HRow) => (Number.isFinite(r.hStar) ? formatValue(r.margin) : '∞');
</script>

{#snippet marginMark(r: HRow)}
	<span class={['margin', r.admissible ? 'ok' : 'bad']}>
		<Icon name={r.admissible ? 'check' : 'x'} size={14} />
		<span class="visually-hidden">{r.admissible ? 'h(n) ≤ h*(n):' : 'h(n) > h*(n), over by'}</span>
		<span class="mono">{r.admissible ? marginText(r) : formatValue(-r.margin)}</span>
		{#if !r.admissible}<span class="over-word" aria-hidden="true">over</span>{/if}
	</span>
{/snippet}

<div class="wrap">
	<table>
		<caption class="visually-hidden">
			h(n), the true cost h*(n), and their difference for every state
		</caption>
		<thead>
			<tr>
				<th scope="col">State</th>
				<th scope="col" class="num">h(n)</th>
				<th scope="col" class="num">h*(n)</th>
				<th scope="col" class="num col-margin">h*(n) − h(n)</th>
			</tr>
		</thead>
		<tbody bind:this={body}>
			{#each rows as r (r.id)}
				<tr data-state={r.id} class={{ selected: selected === r.id, over: !r.admissible }}>
					<th scope="row">
						<div class="state">
							<button
								type="button"
								class="name"
								aria-pressed={selected === r.id}
								title="Select {r.id}"
								onclick={() => onselect(r.id)}>{r.id}</button
							>
							{#if r.start}<span class="tag">start</span>{/if}
							{#if r.goal}<span class="tag goal">goal</span>{/if}
						</div>
					</th>
					<td class="num">
						<div class="field">
							<NumberField
								label="h({r.id})"
								hideLabel
								size="sm"
								value={r.h}
								min={0}
								step={stepFor(r.h)}
								{disabled}
								onchange={(v) => onedit(r.id, v)}
							/>
						</div>
					</td>
					<td class="num mono">
						{formatValue(r.hStar)}
						<span class="inline-margin">{@render marginMark(r)}</span>
					</td>
					<td class="num col-margin">{@render marginMark(r)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.wrap {
		container-type: inline-size;
		min-width: 0;
		overflow-x: auto;
	}
	.inline-margin {
		display: none;
	}
	/* Narrow: h*(n) − h(n) goes under h*(n). */
	@container (max-width: 26rem) {
		.col-margin {
			display: none;
		}
		.inline-margin {
			display: block;
			font-size: var(--text-xs);
		}
		th,
		th:first-child,
		td {
			padding-left: 4px;
			padding-right: 4px;
		}
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 3px var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}
	thead th {
		padding-top: 0;
		padding-bottom: var(--space-2);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}
	th:first-child {
		padding-left: var(--space-1);
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
	}
	tbody tr {
		transition: background var(--duration) var(--ease);
	}
	tbody tr.over {
		background: color-mix(in srgb, var(--reject-soft) 70%, transparent);
	}
	tbody tr.selected {
		background: var(--accent-soft);
		box-shadow: inset 3px 0 0 var(--accent);
	}
	.state {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px var(--space-2);
		min-width: 0;
	}
	.name {
		padding: 2px 4px;
		margin-left: -4px;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text);
		font: inherit;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
	}
	.name:hover {
		color: var(--accent);
		text-decoration: underline;
	}
	.name[aria-pressed='true'] {
		color: var(--accent);
		font-weight: 650;
	}
	.tag {
		padding: 0 5px;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--text-3);
		font-size: 0.6875rem;
		line-height: 1.5;
	}
	.tag.goal {
		border-color: color-mix(in srgb, var(--accept) 50%, var(--border));
		color: var(--accept);
	}
	.field {
		display: flex;
		justify-content: flex-end;
	}
	.margin {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
	}
	.margin.ok {
		color: var(--text-2);
	}
	.margin.ok :global(svg) {
		color: var(--accept);
	}
	.margin.bad {
		color: var(--reject);
		font-weight: 600;
	}
	.over-word {
		font-size: var(--text-xs);
		font-weight: 500;
	}
</style>
