<script lang="ts">
	import { fade } from 'svelte/transition';
	import { clickOutside } from '../actions/clickOutside';

	export let handleClickOutside: () => void;
</script>

<div
	class="dropdown-menu"
	use:clickOutside
	on:outside={handleClickOutside}
	transition:fade={{ duration: 100 }}
>
	<slot></slot>
</div>

<style>
	.dropdown-menu {
		position: absolute;
		right: 0;
		top: 120%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		background-color: #ffffff;
		padding: 12px 0;
		border-radius: 8px;
		box-shadow: 0 0.3125rem 1rem rgba(0, 0, 0, 0.1);
		width: 160px;
	}

	:global(.dropdown-menu .menu-item) {
		text-decoration: none;
		color: rgba(0, 0, 0, 0.6);
		padding: 6px 16px;
		transition: all 200ms ease;
		text-align: start;
		font-size: 16px;
		line-height: 160%;
		justify-content: start;
	}

	:global(.dropdown-menu .menu-item:hover) {
		background-color: rgba(0, 0, 0, 0.03);
	}

	:global(.dropdown-menu .menu-item:focus) {
		background-color: rgba(0, 0, 0, 0.03);
		outline: none;
	}

	:global(.dropdown-menu .menu-item:active) {
		background-color: rgba(0, 0, 0, 0.1);
		outline: none;
	}
</style>
