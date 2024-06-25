<script lang="ts">
	import type { SharedSecret } from '$lib/WE2EE/types';
	import type { Writable } from 'svelte/store';
	import type { IInitialMessage, IMessage, ISocketClient, IStoreData } from '../../../types';

	import Protocol from '$lib/WE2EE';
	import { base64ToBuffer } from '$lib/WE2EE/encoding';
	import { getContext } from 'svelte';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');
	const log = getContext<(logEntry: any) => void>('log');

	/**
	 *	Decrypts a message, derives a key, and stores it.
	 */
	async function receiveMessage(message: IMessage | IInitialMessage) {
		if (message.subject === 'ecdh-message' && 'SPK_ID' in message) {
			// derive a new SK
			const DHResult = await $protocol.deriveFromInitialMessage(message);
			const newSS = {
				username: message.from,
				IK: message.IK,
				salt: DHResult.salt,
				SK: DHResult.SK,
				AD: DHResult.AD
			};

			// Save the result
			const SSsQueryResult = await $protocol.store.getKeys<{ SSs: SharedSecret[] }>([
				{ name: 'SSs' }
			]);
			if (SSsQueryResult && SSsQueryResult.SSs && SSsQueryResult.SSs.length > 0) {
				await $protocol.store.updateKeys({ SSs: [...SSsQueryResult.SSs, newSS] });
			} else {
				await $protocol.store.updateKeys({ SSs: [newSS] });
			}

			// Decrypt the message
			if (message.content && message.iv) {
				const decryptedMessage = {
					subject: message.subject,
					to: message.to,
					from: message.from,
					content: await $protocol.decrypt(newSS.SK, base64ToBuffer(message.iv), message.content),
					timestamp: message.timestamp
				};

				// Save the message
				$globalState.messages = [...$globalState.messages, decryptedMessage];

				// Log decrypted message
				log({
					title: 'Received a message',
					more: {
						to: decryptedMessage.to,
						from: decryptedMessage.from,
						message: decryptedMessage.content
					}
				});
			}
		} else if (message.subject === 'text-message') {
			// Search for all the SKs associated with the sender
			const SSsQueryResult = await $protocol.store.getKeys<{ SSs: SharedSecret[] }>([
				{ name: 'SSs', filters: { IK: message.IK } }
			]);
			if (SSsQueryResult && SSsQueryResult.SSs) {
				// Search for the appropriate SK to decrypt the message.
				const SS = SSsQueryResult.SSs.find((value) => value.IK === message.IK);
				if (SS) {
					if (message.content && message.iv) {
						// Decrypt the message.
						const decryptedMessage = {
							subject: message.subject,
							to: message.to,
							from: message.from,
							content: await $protocol.decrypt(SS.SK, base64ToBuffer(message.iv), message.content),
							timestamp: message.timestamp
						};

						// Save the message.
						$globalState.messages = [...$globalState.messages, decryptedMessage];

						// Log decrypted message
						log({
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
	}
	$socketClient.receiveMessage = receiveMessage;
</script>
