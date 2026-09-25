<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { Era, EraId, HistoryEvent, Winter } from './content';
	import {
		eventsDuring,
		formatEraLength,
		formatEraYears,
		formatOverlap,
		overlappingEras,
		wintersDuring
	} from './timeline';

	interface Props {
		eras: readonly Era[];
		events: readonly HistoryEvent[];
		winters: readonly Winter[];
		selected: EraId | null;
		onselect: (id: EraId | null) => void;
	}

	let { eras, events, winters, selected, onselect }: Props = $props();

	const uid = $props.id();
	const numberOf = (e: HistoryEvent) => events.indexOf(e) + 1;

	function focusEra(id: EraId) {
		onselect(id);
		document.getElementById(`${uid}-${id}-btn`)?.focus();
	}
</script>

<ol class="eras">
	{#each eras as era (era.id)}
		{@const open = selected === era.id}
		{@const overlaps = overlappingEras(era, eras)}
		{@const during = eventsDuring(era, events)}
		{@const cold = wintersDuring(era, winters)}
		<li class={{ open }}>
			<button
				type="button"
				class="era"
				id="{uid}-{era.id}-btn"
				aria-expanded={open}
				aria-controls="{uid}-{era.id}"
				onclick={() => onselect(open ? null : era.id)}
			>
				<span class="swatch" aria-hidden="true"></span>
				<span class="name">{era.label}</span>
				<span class="years">{formatEraYears(era)}</span>
				<Icon name="chevron-down" size={16} class="chevron" />
			</button>
			<div class="detail" id="{uid}-{era.id}" hidden={!open}>
				<dl>
					<div>
						<dt>Span</dt>
						<dd>{formatEraLength(era)}</dd>
					</div>
					<div>
						<dt>Overlaps</dt>
						<dd>
							{#if overlaps.length}
								<ul class="inline">
									{#each overlaps as o (o.era.id)}
										<li>
											<button type="button" class="link" onclick={() => focusEra(o.era.id)}
												>{o.era.label}</button
											>
											<span class="muted">({formatOverlap(o)})</span>
										</li>
									{/each}
								</ul>
							{:else}
								<span class="muted">No other era</span>
							{/if}
						</dd>
					</div>
					{#if cold.length}
						<div>
							<dt>AI winter</dt>
							<dd>{cold.map((w) => `${w.label} (${w.period.toLowerCase()})`).join(', ')}</dd>
						</div>
					{/if}
					<div>
						<dt>Dates</dt>
						<dd>
							{#if during.length}
								<ul class="inline">
									{#each during as e (e.id)}
										<li>
											<span class="num" aria-hidden="true">{numberOf(e)}</span>
											{e.year}<span class="visually-hidden">: {e.label}</span>
										</li>
									{/each}
								</ul>
							{:else}
								<span class="muted">None from the slides</span>
							{/if}
						</dd>
					</div>
				</dl>
			</div>
		</li>
	{/each}
</ol>

<style>
	.eras {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.eras > li {
		border: 1px solid transparent;
		border-radius: var(--radius);
		transition:
			background var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}
	.eras > li.open {
		border-color: var(--border);
		background: var(--surface-2);
	}
	.era {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		width: 100%;
		min-height: 40px;
		padding: var(--space-2) var(--space-3);
		border: 0;
		border-radius: var(--radius);
		background: transparent;
		color: var(--text);
		font-size: var(--text-sm);
		text-align: left;
		cursor: pointer;
	}
	.era:hover {
		background: var(--surface-2);
	}
	.swatch {
		width: 14px;
		height: 8px;
		border-radius: 2px;
		background: var(--accent);
	}
	.open .swatch {
		background: var(--active);
	}
	.name {
		font-weight: 500;
	}
	.open .name {
		font-weight: 700;
	}
	.years {
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.era :global(.chevron) {
		color: var(--text-3);
		transition: transform var(--duration) var(--ease);
	}
	.era[aria-expanded='true'] :global(.chevron) {
		transform: rotate(180deg);
	}
	.detail {
		padding: 0 var(--space-3) var(--space-3) calc(var(--space-3) + 14px + var(--space-3));
	}
	dl {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		font-size: var(--text-sm);
	}
	dl > div {
		display: grid;
		grid-template-columns: 5.5rem minmax(0, 1fr);
		gap: var(--space-2);
	}
	dt {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		line-height: 1.9;
		text-transform: uppercase;
	}
	dd {
		margin: 0;
	}
	.inline {
		display: flex;
		flex-wrap: wrap;
		gap: 2px var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.inline li {
		display: inline-flex;
		align-items: baseline;
		gap: 4px;
	}
	.muted {
		color: var(--text-3);
	}
	.link {
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent);
		font-size: inherit;
		text-align: left;
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.18em;
		cursor: pointer;
	}
	.link:hover {
		color: var(--accent-hover);
	}
	.num {
		display: inline-grid;
		place-items: center;
		align-self: center;
		width: 1.25rem;
		height: 1.25rem;
		border: 1.5px solid var(--text-2);
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 700;
	}
	@media (max-width: 420px) {
		.detail {
			padding-left: var(--space-3);
		}
		dl > div {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
	}
</style>
