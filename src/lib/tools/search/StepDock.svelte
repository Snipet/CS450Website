<!--
@component
A compact step bar pinned to the bottom of narrow screens while the main step
controls are scrolled out of view: previous, play/pause, next, and the step
counter.
-->
<script lang="ts">
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import type { Stepper } from '$lib/components/ui/stepper.svelte';

	interface Props {
		stepper: Stepper;
		/** Whether the dock is shown (the main controls are out of view). */
		visible: boolean;
		/** Scrolls back to the main step controls. */
		onreveal?: () => void;
	}

	let { stepper, visible, onreveal }: Props = $props();

	const total = $derived(stepper.total);
	const index = $derived(stepper.index);
</script>

<div
	class={['dock', { visible }]}
	role="group"
	aria-label="Search steps (compact)"
	inert={!visible}
>
	<IconButton
		icon="step-back"
		label="Previous step"
		aria-disabled={stepper.atStart}
		onclick={() => stepper.prev()}
	/>
	<IconButton
		icon={stepper.playing ? 'pause' : 'play'}
		label={stepper.playing ? 'Pause' : 'Play'}
		variant="primary"
		class="play"
		aria-disabled={total <= 1}
		onclick={() => stepper.toggle()}
	/>
	<IconButton
		icon="step-forward"
		label="Next step"
		aria-disabled={stepper.atEnd}
		onclick={() => stepper.next()}
	/>
	<button type="button" class="count" onclick={() => onreveal?.()}>
		Step {index + 1} of {total}
	</button>
</div>

<style>
	.dock {
		position: fixed;
		left: 50%;
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px 6px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		box-shadow: var(--shadow-lg);
		backdrop-filter: saturate(1.4) blur(8px);
		-webkit-backdrop-filter: saturate(1.4) blur(8px);
		transform: translate(-50%, calc(100% + 24px));
		opacity: 0;
		transition:
			transform var(--duration) var(--ease),
			opacity var(--duration) var(--ease);
		pointer-events: none;
	}
	.dock.visible {
		transform: translate(-50%, 0);
		opacity: 1;
		pointer-events: auto;
	}
	.dock :global(.play) {
		margin: 0 2px;
		border-radius: 50%;
	}
	.count {
		margin-left: 4px;
		padding: 4px 10px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--text-2);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		cursor: pointer;
	}
	.count:hover {
		background: var(--surface-2);
		color: var(--text);
	}
	@media (min-width: 720px) {
		.dock {
			display: none;
		}
	}
</style>
