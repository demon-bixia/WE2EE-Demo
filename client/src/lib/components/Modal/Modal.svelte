<script lang="ts">
	import { fade } from 'svelte/transition';

	import './Modal.css';

	export let open: boolean = false;
</script>

{#if open}
	<div class="overlay" transition:fade={{ duration: 100 }}>
		<div class="modal">
			<slot></slot>
		</div>
	</div>
{/if}
