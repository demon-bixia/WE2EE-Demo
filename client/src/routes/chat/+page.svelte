<script lang="ts">
	import type Protocol from '$lib/WE2EE';
	import type { KeyStoreKeys, PreparedKeyBundle, SharedSecret } from '$lib/WE2EE/types';
	import type { Socket } from 'socket.io-client';
	import type { Writable } from 'svelte/store';
	import type { IInitialMessage, IMessage, IStoreData } from '../../types';

	import Dropdown from '$lib/components/Dropdown.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { CircleStack, EllipsisHorizontal, Icon, PaperAirplane } from 'svelte-hero-icons';

	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';

	import Alice from '../../assets/vectors/avatars/round/alice-round.svg';
	import Bob from '../../assets/vectors/avatars/round/bob-round.svg';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socket = getContext<Writable<Socket<any>>>('socket');
	const disconnect = getContext<() => void>('disconnect');
	const protocol = getContext<Writable<Protocol>>('protocol');

	// (event) handles logging out.
	function handleLogout() {
		globalState.set({ loading: false, protocolLog: false, logEntries: [], messages: [] });
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
		if (textareaValue && $globalState.user) {
			event.preventDefault();
			const currentDate = Date.now();
			// find the user you want to communicate with
			const to = $globalState.user.username === 'Alice' ? 'Bob' : 'Alice';
			// search for the SK of the user you want to communicate with.
			const toSKs = await $protocol.store.getKeys<SharedSecret[] | undefined>([
				{ name: 'SKs', filters: { id: to } }
			]);

			if (toSKs && toSKs.length > 0) {
				// encrypt message and send it to all the sessions
				for (let SK of toSKs) {
					const IV = $protocol.generateIV();
					const encryptedContent = await $protocol.encrypt(SK.SK, IV, textareaValue);
					const message: IMessage = {
						subject: 'text-message',
						to: to,
						from: $globalState.user.username,
						content: encryptedContent,
						timestamp: currentDate,
						iv: $protocol.decode(IV),
						IK: $protocol.decode(SK.IK)
					};

					$socket.emit('message', message);
					// Forward the message to other sessions associated with this user.
				}
			} else {
				//  request for a key bundle
				$socket.emit(
					'keys:request',
					async (response: { status: string; data: PreparedKeyBundle }) => {
						if (response.status === 'Ok' && response.data && $globalState.user) {
							// preform a ECDH.
							const DHResult = await $protocol.deriveFromBundle(response.data);
							const SK = {
								username: to,
								IK: DHResult.IK,
								SK: DHResult.SK,
								AD: DHResult.AD,
								salt: DHResult.salt
							};
							// save the key
							const SKs = await $protocol.store.getKeys<SharedSecret[]>([{ name: 'SKs' }]);
							await $protocol.store.updateKeys({ SKs: [...SKs, SK] });
							// encrypt message
							const { IK } = await $protocol.store.getKeys<KeyStoreKeys>([{ name: 'IK' }]);
							if (IK?.publicKey) {
								const IV = $protocol.generateIV();
								const encryptedContent = await $protocol.encrypt(SK.SK, IV, textareaValue);
								const message: IInitialMessage = {
									subject: 'ecdh-message',
									to: to,
									from: $globalState.user.username,
									content: encryptedContent,
									timestamp: currentDate,
									iv: $protocol.decode(IV),
									salt: $protocol.decode(SK.salt),
									IK: $protocol.decode(IK.publicKey as ArrayBuffer),
									EK: $protocol.decode(DHResult.EK),
									SPK_ID: response.data.SPK.id,
									OPK_ID: response.data.OPK?.id
								};
								// send the message
								$socket.emit('message', message);
							}
						}
					}
				);
			}
			// Perform key exchange if SK doesn't exist.
			textareaValue = '';
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

	let OpenAllowIndexedDBModal = false;

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
							on:click={handleToggleVerificationModal}
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
			<textarea
				bind:value={textareaValue}
				on:focus={handleDetectFocus}
				on:blur={handleDetectBlur}
				class="message-input"
				placeholder="Message..."
			/>
			<button on:click={handleSendMessage} class="send-button">
				Send
				<Icon style="color:#ffffff;" src={PaperAirplane} solid size="24" />
			</button>
		</div>
		<!--verification modal-->
		<Modal open={OpenVerificationModal}>
			<div class="modal">
				<header class="header">
					<h6 class="heading-2 title">Confirm Identity of user</h6>
					<p class="body-1 description">Ask the other part to confirm this code on their device.</p>
				</header>
				<div class="code-container body-1">
					Code:
					<p class="code body-1">1201920801222210282741023</p>
				</div>
				<button class="close-button" on:click={handleToggleVerificationModal}>Close</button>
			</div>
		</Modal>
		<!--allow IndexedDB modal-->
		<Modal open={OpenAllowIndexedDBModal}>
			<div class="modal">
				<div class="allow-indexedDB-dialog">
					<Icon style="color:#407BFF;stroke-width:1;" src={CircleStack} size="52" />
					<div class="dialog-details">
						<h1 class="heading-2">Database Access</h1>
						<p class="body-1">
							This app needs access to IndexedDB in order to store the cryptographic keys used by
							the protocol
						</p>
					</div>
				</div>
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
		flex: 1;
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

	.chat .top .dropdown-menu-wrapper .dropdown-menu .menu-item.protocol-button {
		display: none;
	}

	.chat .middle {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		overflow-y: auto;
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
		max-height: 3.4375rem;
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
		width: 20.75rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1rem;
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

	.modal .allow-indexedDB-dialog {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.modal .dialog-details {
		margin-top: 8px;
		text-align: center;
	}

	/**** Tablet Screens ****/
	@media only screen and (width < 56.25rem) {
		.chat .top .dropdown-menu-wrapper .dropdown-menu .menu-item.protocol-button {
			display: block;
		}

		.chat .bottom .message-input {
			height: fit-content;
		}
	}

	/**** Mobile Screens ****/
	@media only screen and (width < 37.5rem) {
		.chat .bottom .message-input {
			height: fit-content;
		}
	}
</style>
