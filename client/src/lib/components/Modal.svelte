<script lang="ts">
	import { fade } from 'svelte/transition';

	export let open: boolean = false;
</script>

{#if open}
	<div class="overlay" transition:fade={{ duration: 100 }}>
		<slot></slot>
	</div>
{/if}

<style>
	.overlay {
		position: absolute;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(1.25rem);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}
</style>
