<script lang="ts">
	import type { IStoreData, ISocketClient } from '../../../types';
	import type { Writable } from 'svelte/store';
	import type Protocol from '$lib/WE2EE';

	import { getContext } from 'svelte';

	import { ArrowLongDown, ArrowLongUp, Icon, NoSymbol } from 'svelte-hero-icons';

	import './page.css';
	import { bufferToBase64 } from '$lib/WE2EE/encoding';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');

	// (event) sends a "sessions:permissionsChange" message
	function handlePermissionsChange(sessionId: string, main: boolean) {
		if (!$socketClient.socket) {
			throw new Error('There is no socket connection');
		}

		$socketClient.socket.emit(
			'sessions:permissionsChange',
			{ sessionId, main },
			(response: { status: string }) => {
				if (response.status !== 'Ok') {
					throw new Error('Failed to change permissions of session');
				}
				if (!$socketClient.getPersonalSessions) {
					throw new Error('SocketClient is not setup properly');
				}
				$socketClient.getPersonalSessions();
			}
		);
	}

	// (event) sends a "sessions:block" message
	async function handleBlockSession(sessionId: string) {
		if (!$socketClient.socket) {
			throw new Error('There is no socket connection');
		}

		const signature = await $protocol.createIKSignature();

		$socketClient.socket.emit(
			'sessions:block',
			{ signature: bufferToBase64(signature), sessionId },
			(response: { status: string }) => {
				if (response.status !== 'Ok') {
					throw new Error('Failed to block session');
				}
				if (!$socketClient.getPersonalSessions) {
					throw new Error('SocketClient is not setup properly');
				}
				$socketClient.getPersonalSessions();
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
