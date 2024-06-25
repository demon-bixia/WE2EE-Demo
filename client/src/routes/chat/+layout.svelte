<script lang="ts">
	import type { IStoreData } from '../../types';
	import type { Writable } from 'svelte/store';

	import { getContext } from 'svelte';

	import LogEntry from '$lib/components/LogEntry/LogEntry.svelte';
	import { Icon, MagnifyingGlass } from 'svelte-hero-icons';

	import './layout.css';

	const globalState = getContext<Writable<IStoreData>>('globalState');

	// (event) close the protocol log
	function handleCloseProtocolLog() {
		$globalState.protocolLog = false;
	}
</script>

<div class="chat-container">
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
