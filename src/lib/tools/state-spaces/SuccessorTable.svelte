<!--
@component
What the successor function returns for a state (Solving Problems by
Searching, slide 14): one row per applicable action with the resulting state
and the step cost. Each resulting state is a button that selects it.
-->
<script lang="ts">
	import type { ProblemId } from './content';
	import MiniBoard from './MiniBoard.svelte';
	import type { SuccessorRow } from './space';
	import VacuumGlyph from './VacuumGlyph.svelte';

	interface Props {
		problem: ProblemId;
		/** The state the successor function was applied to (display name). */
		stateLabel: string;
		rows: readonly SuccessorRow[];
		onselect: (state: string) => void;
	}

	let { problem, stateLabel, rows, onselect }: Props = $props();

	/** Screen-reader name of a resulting state. */
	function stateName(state: string): string {
		if (problem !== 'puzzle') return state;
		return [0, 1, 2]
			.map((r) =>
				[...state.slice(r * 3, r * 3 + 3)].map((d) => (d === '0' ? 'blank' : d)).join(' ')
			)
			.join(', ');
	}
</script>

<table class="succ">
	<caption class="visually-hidden">Successors of {stateLabel}</caption>
	<thead>
		<tr>
			<th scope="col">Action</th>
			<th scope="col">Successor state</th>
			<th scope="col" class="num">Step cost</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as r (r.action)}
			<tr class={{ same: r.same }}>
				<th scope="row" class="action">
					{r.action}
					{#if r.note}<span class="action-note">{r.note}</span>{/if}
				</th>
				<td>
					<button
						type="button"
						class="state"
						aria-label="{r.same ? 'Unchanged: ' : ''}{stateName(
							r.state
						)}. Apply the successor function to it"
						onclick={() => onselect(r.state)}
					>
						{#if problem === 'vacuum'}
							{@const w = 27 * (r.state.length - 2)}
							<svg
								class="glyph"
								viewBox="-0.5 -0.5 {w + 1} 25"
								width={(w + 1) * 0.75}
								height={25 * 0.75}
								aria-hidden="true"
							>
								<VacuumGlyph name={r.state} width={w} height={24} frame />
							</svg>
							<span class="mono">{r.state}</span>
						{:else if problem === 'puzzle'}
							<MiniBoard board={r.state} size="xs" />
						{:else}
							<span>{r.state}</span>
						{/if}
						{#if r.same}<span class="unchanged">no change</span>{/if}
					</button>
				</td>
				<td class="num">{r.cost}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.succ {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 6px var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}
	thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.action {
		font-weight: 600;
		white-space: nowrap;
	}
	.action-note {
		display: block;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 400;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	td.num {
		white-space: nowrap;
	}
	@media (max-width: 480px) {
		th,
		td {
			padding-inline: 4px;
		}
		.state {
			gap: 2px var(--space-2);
		}
	}
	.state {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		max-width: 100%;
		margin: -3px -6px;
		padding: 3px 6px;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--accent);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.state:hover {
		border-color: var(--border);
		background: var(--accent-soft);
	}
	.glyph {
		display: block;
		flex: none;
		overflow: visible;
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-ligatures: none;
		white-space: nowrap;
	}
	.unchanged {
		color: var(--text-3);
		font-size: var(--text-xs);
		white-space: nowrap;
	}
	.same .action {
		color: var(--text-2);
	}
</style>
