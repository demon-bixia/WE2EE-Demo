<script lang="ts">
	import type { Socket } from 'socket.io-client';
	import type { Writable } from 'svelte/store';
	import type { IInitialMessage, IMessage, ISavedMessage, IStoreData } from '../../types';

	import Protocol from '$lib/WE2EE';
	import type {
		AllKeyStoreKeys,
		ExportedSignedKeyPair,
		PreparedKeyBundle,
		SharedSecret
	} from '$lib/WE2EE/types';
	import { io } from 'socket.io-client';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';

	const globalState = getContext<Writable<IStoreData>>('globalState');

	const log = getContext<Writable<(logEntry: any) => void>>('log');

	const socket = writable<Socket<any> | undefined>(undefined);
	setContext('socket', socket);

	const protocol = writable<Protocol>(undefined);
	setContext('protocol', protocol);

	/**
	 *  A function thar connects to the socket server and adds event handlers.
	 */
	async function connect() {
		// if the user is logging connect to socket server.
		if ($globalState.user && $globalState.user.authToken) {
			$socket = io('http://localhost:3000', {
				extraHeaders: { authorization: `bearer ${$globalState.user.authToken}` }
			});
			// ** Add event handlers ** //
			// (event) handles new connection
			$socket.on('connect', async () => {
				if ($globalState.user && $globalState.user.authToken) {
					// Create the protocol instance.
					$protocol = new Protocol(
						`${$globalState.user.username}Keystore`,
						$globalState.user.authToken,
						$globalState.user.username
					);
					// Log Connection
					$log({ title: 'Connected to socket server' });
					// Setup keys.
					await setupAndUpdateKeys();
				}
				console.log('connected to socket server');
			});
			// (event) handles receiving a new message
			$socket.on('message', (message: IMessage | IInitialMessage) => {
				processMessage(message);
			});
			// (event) handles receiving a list of messages that were queued in the server
			$socket.on('queued-messages', (messages: (IMessage | IInitialMessage)[]) => {
				for (let message of messages) {
					processMessage(message);
				}
			});
		}
	}
	setContext('connect', connect);

	/**
	 * A function that disconnects from the socket server and removes all event handlers.
	 */
	function disconnect() {
		if ($socket) {
			$socket.disconnect();
			$socket.off('connect');
			$socket.off('message');
			$socket = undefined;
			// Log disconnecting
			$log({
				title: 'disconnected from socket server'
			});
		}
		console.log('disconnected from socket server');
	}
	setContext('disconnect', disconnect);

	/**
	 *	Decrypts a message, derives a key, and stores it.
	 */
	async function processMessage(message: IMessage | IInitialMessage | ISavedMessage) {
		if (message.subject === 'ecdh-message' && 'SPK_ID' in message) {
			// derive a new SK
			const SK = await $protocol.deriveFromInitialMessage(message);
			// save the SK
			await $protocol.store.updateKeys({ SKs: [{ ...SK, username: message.from }] });
			if (message.content && message.iv) {
				// Decrypt the message
				const decryptedMessage: ISavedMessage = {
					subject: message.subject,
					to: message.to,
					from: message.from,
					content: await $protocol.decrypt(SK.SK, $protocol.encode(message.iv), message.content),
					timestamp: message.timestamp
				};
				// Save the message
				$globalState.messages = [...$globalState.messages, decryptedMessage];
				// Log decrypted message
				$log({
					title: 'Received a message',
					more: {
						to: decryptedMessage.to,
						from: decryptedMessage.from,
						message: decryptedMessage.content
					}
				});
			}
		} else if (message.subject === 'text-message' && 'IK' in message) {
			// Search for all the SKs associated with this sender
			const SKs = await $protocol.store.getKeys<SharedSecret[]>([
				{ name: 'SK', filters: { username: message.to } }
			]);
			// Search for the appropriate SK to decrypt the message.
			const SK = SKs.find((value) => value.IK === $protocol.encode(message.IK));
			if (SK) {
				if (message.content && message.iv) {
					// Decrypt the message.
					const decryptedMessage = {
						subject: message.subject,
						to: message.to,
						from: message.from,
						content: await $protocol.decrypt(SK.SK, $protocol.encode(message.iv), message.content),
						timestamp: message.timestamp
					};
					// Save the message.
					$globalState.messages = [...$globalState.messages, decryptedMessage];
					// Log decrypted message
					$log({
						title: 'Decrypted a message',
						more: {
							to: decryptedMessage.to,
							from: decryptedMessage.from,
							message: decryptedMessage.content
						}
					});
				}
			}
		}
	}

	/**
	 * Creates, updates encryption keys.
	 */
	async function setupAndUpdateKeys() {
		const keys = await $protocol.store.getKeys<AllKeyStoreKeys>('*');
		if (!keys.IK) {
			// Create a new keyBundle if the user has no keys and Upload it to the server.
			const keyBundle = await $protocol.generateKeyBundle();
			const preparedKeyBundle = $protocol.prepareKeyBundle(keyBundle);
			$socket?.emit('keys:upload', { newSession: true, keyBundle: preparedKeyBundle });
			// Log publishing the keys
			$log({
				title: 'Published key bundle to server',
				more: {
					IK: preparedKeyBundle.IK,
					SPK: preparedKeyBundle.SPK.publicKey,
					OPK1: preparedKeyBundle.OPKs[0].publicKey,
					OPK2: preparedKeyBundle.OPKs[1].publicKey
				}
			});

			// Derive keys from all sessions associated with this user.
			$socket?.emit(
				'keys:request',
				{ username: $globalState.user?.username },
				(response: { status: string; data: PreparedKeyBundle[] }) => {
					response.data.forEach(async (sessionKeys) => {
						if ($globalState.user && $socket) {
							// Preform a ECDH.
							const DHResult = await $protocol.deriveFromBundle(sessionKeys);
							const SK: SharedSecret = {
								username: $globalState.user?.username,
								IK: DHResult.IK,
								SK: DHResult.SK,
								AD: DHResult.AD,
								salt: DHResult.salt
							};
							// Save the key
							const SKs = await $protocol.store.getKeys<SharedSecret[]>([{ name: 'SKs' }]);
							await $protocol.store.updateKeys({ SKs: [...SKs, SK] });
							// Create the message
							const message: IInitialMessage = {
								subject: 'ecdh-message',
								to: $globalState.user.username,
								from: $globalState.user.username,
								timestamp: Date.now(),
								salt: $protocol.decode(SK.salt),
								IK: $protocol.decode(keyBundle.IK.publicKey as ArrayBuffer),
								EK: $protocol.decode(DHResult.EK),
								SPK_ID: sessionKeys.SPK.id,
								OPK_ID: sessionKeys.OPK?.id
							};
							// Send a ecdh message
							$socket.emit('message', message);
							// Log publishing the keys
							$log({
								title: 'Published key bundle to server',
								more: {
									IK: preparedKeyBundle.IK,
									SPK: preparedKeyBundle.SPK.publicKey,
									OPK1: preparedKeyBundle.OPKs[0].publicKey,
									OPK2: preparedKeyBundle.OPKs[1].publicKey
								}
							});
							// Log Deriving keys
							$log({
								title: 'Performed ECDH with personal session',
								more: {
									IK: sessionKeys.IK
								}
							});
						}
					});
				}
			);
		} else {
			if (keys.IK) {
				const sessionIdSignature = await $protocol.sign(keys.IK.privateKey, keys.IK.publicKey);
				// Associate this session with the socket connection.
				$socket?.emit(
					'sessions:associate',
					{
						sessionId: $protocol.decode(keys.IK.publicKey),
						signature: $protocol.decode(sessionIdSignature)
					},
					async (response: { status: string }) => {
						if (response.status === 'Ok') {
							// Update SPK if it's old enough.
							const { SPKs } = await $protocol.store.getKeys<{
								SPKs: ExportedSignedKeyPair[];
							}>([{ name: 'SPKs', filters: { timeFilter: 'newest-key' } }]);
							const SPK = SPKs[0];
							const timeLimit = Date.now() - 1000 * 60 * 60 * 48;
							if (keys.SPK && SPK.timestamp > timeLimit && keys.IK) {
								const newSPK = await $protocol.regenerateSPK(<ArrayBuffer>keys.IK.privateKey);
								$socket?.emit('keys:upload', {
									newSession: false,
									keyBundle: {
										IK: keys.IK,
										SPK: newSPK
									}
								});
								// Log Updating SPK
								$log({
									title: 'Updated SPK',
									more: {
										SPK: newSPK.publicKey,
										signature: newSPK.signature
									}
								});
							}

							// Remove old SPKs.
							const filterResult = await $protocol.store.getKeys<{
								SPKs: ExportedSignedKeyPair[];
							}>([{ name: 'SPKs', filters: { timeFilter: 'less-than-92-hours' } }]);
							if (filterResult.SPKs.length > 0) {
								await $protocol.store.updateKeys({ SPKs: filterResult.SPKs });
								// Log removing old SPKs
								for (let SPK of filterResult.SPKs) {
									$log({
										title: 'Removed old SPKs',
										more: {
											SPK: $protocol.decode(SPK.publicKey as ArrayBuffer),
											signature: $protocol.decode(SPK.signature as ArrayBuffer)
										}
									});
								}
							}

							// Refill OPKs.
							$socket?.emit(
								'keys:check',
								async (response: { status: string; needKeys: boolean }) => {
									if (response.needKeys) {
										const OPKs = await $protocol.regenerateOPKs();
										$socket?.emit('keys:upload', OPKs);
										// Log refiling OPKs
										$log({
											title: 'Refilled the server list of OPKs',
											more: {
												OPK1: OPKs[0].publicKey,
												OPK2: OPKs[1].publicKey
											}
										});
									}
								}
							);
						}
					}
				);
			}
		}
	}

	// when the $globalState.user value changes
	// attempt to reconnect;
	globalState.subscribe(async (value: IStoreData) => {
		if (value.user && !$socket) {
			await connect();
		}
	});
</script>

<slot></slot>
