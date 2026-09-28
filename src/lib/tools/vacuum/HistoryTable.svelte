<script lang="ts">
	import { formatPercept, worldName, type VacuumStep } from '$lib/theory/agents/vacuum';
	import { formatNumber, signed } from './describe';

	interface Props {
		steps: readonly VacuumStep[];
		/** Index of the current step. */
		current: number;
		onselect: (index: number) => void;
	}

	let { steps, current, onselect }: Props = $props();

	let scroller: HTMLDivElement | undefined = $state();

	// Keep the current row in view inside the scroll box (without scrolling the page).
	$effect(() => {
		const box = scroller;
		const row = box?.querySelector<HTMLTableRowElement>(`tr[data-index="${current}"]`);
		if (!box || !row) return;
		const head = box.querySelector('thead')?.offsetHeight ?? 0;
		const top = row.offsetTop - head;
		const bottom = row.offsetTop + row.offsetHeight;
		if (top < box.scrollTop) box.scrollTop = top;
		else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
	});
</script>

<div class="scroller" bind:this={scroller}>
	<table>
		<caption class="visually-hidden">
			History of the run: percept, action, reward, and score at each time step
		</caption>
		<thead>
			<tr>
				<th scope="col" class="num">t</th>
				<th scope="col" class="state-col">State</th>
				<th scope="col">Percept</th>
				<th scope="col">Action</th>
				<th scope="col" class="num reward-col">Reward</th>
				<th scope="col" class="num">Score</th>
			</tr>
		</thead>
		<tbody>
			{#each steps as step, i (step.t)}
				<tr
					data-index={i}
					class={{ current: i === current }}
					aria-current={i === current ? 'step' : undefined}
				>
					<th scope="row" class="num">
						<button
							type="button"
							class="jump"
							aria-label="Show time step {step.t}"
							onclick={() => onselect(i)}>{step.t}</button
						>
					</th>
					<td class="mono state-col">{worldName(step.before)}</td>
					<td class="mono">{formatPercept(step.percept)}</td>
					<td class="action">
						{step.action}
						{#if step.dirtied.length}
							<span class="dirt-note" title="Dirt appears after this step"
								>+dirt {step.dirtied.join(', ')}</span
							>
						{/if}
					</td>
					<td class="num reward-col">{signed(step.reward)}</td>
					<td class="num total">
						{formatNumber(step.total)}<span class="inline-reward">({signed(step.reward)})</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroller {
		max-height: 21rem;
		overflow: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overscroll-behavior: contain;
	}
	table {
		width: 100%;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 5px var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		white-space: nowrap;
	}
	thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--surface-2);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	tbody tr:last-child th,
	tbody tr:last-child td {
		border-bottom: 0;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.mono {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-variant-ligatures: none;
	}
	.total {
		font-weight: 600;
	}
	.dirt-note {
		margin-left: 4px;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	tr.current th,
	tr.current td {
		background: var(--active-soft);
	}
	tr.current th {
		box-shadow: inset 3px 0 var(--active);
	}
	.jump {
		min-width: 2.25rem;
		padding: 1px 6px;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		text-align: right;
		cursor: pointer;
	}
	.jump:hover {
		background: var(--accent-soft);
	}
	.inline-reward {
		display: none;
		margin-left: 0.3em;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 400;
	}
	@media (max-width: 480px) {
		.state-col,
		.reward-col {
			display: none;
		}
		.inline-reward {
			display: inline;
		}
		th,
		td {
			padding: 5px var(--space-2);
		}
	}
</style>
