<script lang="ts">
	import type { KeyPair, SharedSecret } from '$lib/WE2EE/types';
	import type { Writable } from 'svelte/store';
	import type {
		IECDHMessage,
		IInitialMessage,
		ITextMessage,
		ISocketClient,
		IStoreData,
		IUpdateMessage
	} from '../../../types';

	import Protocol from '$lib/WE2EE';
	import { base64ToBuffer, stringToBuffer } from '$lib/WE2EE/encoding';
	import { getContext } from 'svelte';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');
	const log = getContext<(logEntry: any) => void>('log');

	/**
	 *	Decrypts a message, derives a key, and stores it.
	 */
	async function receiveMessage(message: ITextMessage | IECDHMessage) {
		if (!$globalState.user) {
			throw new Error('There is no authenticated user');
		}

		// Verify the signature of the message
		const { signature, ...unsignedMessage } = message;
		const encodedMessage = stringToBuffer(JSON.stringify(unsignedMessage));
		const messageHash = await $protocol.hash(encodedMessage);
		const verified = await $protocol.verify(
			base64ToBuffer(message.SIK),
			base64ToBuffer(signature),
			messageHash
		);
		if (!verified) {
			throw new Error('message verification failure');
		}

		// Process the message
		if (message.subject === 'ecdh' && 'SPK_ID' in message) {
			await receiveECDHMessage(message);
		} else if (['text', 'forward'].includes(message.subject)) {
			await receiveTextMessage(message as ITextMessage);
		}
	}
	$socketClient.receiveMessage = receiveMessage;

	/**
	 * Decrypts and stores a text message
	 */
	async function receiveTextMessage(message: ITextMessage) {
		// Check SocketClient methods
		if (!$socketClient.saveMessage) {
			throw new Error('SocketClient is not setup properly');
		}

		// Search for all the SKs associated with the sender
		const storeQueryResult = await $protocol.store.getKeys<{ SSs: SharedSecret[]; IK: KeyPair }>([
			{ name: 'SSs', filters: { IK: message.IK } },
			{ name: 'IK' }
		]);

		if (!storeQueryResult || !storeQueryResult.SSs || !storeQueryResult.IK) {
			throw new Error('SSs or IK not found');
		}

		// Search for the appropriate SK to decrypt the message.
		const SS = storeQueryResult.SSs.find((value) => value.IK === message.IK);
		if (!SS) {
			throw new Error('SK appropriate to decrypt the message is not found');
		}

		// Check if the message has content
		if (!message.content) {
			throw new Error("message with subject 'text' must have content");
		}

		// Decrypt and save the message.
		const content = await $protocol.decrypt(SS.SK, base64ToBuffer(message.iv), message.content);
		$socketClient.saveMessage(message, content);

		// Log decrypted message
		log({
			title: 'Decrypted a message',
			more: {
				to: { value: message.to, preview: 'start' },
				from: { value: message.from, preview: 'start' },
				decryptedMessage: { value: content, preview: 'start' },
				message: { value: message.content, preview: 'end' }
			}
		});

		return { SS: SS, IK: storeQueryResult.IK };
	}

	/**
	 * Derive a shared secret and decrypt the content of the message
	 */
	async function receiveECDHMessage(message: IECDHMessage | IInitialMessage) {
		// Check SocketClient methods
		if (
			!$socketClient.deriveFromMessage ||
			!$socketClient.saveMessage ||
			!$socketClient.getPersonalSessions
		) {
			throw new Error('SocketClient is not setup properly');
		}

		// Search for the IK
		const storeQueryResult = await $protocol.store.getKeys<{ IK: KeyPair }>([{ name: 'IK' }]);
		if (!storeQueryResult || !storeQueryResult.IK) {
			throw new Error('IK not found');
		}

		// Derive shared secret from the initial message
		const DHResult = await $socketClient.deriveFromMessage(message);

		// Decrypt and save the message
		if ('content' in message && message.iv) {
			const content = await $protocol.decrypt(
				DHResult.SK,
				base64ToBuffer(message.iv),
				message.content
			);

			$socketClient.saveMessage(message, content);

			// Update personal sessions if the IK of the username of the sender is the username of the
			// receiver
			if (message.to === message.from) {
				$socketClient.getPersonalSessions();
			}

			// Log decrypted message
			log({
				title: 'Received a message',
				more: {
					to: { value: message.to, preview: 'start' },
					from: { value: message.from, preview: 'start' },
					decryptedMessage: { value: content, preview: 'start' },
					message: { value: message.content, preview: 'end' }
				}
			});
		}

		return { SS: DHResult, IK: storeQueryResult.IK };
	}
</script>
