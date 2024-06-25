<script lang="ts">
	import type { KeyPair, ReceivedKeyBundle, SharedSecret } from '$lib/WE2EE/types';
	import type { Writable } from 'svelte/store';
	import type { IInitialMessage, IMessage, ISocketClient, IStoreData } from '../../../types';

	import Protocol from '$lib/WE2EE';
	import { bufferToBase64, bufferToString } from '$lib/WE2EE/encoding';
	import { getContext } from 'svelte';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');
	const log = getContext<(logEntry: any) => void>('log');

	/**
	 * Sends a message to the other user
	 */
	async function sendMessage(content: string) {
		if ($globalState && $globalState.user && $socketClient.socket) {
			const currentDate = Date.now();
			const to = $globalState.user.username === 'Alice' ? 'Bob' : 'Alice';

			// Search for your IK and the SS of the user you want to communicate with.
			const storeQueryResult = await $protocol.store.getKeys<{
				IK: KeyPair;
				SSs: SharedSecret[];
			}>([{ name: 'IK' }, { name: 'SSs', filters: { username: to } }]);

			if (
				storeQueryResult &&
				storeQueryResult.IK &&
				storeQueryResult.SSs &&
				storeQueryResult.SSs.length > 0
			) {
				let needForward = true;
				// If SSs are found the send message using them all.
				for (let SS of storeQueryResult.SSs) {
					const IV = $protocol.generateIV().buffer;
					const encryptedContent = await $protocol.encrypt(SS.SK, IV, content);
					const message: IMessage = {
						subject: 'text-message',
						to: to,
						from: $globalState.user.username,
						content: encryptedContent,
						timestamp: currentDate,
						IK: bufferToBase64(storeQueryResult.IK.publicKey),
						iv: bufferToBase64(IV)
					};

					// Send the message
					$socketClient.socket.emit(
						'message',
						{ receiverId: SS.IK, message: message },
						async (response: { status: string }) => {
							if (response.status === 'Ok') {
								// Forward the messages to this sender's other sessions
								if (needForward) {
									// Save the message
									saveMessage(message, content, currentDate);
									const forwarded = await forwardMessage(message, content);
									needForward = forwarded;
								}
							}
						}
					);
				}
			} else {
				// If SK doesn't exist perform ECDH key exchange and send the initial message.
				//  Request for a key bundle
				$socketClient.socket.emit(
					'keys:request',
					{ username: to, allSessions: false },
					async (keyRequestResponse: { status: string; data: ReceivedKeyBundle }) => {
						if (
							keyRequestResponse.status === 'Ok' &&
							keyRequestResponse.data &&
							$globalState.user &&
							$socketClient.socket
						) {
							// Preform a ECDH.
							const DHResult = await $protocol.deriveFromBundle(keyRequestResponse.data);
							const SS = {
								username: to,
								IK: keyRequestResponse.data.IK,
								SK: DHResult.SK,
								AD: DHResult.AD,
								salt: DHResult.salt
							};

							// Save the key
							const SSsQueryResult = await $protocol.store.getKeys<{ SSs: SharedSecret[] }>([
								{ name: 'SSs' }
							]);
							if (SSsQueryResult && SSsQueryResult.SSs && SSsQueryResult.SSs.length > 0) {
								await $protocol.store.updateKeys({ SSs: [...SSsQueryResult.SSs, SS] });
							} else {
								await $protocol.store.updateKeys({ SSs: [SS] });
							}

							// Encrypt the message
							const IV = $protocol.generateIV().buffer;
							const encryptedContent = await $protocol.encrypt(SS.SK, IV, content);
							const message: IInitialMessage = {
								subject: 'ecdh-message',
								to: to,
								from: $globalState.user.username,
								content: encryptedContent,
								timestamp: currentDate,
								iv: bufferToBase64(IV),
								salt: bufferToBase64(SS.salt),
								IK: bufferToBase64(DHResult.IK),
								EK: bufferToBase64(DHResult.EK),
								SPK_ID: keyRequestResponse.data.SPK.id,
								OPK_ID: keyRequestResponse.data.OPK?.id
							};

							// Send the message
							$socketClient.socket.emit(
								'message',
								{ receiverId: keyRequestResponse.data.IK, message: message },
								async (messageResponse: { status: string; data: any }) => {
									if (messageResponse.status === 'Ok') {
										// Save the message
										saveMessage(message, content, currentDate);
										// Forward the message
										await forwardMessage(message, content);
										// Log sending the first message.
										log({
											title: 'Sent initial message',
											more: {
												message: message.content,
												receiverId: keyRequestResponse.data.IK,
												EK: bufferToBase64(DHResult.EK),
												SPK_ID: keyRequestResponse.data.SPK.id,
												OPK_ID: keyRequestResponse.data.OPK?.id
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
	$socketClient.sendMessage = sendMessage;

	/**
	 * A callback that forwards a message to all the sessions associated with the sender.
	 */
	async function forwardMessage(message: IInitialMessage | IMessage, content: string) {
		if (!$globalState.user || !$socketClient.socket) {
			return false;
		}

		// Find all the shared secrets with the other session this sender owns
		const SSsQueryResult = await $protocol.store.getKeys<{ SSs: SharedSecret[] }>([
			{ name: 'SSs', filters: { username: $globalState.user.username } }
		]);

		// If there are no other sessions, then there there are no messages to forward
		if (!SSsQueryResult || !SSsQueryResult.SSs) {
			return true;
		}

		// Forward the message to other sessions associated with this sender.
		const forwardResult: boolean[] = await Promise.all(
			SSsQueryResult.SSs.map((SS) => {
				return new Promise<boolean>(async (resolve) => {
					if (!$socketClient.socket) {
						resolve(false);
						return;
					}

					// Encrypt the message
					const IV = $protocol.generateIV().buffer;
					const messageToForward: IMessage = {
						subject: 'text-message',
						to: message.to,
						from: message.from,
						content: await $protocol.encrypt(SS.SK, IV, content),
						timestamp: message.timestamp,
						IK: message.IK,
						iv: bufferToBase64(IV)
					};

					// Send the message
					$socketClient.socket.emit(
						'message',
						{
							receiverId: SS.IK,
							message: messageToForward
						},
						(forwardResponse: { status: string }) => {
							if (forwardResponse.status === 'Ok') {
								if (!$globalState.user) {
									resolve(false);
									return;
								}
								// Log sending a message
								log({
									title: 'Sent a text message',
									more: {
										to: message.to,
										from: $globalState.user.username,
										message: message.content
									}
								});
								resolve(true);
							} else {
								resolve(false);
							}
						}
					);
				});
			})
		);

		// If one message is forwarded successfully then return true
		return forwardResult.includes(true);
	}

	/**
	 * Removes unnecessary keys and saves the message.
	 */
	function saveMessage(message: IMessage | IInitialMessage, content: string, currentDate: number) {
		// Save the message
		const savedMessage = {
			subject: message.subject,
			to: message.to,
			from: message.from,
			content: content,
			timestamp: currentDate
		};
		$globalState.messages = [...$globalState.messages, savedMessage];
	}
</script>
