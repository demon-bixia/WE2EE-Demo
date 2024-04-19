<script lang="ts">
	import LogEntry from '$lib/components/LogEntry.svelte';
	import { Icon, MagnifyingGlass } from 'svelte-hero-icons';

	let FAKE_DATA = [
		{
			date: '12:30',
			title: 'Received Key bundle from server.',
			more: {
				IDKA: '705362851087197....',
				SPKB: '7197227133138997....',
				DH: '399775139864916....'
			}
		},
		{
			date: '12:30',
			title: 'DH with IDKA and Bob’s SPK.'
		},
		{
			date: '12:30',
			title: 'DH with  EK  and IDKB.'
		},
		{
			date: '12:30',
			title: 'Message signed with EdDSA.'
		},
		{
			date: '12:30',
			title: 'Message encrypted with AES.'
		}
	];
</script>

<div class="page-container">
	<!--page-->
	<slot></slot>

	<!--sidebar-->
	<aside class="sidebar">
		<search class="search-container">
			<div class="search-input-wrapper">
				<input class="search-input" type="text" placeholder="Search" />
				<span class="search-icon">
					<Icon style="color:rgba(0, 0, 0, 0.4);" src={MagnifyingGlass} solid size="24" />
				</span>
			</div>
		</search>

		<div class="protocol-log">
			{#each FAKE_DATA as data}
				<LogEntry {data} />
			{:else}
				<p>no events to log</p>
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
		flex-basis: 35%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.sidebar .search-container {
		padding: 1rem 1.5rem;
		border-bottom: 0.0625rem solid rgba(0, 0, 0, 0.1);
		display: flex;
		justify-content: center;
		align-items: center;
		height: 5.5rem;
		box-sizing: border-box;
	}

	.sidebar .search-container .search-input-wrapper {
		position: relative;
		flex-basis: 100%;
	}

	.sidebar .search-container .search-input-wrapper .search-input {
		box-sizing: border-box;
		width: 100%;
		border: 1px solid rgba(0, 0, 0, 0.1);
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

	.sidebar .protocol-log {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 1.5rem;
		overflow-y: scroll;
	}

	.sidebar .footer-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.5rem 0rem;
		width: 100%;
		border-top: 0.0625rem solid rgba(0, 0, 0, 0.1);
		height: 84px;
		box-sizing: border-box;
	}
</style>
