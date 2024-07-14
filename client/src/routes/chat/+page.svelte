<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { ISocketClient, IStoreData } from '../../types';

	import Dropdown from '$lib/components/Dropdown/Dropdown.svelte';
	import Textarea from '$lib/components/Textarea/Textarea.svelte';
	import ErrorModal from '$lib/components/ErrorModal/ErrorModal.svelte';
	import VerificationModal from '$lib/components/VerificationModal/VerificationModal.svelte';
	import { EllipsisHorizontal, Icon, PaperAirplane } from 'svelte-hero-icons';

	import { getContext } from 'svelte';

	import Alice from '../../assets/vectors/avatars/round/alice-round.svg';
	import Bob from '../../assets/vectors/avatars/round/bob-round.svg';

	import './page.css';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');

	// (event) handles logging out.
	function handleLogout() {
		// disconnect and remove listeners
		if ($socketClient && $socketClient.disconnect) $socketClient.disconnect();
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

	let textareaValue = '';
	/*
	 * (event) handles sending messages when the send button is click
	 * if the textarea is don't send any messages
	 */
	async function handleSendMessage(event: MouseEvent | KeyboardEvent) {
		if (
			event instanceof KeyboardEvent &&
			(!(event.key === 'Enter' && event.ctrlKey) || !textareaFocus)
		) {
			return;
		}
		if (textareaValue && $globalState.user && $socketClient.sendMessage) {
			$socketClient.sendMessage(textareaValue);
			textareaValue = '';
		}
	}

	let displayMenu = false;
	// (event) open the chat dropdown menu
	function handleToggleMenu() {
		displayMenu = !displayMenu;
	}

	let openVerificationModal = false;
	// (event) open the verification
	function handleCloseVerificationModal() {
		openVerificationModal = !openVerificationModal;
	}

	// (event) opens the protocol log
	function handleOpenProtocolLog() {
		$globalState.protocolLog = true;
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
					<p class="body-1 name">{$globalState.user.username === 'Alice' ? 'Bob' : 'Alice'}</p>
					<p class="body-1 status" class:online={true}>Online</p>
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
							on:click={handleCloseVerificationModal}
							class="menu-item"
						>
							ID Verification
						</button>
						<button on:click={handleToggleMenu} on:click={handleLogout} class="menu-item">
							Logout</button
						>
						<button
							on:click={handleToggleMenu}
							on:click={handleOpenProtocolLog}
							class="menu-item protocol-button"
						>
							Protocol Log
						</button>
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
			<Textarea
				bind:textareaValue
				{handleDetectFocus}
				{handleDetectBlur}
				placeholderText="Message..."
			/>
			<button on:click={handleSendMessage} class="send-button">
				Send
				<Icon style="color:#ffffff;" src={PaperAirplane} solid size="24" />
			</button>
		</div>
	</section>

	<ErrorModal openErrorModal={$globalState.IDBPermissionDenied} />

	<VerificationModal
		{openVerificationModal}
		{handleCloseVerificationModal}
		username={$globalState.user.username === 'Alice' ? 'Bob' : 'Alice'}
	/>
{/if}
<svelte:window on:keydown={handleSendMessage} />
