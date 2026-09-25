<!--
@component
Types of agents (Solving Problems by Searching, slide 2): the reflex agent
and the planning agent side by side.
-->
<script lang="ts">
	import { AGENT_TYPES } from './content';
</script>

<div class="agents">
	{#each AGENT_TYPES as agent (agent.id)}
		<article class={['agent', agent.id]}>
			<h3 class="name">{agent.name}</h3>
			<p class="lead">{agent.lead}</p>
			<ul class="points">
				{#each agent.points as point (point)}
					<li>{point}</li>
				{/each}
			</ul>
		</article>
	{/each}
</div>

<style>
	.agents {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-3);
	}
	.agent {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
		padding: var(--space-3) var(--space-4) var(--space-4);
		border: 1px solid var(--border);
		border-top: 3px solid var(--tok-color);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.reflex {
		--tok-color: var(--tok-2);
	}
	.planning {
		--tok-color: var(--tok-0);
	}
	.name {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-base);
		font-weight: 600;
	}
	.lead {
		margin: 0;
		color: var(--tok-color);
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.points {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: 0;
		padding-left: 1.1rem;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
</style>
