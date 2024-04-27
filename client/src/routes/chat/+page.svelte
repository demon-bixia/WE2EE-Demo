<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { IStoreData } from '../../types';
	import type { Socket } from 'socket.io-client';

	import Dropdown from '$lib/components/Dropdown.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { EllipsisHorizontal, Icon, PaperAirplane } from 'svelte-hero-icons';

	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';

	import Alice from '../../assets/vectors/avatars/round/alice-round.svg';
	import Bob from '../../assets/vectors/avatars/round/bob-round.svg';


	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socket = getContext<Writable<Socket<any>>>('socket');
	const disconnect = getContext<() => void>('disconnect');

	// (event) handles logging out.
	function handleLogout() {
		globalState.set({ loading: false, logEntries: [], messages: [] });
		// redirect to login page
		goto('/login');
		// disconnect and remove listeners
		disconnect();
	}

	let textareaFocus = false;
	// (event) when the textarea focuses make textareaFocus true
	function handleDetectFocus() {
		textareaFocus = true;
	}
	// (event) when the textarea loses focus make textareaFocus false
	function handleDetectBlur() {
		textareaFocus = false;
	}

	let textareaValue = "";
	/*
	 * (event) handles sending messages when the send button is click
	 * if the textarea is don't send any messages
	 */
	async function handleSendMessage(event: MouseEvent | KeyboardEvent) {	
		if(event instanceof KeyboardEvent && (!(event.key === 'Enter' && event.ctrlKey) || !textareaFocus)) return;	
		if(textareaValue) {
			event.preventDefault();
			const currentDate = new Date();
			const message = {
				subject: "text-message",
				from: $globalState.user.username,
				to: $globalState.user.username === "Alice" ? "Bob" : "Alice",
				content: textareaValue,
				timestamp: currentDate.getTime(),
			}
			await $socket.emit("message", message);
			textareaValue = "";
		}
	 }

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

{#if $globalState.user}
	<section class="chat">
		<!--top section of chat-->
		<div class="top">
			<div class="contact-info">
				<img
					class="avatar"
					src={$globalState.user.username === 'Alice' ? Bob : Alice}
					alt="contact avatar"
				/>
				<div>
					<p class="body-1 name">{$globalState.user.username === 'Alice' ? 'Bob': 'Alice'}</p>
					<p class="body-1 status" class:online={$globalState.user.status === 'Online'}>
						{$globalState.user.status}
					</p>
				</div>
			</div>
			<div class="dropdown-menu-wrapper">
				<button class="menu-button" on:click={handleToggleMenu}>
					<Icon style="color:rgba(0, 0, 0, 0.6);" src={EllipsisHorizontal} solid size="24" />
				</button>
				{#if displayMenu}
					<Dropdown handleClickOutside={handleToggleMenu}>
						<a href="/chat/sessions" on:click={handleToggleMenu} class="menu-item">Sessions</a>
						<button
							on:click={handleToggleMenu}
							on:click={handleToggleVerificationModal}
							class="menu-item">ID Verification</button
						>
						<button on:click={handleToggleMenu} on:click={handleLogout} class="menu-item"
							>Logout</button
						>
					</Dropdown>
				{/if}
			</div>
		</div>
		<!--middle section of chat-->
		<div class="middle">
			{#each $globalState.messages as message}
				<div
					class="message"
					class:self={$globalState?.user && message.from === $globalState?.user.username}
				>
					<p class="text">
						{message.content}
					</p>
				</div>
			{/each}
		</div>
		<!--bottom section of chat-->
		<div class="bottom">
			<textarea
			  bind:value={textareaValue}
				on:focus={handleDetectFocus}
				on:blur={handleDetectBlur}
				class="message-input"
				type="text"
				placeholder="Type the messages you want to send here...."
			/>
			<button on:click={handleSendMessage} class="send-button">
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
{/if}
<svelte:window on:keydown={handleSendMessage} />

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
		color: rgba(0, 0, 0, 0.4);
	}

	.chat .top .contact-info .status.online {
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
		align-self: start;
		background: var(--light-green);
	}

	.chat .middle .message.self {
		align-self: end;
		background: var(--light-blue);
	}

	.chat .bottom {
		display: flex;
		gap: 2rem;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		max-height: 86px;
		border-top: 0.0625rem solid rgba(0, 0, 0, 0.1);
	}

	.chat .bottom .message-input {
		flex: 1;
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		border-radius: 1rem;
		padding: 1rem;
		background: var(--light-gray);
		font-size: 1rem;
		resize: none;
		max-height:55px;
		box-sizing: border-box;
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
