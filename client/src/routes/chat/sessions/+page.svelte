<script lang="ts">
	import type { IStoreData, ISocketClient } from '../../../types';
	import type { Writable } from 'svelte/store';

	import Protocol from '$lib/WE2EE';
	import { getContext } from 'svelte';

	import { ArrowLongDown, ArrowLongUp, Icon, NoSymbol } from 'svelte-hero-icons';

	import './page.css';
	import { base64ToBuffer, bufferToBase64, stringToBuffer } from '$lib/WE2EE/encoding';
	import type { KeyPair } from '$lib/WE2EE/types';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');
	const log = getContext<(logEntry: any) => void>('log');

	// (event) sends a "sessions:permissionsChange" message
	async function handlePermissionsChange(sessionId: string, main: boolean) {
		if (!$socketClient.socket) {
			throw new Error('There is no socket connection');
		}

		// Search for your SIK.
		const storeQueryResult = await $protocol.store.getKeys<{ SIK: KeyPair }>([{ name: 'SIK' }]);
		if (!storeQueryResult || !storeQueryResult.SIK) {
			throw new Error('Keys not found');
		}
		// Create a signature
		const encodedMessage = stringToBuffer(JSON.stringify({ sessionId, main }));
		const hashedMessage = await $protocol.hash(encodedMessage);
		const signature = await $protocol.sign(storeQueryResult.SIK.privateKey, hashedMessage);

		$socketClient.socket.emit(
			'sessions:permissionsChange',
			{ signature: bufferToBase64(signature), sessionId, main },
			(response: { status: string; message: string }) => {
				if (response.status !== 'Ok') {
					// log permission change failure
					log({
						title: 'Permission change failure',
						more: {
							sessionId: { value: sessionId, preview: 'end' },
							admin: { value: String(main), preview: 'start' },
							reason: { value: response.message, preview: 'start' }
						}
					});
					throw new Error('Failed to change permissions of session');
				}

				if (!$socketClient.getPersonalSessions) {
					throw new Error('SocketClient is not setup properly');
				}

				$socketClient.getPersonalSessions();

				log({
					title: 'Session permission changed',
					more: {
						sessionId: { value: sessionId, preview: 'end' },
						admin: { value: String(main), preview: 'start' }
					}
				});
			}
		);
	}

	// (event) sends a "sessions:block" message
	async function handleBlockSession(sessionId: string) {
		if (!$socketClient.socket) {
			throw new Error('There is no socket connection');
		}

		// Search for your SIK.
		const storeQueryResult = await $protocol.store.getKeys<{ SIK: KeyPair }>([{ name: 'SIK' }]);
		if (!storeQueryResult || !storeQueryResult.SIK) {
			throw new Error('Keys not found');
		}
		// Create a signature
		const hashedSessionId = await $protocol.hash(base64ToBuffer(sessionId));
		const signature = await $protocol.sign(storeQueryResult.SIK.privateKey, hashedSessionId);

		$socketClient.socket.emit(
			'sessions:block',
			{ signature: bufferToBase64(signature), sessionId },
			(response: { status: string; message: string }) => {
				if (response.status !== 'Ok') {
					log({
						title: 'Failed to block session',
						more: {
							sessionId: { value: sessionId, preview: 'end' },
							reason: { value: response.message, preview: 'start' }
						}
					});
					throw new Error('Failed to block session');
				}

				if (!$socketClient.getPersonalSessions) {
					throw new Error('SocketClient is not setup properly');
				}

				$socketClient.getPersonalSessions();

				log({
					title: 'Session blocked',
					more: {
						sessionId: { value: sessionId, preview: 'end' }
					}
				});
			}
		);
	}
</script>

<section class="sessions-container">
	<header class="sessions-header">
		<h1 class="heading-1 title">Manage Your Sessions</h1>
		<p class="body-1 description">
			Below is a list of browser session related to this account, here you can manage them.
		</p>
	</header>

	<div class="sessions">
		{#each $globalState.personalSessions as session}
			<div class="session">
				<p class="session-id">Session ID: {session.IK.slice(-20)}</p>
				<div class="controls">
					{#if session.main}
						<p class="main-session-indicator body-1">admin session</p>
					{/if}

					{#if $globalState.currentSession && $globalState.currentSession.main}
						{#if session.main}
							<button
								class="button blue-button"
								on:click={() => {
									handlePermissionsChange(session.IK, false);
								}}
							>
								Demote
								<Icon style="color:rgba(0, 0, 0, 0.6);" src={ArrowLongDown} solid size="16" />
							</button>
						{:else}
							<button
								class="button blue-button"
								on:click={() => {
									handlePermissionsChange(session.IK, true);
								}}
							>
								Promote
								<Icon style="color:rgba(0, 0, 0, 0.6);" src={ArrowLongUp} solid size="16" />
							</button>
							<button
								class="button red-button"
								on:click={() => {
									handleBlockSession(session.IK);
								}}
							>
								Block
								<Icon style="color:#ff7171;" src={NoSymbol} solid size="16" />
							</button>
						{/if}
					{/if}
				</div>
			</div>
		{/each}
	</div>
	<a href="/chat" class="close-link">Go Back</a>
</section>
