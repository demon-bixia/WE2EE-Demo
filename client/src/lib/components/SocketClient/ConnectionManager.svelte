<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { IECDHMessage, ITextMessage, ISocketClient, IStoreData } from '../../../types';

	import { goto } from '$app/navigation';
	import { io } from 'socket.io-client';
	import { getContext } from 'svelte';

	import Protocol from '$lib/WE2EE';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');

	/**
	 *  A function thar connects to the socket server and adds event handlers.
	 */
	async function connect() {
		// if the user is logging connect to socket server.
		if ($globalState.user && $globalState.user.authToken) {
			$socketClient.socket = io('http://localhost:3000', {
				transports: ['polling', 'websocket'],
				extraHeaders: { authorization: `bearer ${$globalState.user.authToken}` }
			});

			// ** Add event handlers ** //
			// (event) handles new connection
			$socketClient.socket.on('connect', async () => {
				// Log Connection
				console.log('connected to socket server');
				if (
					$globalState.user &&
					$globalState.user.authToken &&
					$socketClient.setupKeys &&
					$socketClient.checkForKeys
				) {
					// Create the protocol instance.
					$protocol = new Protocol(
						`${$globalState.user.username}`,
						$globalState.user.username,
						'WE2EE_Demo'
					);
					try {
						// Connect to the keystore
						await $protocol.store.connect();
						try {
							// Remove the error dialog
							$globalState.IDBPermissionDenied = false;
							// Check if the other user has keys
							await $socketClient.checkForKeys();
							// Setup keys.
							await $socketClient.setupKeys();
						} catch (error) {
							console.error(error);
						}
					} catch (error) {
						$globalState.IDBPermissionDenied = true;
						console.error(error);
					}
				}
			});
			// (event) handles connection errors.
			$socketClient.socket.io.on('error', (error: any) => {
				if (error.description === 401) {
					disconnect();
					console.error(error);
				}
			});
			// (event) handles receiving a new message
			$socketClient.socket.on('message', (message: ITextMessage | IECDHMessage) => {
				if ($socketClient.receiveMessage) {
					$socketClient.receiveMessage(message);
				}
			});
			// (event) handles performing an action
			$socketClient.socket.on('action', (data: { action: string }) => {
				if (data.action === 'logout' && $socketClient.disconnect) {
					$socketClient.disconnect();
				}
			});
			// (event) handles receiving a list of messages that were queued in the server
			$socketClient.socket.on('queued-messages', (messages: (ITextMessage | IECDHMessage)[]) => {
				if ($socketClient.receiveMessage) {
					for (let message of messages) {
						$socketClient.receiveMessage(message);
					}
				}
			});
			// (event) handles allowing the user to send when the other user has publised some keys
			$socketClient.socket.on('can-send', (data: { canSend: boolean }) => {
				if (data.canSend) {
					$globalState.canSend = data.canSend;
				}
			});
			// (event) handles logging disconnections
			$socketClient.socket.on('disconnect', () => {
				// Log disconnecting
				console.log('disconnected from socket server');
			});
		}
	}
	$socketClient.connect = connect;

	/**
	 * A function that disconnects from the socket server and removes all event handlers.
	 */
	function disconnect() {
		globalState.set({
			currentSession: undefined,
			IDBPermissionDenied: false,
			loading: false,
			protocolLog: false,
			logEntries: [],
			messages: [],
			personalSessions: [],
			verificationCodes: [],
			canSend: false
		});

		if ($socketClient.socket) {
			$socketClient.socket.disconnect();
			$socketClient.socket.off('connect');
			$socketClient.socket.off('message');
			$socketClient.socket = undefined;
		}
		console.log('disconnected from socket server');

		// redirect to login page
		goto('/login');
	}
	$socketClient.disconnect = disconnect;

	// When the $globalState.user value changes attempt to reconnect.
	globalState.subscribe(async (value: IStoreData) => {
		if (value.user && !$socketClient.socket && $socketClient.connect) {
			await $socketClient.connect();
		}
	});
</script>
