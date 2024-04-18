<script lang="ts">
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { EllipsisHorizontal, Icon, PaperAirplane, MagnifyingGlass } from 'svelte-hero-icons';
	import Bob from '../assets/vectors/avatars/round/bob-round.svg';
	import LogEntry from '$lib/components/LogEntry.svelte';

	let displayMenu = false;

	function handleToggleMenu() {
		displayMenu = !displayMenu;
	}

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
	<section class="chat">
		<!--top section of chat-->
		<div class="top">
			<div class="contact-info">
				<img class="avatar" src={Bob} alt="contact avatar" />
				<div>
					<p class="body-1 name">Bob</p>
					<p class="body-1 status">Online</p>
				</div>
			</div>
			<div class="dropdown-menu-wrapper">
				<button class="menu-button" on:click={handleToggleMenu}>
					<Icon style="color:rgba(0, 0, 0, 0.6);" src={EllipsisHorizontal} solid size="24" />
				</button>
				{#if displayMenu}
					<Dropdown handleClickOutside={handleToggleMenu}>
						<a on:click={handleToggleMenu} class="menu-item" href="#">Sessions</a>
						<a on:click={handleToggleMenu} class="menu-item" href="#">ID Verification</a>
						<a on:click={handleToggleMenu} class="menu-item" href="#">Logout</a>
					</Dropdown>
				{/if}
			</div>
		</div>

		<!--middle section of chat-->
		<div class="middle">
			<div class="message self">
				<p class="text">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
					ut labore et dolore magna aliqua
				</p>
			</div>
			<div class="message odd">
				<p class="text">Lorem ipsum dolor sit amet</p>
			</div>
			<div class="message self">
				<p class="text">Lorem ipsum dolor sit amet, consectetur adipiscing elit</p>
			</div>
			<div class="message odd">
				<p class="text">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
					ut labore et dolore magna aliqua
				</p>
			</div>
			<div class="message self">
				<p class="text">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod</p>
			</div>
		</div>

		<!--bottom section of chat-->
		<div class="bottom">
			<input
				class="message-input"
				type="text"
				placeholder="Type the messages you want to send here...."
			/>
			<button class="send-button">
				Send
				<Icon style="color:#ffffff;" src={PaperAirplane} solid size="24" />
			</button>
		</div>
	</section>

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

	.chat {
		display: flex;
		flex-direction: column;
		border-right: 0.0625rem solid rgba(0, 0, 0, 0.1);
		flex-basis: 65%;
	}

	.chat .top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 0.0625rem solid rgba(0, 0, 0, 0.1);
	}

	.chat .top .contact-info {
		display: flex;
		gap: 1.5rem;
	}

	.chat .top .contact-info .avatar {
		width: 3.125rem;
		height: 3.125rem;
	}

	.chat .top .contact-info .name {
		margin-bottom: 0.25rem;
	}

	.chat .top .contact-info .status {
		color: var(--green);
	}

	.chat .top .dropdown-menu-wrapper {
		position: relative;
	}

	.chat .top .dropdown-menu-wrapper .menu-button {
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		border-radius: 0.75rem;
		width: 2.8125rem;
		height: 2.8125rem;
	}

	.chat .middle {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		overflow-y: scroll;
		gap: 1.5rem;
	}

	.chat .middle .message {
		padding: 1rem;
		max-width: 60%;
		border-radius: 0.75rem;
	}

	.chat .middle .message.self {
		align-self: end;
		background: var(--light-blue);
	}

	.chat .middle .message.odd {
		align-self: start;
		background: var(--light-green);
	}

	.chat .bottom {
		display: flex;
		gap: 2rem;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-top: 0.0625rem solid rgba(0, 0, 0, 0.1);
	}

	.chat .bottom .message-input {
		flex: 1;
		border: 0;
		border-radius: 0.5rem;
		padding: 1rem;
		background: var(--light-gray);
		font-size: 1rem;
	}

	.chat .bottom .message-input:focus {
		outline: 0.0625rem solid var(--blue);
	}

	.chat .bottom .send-button {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.75rem;
		color: #ffffff;
		background: var(--blue);
		font-size: 1rem;
		transition: all 200ms ease;
	}

	.chat .bottom .send-button:hover {
		background: var(--dark-blue);
	}

	.chat .bottom .send-button:focus {
		outline: none;
		box-shadow: 0 0 0.0625rem 0.1875rem rgba(89, 126, 212, 0.5);
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
		border: 0;
		border-radius: 0.5rem;
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
