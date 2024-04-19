<script lang="ts">
	import Dropdown from '$lib/components/Dropdown.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { EllipsisHorizontal, Icon, PaperAirplane } from 'svelte-hero-icons';
	import Bob from '../../assets/vectors/avatars/round/bob-round.svg';

	let displayMenu = false;
	// (event) open the chat dropdown menu
	function handleToggleMenu() {
		displayMenu = !displayMenu;
	}

	let OpenVerificationModal = false;
	// (event) open the verification
	function handleToggleVerificationModal() {
		OpenVerificationModal = !OpenVerificationModal;
	}
</script>

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
					<button on:click={handleToggleMenu} class="menu-item">Sessions</button>
					<button
						on:click={handleToggleMenu}
						on:click={handleToggleVerificationModal}
						class="menu-item">ID Verification</button
					>
					<button on:click={handleToggleMenu} class="menu-item">Logout</button>
				</Dropdown>
			{/if}
		</div>
	</div>
	<!--middle section of chat-->
	<div class="middle">
		<div class="message self">
			<p class="text">
				Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
				labore et dolore magna aliqua
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
				Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
				labore et dolore magna aliqua
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
	<!--modal-->
	<Modal open={OpenVerificationModal}>
		<div class="modal">
			<header class="header">
				<h6 class="heading-2 title">Confirm Identity of user</h6>
				<p class="body-1 description">Ask the other part to confirm this code on thier device.</p>
			</header>
			<div class="code-container body-1">
				Code:
				<p class="code body-1">1201920801222210282741023</p>
			</div>
			<button class="close-button" on:click={handleToggleVerificationModal}>Close</button>
		</div>
	</Modal>
</section>

<style>
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
		border-radius: 1rem;
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
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		border-radius: 1rem;
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
		border-radius: 1rem;
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

	.modal {
		padding: 1.5rem 1rem;
		background: #ffffff;
		border-radius: 0.75rem;
		width: 18.75rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1.5rem;
	}

	.modal .header {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.modal .header .title,
	.modal .header .description {
		text-align: center;
	}

	.modal .code-container {
		width: 100%;
	}

	.modal .code {
		background: var(--light-gray);
		padding: 1rem;
		margin-top: 0.5rem;
		border-radius: 1rem;
	}

	.modal .close-button {
		font-size: 1rem;
		color: rgba(0, 0, 0, 0.6);
		padding: 1rem;
		width: 12.5rem;
		border-radius: 1rem;
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		transition: all 200ms ease;
	}

	.modal .close-button:hover {
		border: 0.0625rem solid var(--light-red);
		color: var(--red);
	}

	.modal .close-button:focus {
		box-shadow: 0 0 0.0625rem 0.1875rem var(--light-red);
		border: 0.0625rem solid var(--light-red);
		color: var(--red);
		outline: none;
	}
</style>