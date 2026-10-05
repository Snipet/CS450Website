<!--
@component
The supported special forms and functions, grouped, with examples and notes.
-->
<script lang="ts">
	import LispCode from './LispCode.svelte';
	import { REFERENCE, REFERENCE_NOTES } from './reference';
</script>

<div class="reference">
	<ul class="notes">
		{#each REFERENCE_NOTES as note, i (i)}
			<li>{note}</li>
		{/each}
	</ul>
	<div class="groups">
		{#each REFERENCE as g (g.id)}
			<section class="group" aria-labelledby="ref-{g.id}">
				<h3 id="ref-{g.id}">{g.title}</h3>
				<ul class="names">
					{#each g.names as name (name)}<li><code>{name}</code></li>{/each}
				</ul>
				{#if g.note}<p class="group-note">{g.note}</p>{/if}
				<dl class="examples">
					{#each g.examples as ex (ex.code)}
						<div class="example">
							<dt><LispCode code={ex.code} inline /></dt>
							<dd>
								<span class="arrow" aria-hidden="true">⇒</span><span class="visually-hidden"
									>returns</span
								> <code>{ex.result}</code>
							</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/each}
	</div>
</div>

<style>
	.reference {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.notes {
		margin: 0;
		padding-left: 1.2rem;
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.notes li + li {
		margin-top: var(--space-1);
	}
	.groups {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	@media (min-width: 760px) {
		.groups {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (min-width: 1200px) {
		.groups {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.group h3 {
		margin: 0;
		font-size: var(--text-lg);
	}
	.names {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.names code {
		font-size: 0.8125rem;
	}
	.group-note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.examples {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		font-size: var(--text-sm);
	}
	.example {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 var(--space-2);
		min-width: 0;
	}
	.example dt,
	.example dd {
		margin: 0;
		min-width: 0;
	}
	.example dd code {
		padding: 0;
		border: 0;
		background: none;
		font-weight: 600;
	}
	.arrow {
		color: var(--accept);
		font-weight: 600;
	}
</style>
