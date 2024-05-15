<script lang="ts">
	import type { IStoreData } from '../../types';
	import type { Writable } from 'svelte/store';

	import { getContext } from 'svelte';

	import LogEntry from '$lib/components/LogEntry.svelte';
	import { Icon, MagnifyingGlass } from 'svelte-hero-icons';

	const globalState = getContext<Writable<IStoreData>>('globalState');

	// (event) close the protocol log
	function handleCloseProtocolLog() {
		$globalState.protocolLog = false;
	}
</script>

<div class="page-container">
	<!--page-->
	<slot></slot>

	<!--sidebar-->
	<aside
		class="sidebar"
		class:open={$globalState.protocolLog}
		class:close={!$globalState.protocolLog}
	>
		<search class="search-container">
			<div class="search-input-wrapper">
				<input class="search-input" type="text" placeholder="Search" />
				<span class="search-icon">
					<Icon style="color:rgba(0, 0, 0, 0.4);" src={MagnifyingGlass} solid size="24" />
				</span>
			</div>
			<button on:click={handleCloseProtocolLog} class="close-button"> Close </button>
		</search>

		<div class="protocol-log">
			{#each $globalState.logEntries as entry}
				<LogEntry {entry} />
			{/each}
		</div>

		<footer class="footer-container">
			<p class="body-1">
				Avatars by
				<a
					href="https://www.freepik.com/free-vector/avatar-set-isolated-white-background_7082033.htm#fromView=image_search_similar&page=1&position=6&uuid=50c135fe-aabd-4e51-9697-c2a4c729d6a3"
				>
					www.freepik.com
				</a>
			</p>
		</footer>
	</aside>
</div>

<style>
	.page-container {
		display: flex;
		width: 100%;
		height: 100vh;
	}

	.sidebar {
		height: 100%;
		min-width: 400px;
		background: #ffffff;
		display: flex;
		flex-direction: column;
	}

	.sidebar .search-container {
		padding: 1rem 1.5rem;
		border-bottom: 0.0625rem solid rgba(0, 0, 0, 0.1);
		display: flex;
		justify-content: center;
		align-items: center;
		height: 5.5125rem;
		box-sizing: border-box;
	}

	.sidebar .search-container .search-input-wrapper {
		position: relative;
		flex-basis: 100%;
	}

	.sidebar .search-container .search-input-wrapper .search-input {
		box-sizing: border-box;
		width: 100%;
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		border-radius: 1rem;
		padding: 1rem;
		background: var(--light-gray);
		font-size: 1rem;
	}

	.sidebar .search-container .search-input-wrapper .search-input:focus {
		outline: 0.0625rem solid var(--blue);
	}

	.sidebar .search-container .search-input-wrapper .search-icon {
		position: absolute;
		right: 1rem;
		top: 23%;
	}

	.sidebar .search-container .close-button {
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 1rem;
		color: rgba(0, 0, 0, 0.6);
		padding: 1rem;
		border-radius: 1rem;
		text-decoration: none;
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		transition: all 200ms ease;
		margin-left: 1rem;
		display: none;
	}

	.sidebar .search-container .close-button:hover {
		border: 0.0625rem solid var(--light-red);
		color: var(--red);
	}

	.sidebar .search-container .close-button:focus {
		box-shadow: 0 0 0.0625rem 0.1875rem var(--light-red);
		border: 0.0625rem solid var(--light-red);
		color: var(--red);
		outline: none;
	}

	.sidebar .protocol-log {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.sidebar .footer-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.5rem 0rem;
		width: 100%;
		border-top: 0.0625rem solid rgba(0, 0, 0, 0.1);
		height: 5.5rem;
		box-sizing: border-box;
	}

	/**** Tablet Screens ****/
	@media only screen and (width < 56.25rem) {
		.sidebar {
			position: absolute;
			z-index: 1000;
			right: 0;
			height: 100%;
			min-width: auto;
			overflow: auto;
		}

		.sidebar.close {
			width: 0;
		}

		.sidebar.open {
			width: 100%;
		}

		.sidebar .search-container .close-button {
			display: block;
		}
	}

	/**** Mobile Screens ****/
	@media only screen and (width < 37.5rem) {
	}
</style>
