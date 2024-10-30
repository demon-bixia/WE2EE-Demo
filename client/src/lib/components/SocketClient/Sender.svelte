<script lang="ts">
	import type { DHResult, KeyPair, ReceivedKeyBundle, SharedSecret } from '$lib/WE2EE/types';
	import type { Writable } from 'svelte/store';
	import type {
		IInitialMessage,
		ITextMessage,
		ISocketClient,
		IStoreData,
		TMessageTypes,
		IECDHMessage
	} from '../../../types';

	import Protocol from '$lib/WE2EE';
	import { bufferToBase64, stringToBuffer } from '$lib/WE2EE/encoding';
	import { getContext } from 'svelte';

	// **** Types **** //
	interface IStoreQueryResult {
		IK: KeyPair;
		SIK: KeyPair;
		SSs: SharedSecret[];
	}

	// **** Variables **** //
	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');
	const log = getContext<(logEntry: any) => void>('log');

	// **** Functions **** //
	/**
	 * Takes a string searches for keys and broadcasts the
	 * encrypted text message using these keys.
	 */
	async function sendMessage(content: string) {
		if (!$globalState || !$globalState.user) {
			throw new Error('User not authenticated');
		}

		if (!$socketClient.socket) {
			throw new Error('SocketClient is not setup properly');
		}

		const to = $globalState.user.username === 'Alice' ? 'Bob' : 'Alice';

		// Search for your IK and the SS of the user you want to communicate with.
		const storeQueryResult = await $protocol.store.getKeys<IStoreQueryResult>([
			{ name: 'IK' },
			{ name: 'SIK' },
			{ name: 'SSs', filters: { username: to } }
		]);

		const knownSessions = validateQueryResult(storeQueryResult)
			? getKnownSessions((storeQueryResult as IStoreQueryResult).SSs)
			: [];

		let saved = false;

		// Send the message using the known keys
		if (knownSessions.length > 0) {
			broadcastMessage(
				'text',
				to,
				(storeQueryResult as IStoreQueryResult).SSs,
				(storeQueryResult as IStoreQueryResult).IK,
				(storeQueryResult as IStoreQueryResult).SIK,
				true,
				content
			);
			saved = true;
		}

		// Get new sessions
		$socketClient.socket.emit(
			'keys:request',
			{ username: to, knownSessions: knownSessions },
			async (keyRequestResponse: { status: string; data: ReceivedKeyBundle[] }) => {
				if (keyRequestResponse.status !== 'Ok' || !keyRequestResponse.data) {
					throw new Error('Failed to get keys from the server');
				}

				if (!$socketClient.deriveFromBundles) {
					throw new Error('SocketClient is not setup properly');
				}

				if (keyRequestResponse.data.length > 0) {
					const DHResults = await $socketClient.deriveFromBundles(to, keyRequestResponse.data);
					await broadcastMessage(
						'ecdh',
						to,
						DHResults,
						(storeQueryResult as IStoreQueryResult).IK,
						(storeQueryResult as IStoreQueryResult).SIK,
						!saved,
						content
					);
				}
			}
		);
	}
	$socketClient.sendMessage = sendMessage;

	/**
	 * check if the store query result is valid
	 * @param storeQueryResult
	 */
	function validateQueryResult(storeQueryResult: IStoreQueryResult | undefined): boolean {
		return Boolean(
			storeQueryResult &&
				storeQueryResult.IK &&
				storeQueryResult.SSs &&
				storeQueryResult.SSs.length > 0
		);
	}

	/**
	 * Broadcasts a message using the provided keys.
	 */
	async function broadcastMessage(
		subject: TMessageTypes,
		to: string,
		keys: SharedSecret[] | DHResult[] | (SharedSecret | DHResult)[],
		IK: KeyPair,
		SIK: KeyPair,
		save: boolean,
		content?: string,
		extraData?: any
	) {
		let needFroward = true;
		let needSave = save;
		const knownSessions = getKnownSessions(keys);

		keys.forEach(async (value) => {
			// Check connections
			if (!$socketClient.socket) {
				throw new Error('No socket connection');
			}

			const message = await constructMessage(
				subject,
				to,
				IK,
				SIK,
				value,
				knownSessions,
				content,
				extraData
			);

			const receiverID = 'oddIK' in value ? bufferToBase64(value.oddIK) : value.IK;

			// Send the message
			$socketClient.socket.emit(
				'message',
				{ receiverId: receiverID, message: message },
				async (messageResponse: { status: string; data: any }) => {
					if (messageResponse.status === 'Ok') {
						// Forward the messages to this sender's other sessions
						if (needSave && content) {
							// Save the message
							saveMessage(message, content);
							needSave = false;
							// Log sending the message.
							log({
								title: 'Sent message',
								more: {
									subject: { value: subject, preview: 'start' },
									message: { value: content, preview: 'end' },
									encryptedMessage: { value: message.content, preview: 'end' },
									receiverId: { value: receiverID, preview: 'end' }
								}
							});
						}

						if (needFroward && content) {
							const forwarded = await forwardMessage(message, IK, SIK, content);
							needFroward = forwarded;
						}
					}
				}
			);
		});
	}
	$socketClient.broadcastMessage = broadcastMessage;

	/**
	 * Returns a list containing the identity keys of all the known sessions.
	 */
	function getKnownSessions(keys: DHResult[] | SharedSecret[] | (SharedSecret | DHResult)[]) {
		return keys.map((value) => ('oddIK' in value ? bufferToBase64(value.oddIK) : value.IK));
	}

	/**
	 * Removes unnecessary keys and saves the message.
	 */
	function saveMessage(message: ITextMessage | IInitialMessage | IECDHMessage, content: string) {
		// Save the message
		const savedMessage = {
			id: message.id,
			subject: message.subject,
			to: message.to,
			from: message.from,
			content: content,
			timestamp: message.timestamp,
			knownSessions: message.knownSessions
		};
		$globalState.messages = [...$globalState.messages, savedMessage];
	}
	$socketClient.saveMessage = saveMessage;

	/**
	 *  Constructs a message based on the parameters provided.
	 */
	async function constructMessage(
		subject: TMessageTypes,
		to: string,
		IK: KeyPair,
		SIK: KeyPair,
		SS: SharedSecret | DHResult,
		knownSessions: string[],
		content?: string,
		extraData?: any
	): Promise<ITextMessage | IInitialMessage> {
		if (!$globalState.user) {
			throw new Error('There is no authenticated user');
		}

		const currentDate = Date.now();
		let message: any = {
			id: window.crypto.randomUUID(),
			subject: subject,
			to: to,
			from: $globalState.user.username,
			timestamp: currentDate,
			IK: bufferToBase64(IK.publicKey),
			SIK: bufferToBase64(SIK.publicKey),
			knownSessions: knownSessions
		};

		if (content) {
			// Encrypt message content
			const IV = $protocol.generateIV().buffer;
			const encryptedContent = await $protocol.encrypt(SS.SK, IV, content);
			message['content'] = encryptedContent;
			message['iv'] = bufferToBase64(IV);
		}

		// construct the message
		let unsignedMessage;
		if (subject === 'ecdh') {
			unsignedMessage = {
				...message,
				salt: bufferToBase64(SS.salt),
				EK: bufferToBase64((SS as DHResult).EK),
				SPK_ID: (SS as DHResult).SPK_ID,
				OPK_ID: (SS as DHResult).OPK_ID
			};
		} else {
			unsignedMessage = { ...message, ...extraData };
		}

		// create sign the content of the message using the identity signature private key
		const encodedMessage = stringToBuffer(JSON.stringify(unsignedMessage));
		const hashOfMessage = await $protocol.hash(encodedMessage);
		const signature = await $protocol.sign(SIK.privateKey, hashOfMessage);

		// return signed message
		return { ...unsignedMessage, signature: bufferToBase64(signature) };
	}

	/**
	 * A callback that forwards a message to all the sessions associated with the sender.
	 */
	async function forwardMessage(
		message: IInitialMessage | ITextMessage,
		IK: KeyPair,
		SIK: KeyPair,
		content: string
	) {
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

					// Construct the forward message
					const messageToForward = await constructMessage(
						'forward',
						message.to,
						IK,
						SIK,
						SS,
						message.knownSessions,
						content
					);

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
</script>
