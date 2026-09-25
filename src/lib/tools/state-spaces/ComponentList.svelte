<!--
@component
The components of one search problem (Solving Problems by Searching, slide 5)
as the example slide gives them. Components the slide leaves out are marked
and explained in a note.
-->
<script lang="ts">
	import { COMPONENT_NAMES, type ProblemComponent } from './content';

	interface Props {
		components: readonly ProblemComponent[];
	}

	let { components }: Props = $props();

	const added = $derived(components.some((c) => !c.onSlide));
</script>

<dl class="components">
	{#each components as c (c.id)}
		<div class={['row', { added: !c.onSlide }]}>
			<dt>
				{COMPONENT_NAMES[c.id]}{#if !c.onSlide}<span class="mark" aria-hidden="true">*</span>{/if}
			</dt>
			<dd>
				{c.text}{#if !c.onSlide}<span class="visually-hidden"> (not on the slide)</span>{/if}
			</dd>
		</div>
	{/each}
</dl>
{#if added}
	<p class="note"><span aria-hidden="true">*</span> Not on the slide.</p>
{/if}

<style>
	.components {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		margin: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		font-size: var(--text-sm);
	}
	.row {
		display: contents;
	}
	dt,
	dd {
		padding: 7px var(--space-3);
		line-height: 1.5;
	}
	.row + .row dt,
	.row + .row dd {
		border-top: 1px solid var(--border);
	}
	dt {
		padding-right: var(--space-2);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		line-height: 1.9;
		white-space: nowrap;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.added dd {
		color: var(--text-2);
	}
	.mark {
		margin-left: 1px;
		color: var(--text-3);
	}
	.note {
		margin: var(--space-2) 0 0;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	@media (max-width: 420px) {
		.components {
			grid-template-columns: minmax(0, 1fr);
		}
		dt {
			padding-bottom: 0;
		}
		.row + .row dd {
			padding-top: 0;
			border-top: 0;
		}
	}
</style>
