<script lang="ts">
	import { Button, Icon, Select } from '$lib/components/ui';
	import {
		PERCEPTS,
		VACUUM_ACTIONS,
		formatPercept,
		type VacuumAction
	} from '$lib/theory/agents/vacuum';

	interface Props {
		/** Actions in PERCEPTS order. */
		actions: readonly VacuumAction[];
		/** Row of the current percept (null: none). */
		current: number | null;
		/** Whether `actions` are the reflex program's (disables the reset button). */
		isReflex: boolean;
		onchange: (actions: VacuumAction[]) => void;
		onreset: () => void;
	}

	let { actions, current, isReflex, onchange, onreset }: Props = $props();

	const options = VACUUM_ACTIONS.map((a) => ({ value: a, label: a }));

	function set(i: number, action: VacuumAction) {
		const next = [...actions];
		next[i] = action;
		onchange(next);
	}
</script>

<div class="table-editor">
	<table>
		<caption class="visually-hidden">Percept → action table</caption>
		<thead>
			<tr>
				<th scope="col">Percept</th>
				<th scope="col">Action</th>
			</tr>
		</thead>
		<tbody>
			{#each PERCEPTS as percept, i (i)}
				<tr class={{ current: i === current }} aria-current={i === current ? 'true' : undefined}>
					<th scope="row" class="percept">{formatPercept(percept)}</th>
					<td>
						<Select
							label="Action for {formatPercept(percept)}"
							hideLabel
							size="sm"
							{options}
							value={actions[i]}
							onchange={(a) => set(i, a)}
						/>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<Button size="sm" variant="ghost" disabled={isReflex} onclick={onreset}>
		{#snippet icon()}<Icon name="reset" size={15} />{/snippet}
		Slide 3 rules
	</Button>
</div>

<style>
	.table-editor {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}
	table {
		width: 100%;
		max-width: 22rem;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: var(--space-1) var(--space-3) var(--space-1) var(--space-2);
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
	.percept {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-variant-ligatures: none;
		font-weight: 500;
		white-space: nowrap;
	}
	tr.current th,
	tr.current td {
		background: var(--active-soft);
	}
	tr.current th {
		box-shadow: inset 3px 0 var(--active);
	}
	td :global(.field) {
		max-width: 8rem;
	}
</style>
