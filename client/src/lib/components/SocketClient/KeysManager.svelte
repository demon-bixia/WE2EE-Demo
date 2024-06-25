<script lang="ts">
	import type {
		SignedKeyPair,
		KeyStoreKeys,
		ReceivedKeyBundle,
		SharedSecret
	} from '$lib/WE2EE/types';
	import type { Writable } from 'svelte/store';
	import type { IInitialMessage, ISocketClient, IStoreData } from '../../../types';

	import Protocol from '$lib/WE2EE';
	import { bufferToBase64 } from '$lib/WE2EE/encoding';
	import { getContext } from 'svelte';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');
	const log = getContext<(logEntry: any) => void>('log');

	/**
	 * Creates, updates encryption keys.
	 */
	async function setupKeys() {
		const keys = await $protocol.store.getKeys<KeyStoreKeys>('*');
		if (!keys || !keys.IK) {
			// Create a new keyBundle if the user has no keys and Upload it to the server.
			const keyBundle = await $protocol.generateKeyBundle();
			const preparedKeyBundle = $protocol.prepareKeyBundle(keyBundle);
			$socketClient.socket?.emit(
				'keys:upload',
				{ newSession: true, keyBundle: preparedKeyBundle },
				(response: { status: string }) => {
					if (response.status === 'Ok') {
						// Log publishing the keys
						log({
							title: 'Published key bundle to server',
							more: {
								IK: preparedKeyBundle.IK,
								SPK: preparedKeyBundle.SPK.publicKey,
								OPK1: preparedKeyBundle.OPKs[0].publicKey,
								OPK2: preparedKeyBundle.OPKs[1].publicKey
							}
						});
						// Derive keys from all sessions associated with this user.
						$socketClient.socket?.emit(
							'keys:request',
							{ username: $globalState.user?.username, allSessions: true },
							(response: { status: string; data: ReceivedKeyBundle[] }) => {
								if (response.status === 'Ok' && response.data && response.data.length > 0) {
									response.data.forEach(async (sessionKeys) => {
										if ($globalState.user && $socketClient.socket) {
											// Preform a ECDH.
											const DHResult = await $protocol.deriveFromBundle(sessionKeys);
											const SS: SharedSecret = {
												username: $globalState.user?.username,
												IK: sessionKeys.IK,
												SK: DHResult.SK,
												AD: DHResult.AD,
												salt: DHResult.salt
											};
											// Save the shared secret
											const SSsQueryResult = await $protocol.store.getKeys<{ SSs: SharedSecret[] }>(
												[{ name: 'SSs' }]
											);
											if (SSsQueryResult && SSsQueryResult.SSs && SSsQueryResult.SSs.length > 0) {
												await $protocol.store.updateKeys({ SSs: [...SSsQueryResult.SSs, SS] });
											} else {
												await $protocol.store.updateKeys({ SSs: [SS] });
											}
											// Log Deriving the shared key
											log({
												title: 'Performed ECDH with personal session',
												more: {
													IK: sessionKeys.IK
												}
											});

											// Create a ecdh message to send to the other session
											const message: IInitialMessage = {
												subject: 'ecdh-message',
												to: $globalState.user.username,
												from: $globalState.user.username,
												timestamp: Date.now(),
												salt: bufferToBase64(SS.salt),
												IK: preparedKeyBundle.IK,
												EK: bufferToBase64(DHResult.EK),
												SPK_ID: sessionKeys.SPK.id,
												OPK_ID: sessionKeys.OPK?.id
											};
											// Send the message
											$socketClient.socket.emit('message', {
												receiverId: sessionKeys.IK,
												message: message
											});
											// Log Sending the message
											log({
												title: 'Sent an ECDH message',
												more: {
													IK: sessionKeys.IK
												}
											});
										}
									});
								} else {
									console.log('Initial keys setup: User has no active sessions');
								}
							}
						);
					}
				}
			);
		} else if (keys.IK && keys.IK.privateKey) {
			const sessionIdSignature = await $protocol.sign(keys.IK.privateKey, keys.IK.publicKey);
			// Associate this session with the socket connection.
			$socketClient.socket?.emit(
				'sessions:associate',
				{
					sessionId: bufferToBase64(keys.IK.publicKey),
					signature: bufferToBase64(sessionIdSignature)
				},
				async (response: { status: string }) => {
					if (response.status === 'Ok' && keys && keys.IK) {
						// Update SPK if it's old enough.
						let SPKsQueryResult = await $protocol.store.getKeys<{
							SPKs: SignedKeyPair[];
						}>([{ name: 'SPKs', filters: { timeFilter: 'newest-key' } }]);
						if (SPKsQueryResult) {
							const SPKs = SPKsQueryResult.SPKs;
							const SPK = SPKs[0];
							const timeLimit = Date.now() + 1000 * 60 * 60 * 48;
							if (SPK.timestamp > timeLimit && keys.IK.privateKey) {
								const newSPK = await $protocol.regenerateSPK(keys.IK.privateKey);
								if (newSPK) {
									// upload the new spk to the server
									$socketClient.socket?.emit(
										'keys:upload',
										{
											newSession: false,
											keyBundle: {
												SPK: newSPK
											}
										},
										(response: { status: string }) => {
											if (response.status === 'Ok') {
												// Log Updating SPK
												log({
													title: 'Updated SPK',
													more: {
														SPK: newSPK.publicKey,
														signature: newSPK.signature
													}
												});
											}
										}
									);
								}
							}
						}

						// Remove old SPKs.
						const newSPKsQueryResult = await $protocol.store.getKeys<{
							SPKs: SignedKeyPair[];
						}>([{ name: 'SPKs', filters: { timeFilter: 'less-than-92-hours' } }]);
						if (newSPKsQueryResult && newSPKsQueryResult.SPKs.length > 0) {
							await $protocol.store.updateKeys({ SPKs: newSPKsQueryResult.SPKs });
						}

						// Refill OPKs.
						$socketClient.socket?.emit(
							'keys:check',
							{},
							async (response: { status: string; needKeys: boolean }) => {
								if (response.needKeys) {
									const OPKs = await $protocol.regenerateOPKs();
									$socketClient.socket?.emit(
										'keys:upload',
										{ newSession: false, keyBundle: { OPKs: OPKs } },
										(response: { status: string }) => {
											if (response.status === 'Ok') {
												// Log refiling OPKs
												log({
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
			);
		}
	}
	$socketClient.setupKeys = setupKeys;
</script>
