<script lang="ts">
	import { fade } from 'svelte/transition';
	import { clickOutside } from '../../actions/clickOutside';

	import './Dropdown.css';

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
