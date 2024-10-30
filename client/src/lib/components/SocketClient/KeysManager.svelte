<script lang="ts">
	import type { KeyStoreKeys, SignedKeyPair, ReceivedKeyBundle } from '$lib/WE2EE/types';
	import type { Writable } from 'svelte/store';
	import type { IPersonalSession, ISocketClient, IStoreData } from '../../../types';

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

		if (!keys || !keys.IK || !keys.SIK) {
			// Create a new keyBundle if the user has no keys and Upload it to the server.
			const keyBundle = await $protocol.generateKeyBundle();
			const preparedKeyBundle = $protocol.prepareKeyBundle(keyBundle);
			$socketClient.socket?.emit(
				'keys:upload',
				{ newSession: true, keyBundle: preparedKeyBundle },
				(response: { status: string }) => {
					if (response.status === 'Ok' && $globalState.user) {
						// Log publishing the keys
						log({
							title: 'Published key bundle to server',
							more: {
								IK: { value: preparedKeyBundle.IK, preview: 'end' },
								SPK: { value: preparedKeyBundle.SPK.publicKey, preview: 'end' },
								OPK1: { value: preparedKeyBundle.OPKs[0].publicKey, preview: 'end' },
								OPK2: { value: preparedKeyBundle.OPKs[1].publicKey, preview: 'end' }
							}
						});
						getPersonalSessions();
						// Derive keys from all sessions associated with this user.
						$socketClient.socket?.emit(
							'keys:request',
							{ username: $globalState.user.username },
							async (response: { status: string; data: ReceivedKeyBundle[] }) => {
								if (
									response.status === 'Ok' &&
									response.data &&
									response.data.length > 0 &&
									$socketClient.deriveFromBundles &&
									$socketClient.broadcastMessage &&
									$globalState.user
								) {
									const DHResult = await $socketClient.deriveFromBundles(
										$globalState.user.username,
										response.data
									);
									$socketClient.broadcastMessage(
										'ecdh',
										$globalState.user.username,
										DHResult,
										keyBundle.IK,
										keyBundle.SIK,
										false
									);
								} else {
									console.log('Initial keys setup: User has no active sessions');
								}
							}
						);
					}
				}
			);
		} else if (keys.IK && keys.IK.privateKey) {
			// Add the list of verification codes to the global state
			$globalState.verificationCodes = [];
			keys.SSs?.forEach((SS) => {
				if (!$socketClient.addVerificationCode) {
					throw new Error('SocketClient is not setup properly');
				}
				$socketClient.addVerificationCode(SS);
			});

			// Associate this session with the socket connection.
			const signature = await $protocol.createSIKSignature();
			$socketClient.socket?.emit(
				'sessions:associate',
				{
					sessionId: bufferToBase64(keys.IK.publicKey),
					signature: bufferToBase64(signature)
				},
				async (response: { status: string }) => {
					if (response.status === 'Ok') {
						await updateKeys(keys);
						getPersonalSessions();
					}
				}
			);
		}
	}
	$socketClient.setupKeys = setupKeys;

	/**
	 * Updates outdated keys and refills OPKs
	 */
	async function updateKeys(currentKeys: KeyStoreKeys) {
		if (currentKeys && currentKeys.IK && currentKeys.SIK) {
			// Update SPK if it's old enough.
			let SPKsQueryResult = await $protocol.store.getKeys<{
				SPKs: SignedKeyPair[];
			}>([{ name: 'SPKs', filters: { timeFilter: 'newest-key' } }]);
			if (SPKsQueryResult) {
				const SPKs = SPKsQueryResult.SPKs;
				const SPK = SPKs[0];
				const timeLimit = Date.now() + 1000 * 60 * 60 * 48;
				if (SPK.timestamp > timeLimit) {
					const newSPK = await $protocol.regenerateSPK(currentKeys.SIK.privateKey);
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
										title: 'Updated the SPK',
										more: {
											SPK: { value: newSPK.publicKey, preview: 'end' },
											signature: { value: newSPK.signature, preview: 'end' }
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
											OPK1: { value: OPKs[0].publicKey, preview: 'end' },
											OPK2: { value: OPKs[1].publicKey, preview: 'end' },
											OPK3: { value: OPKs[2].publicKey, preview: 'end' },
											OPK4: { value: OPKs[3].publicKey, preview: 'end' },
											OPK5: { value: OPKs[4].publicKey, preview: 'end' }
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

	/**
	 * Get list of personal sessions from the server
	 */
	async function getPersonalSessions() {
		return new Promise<IPersonalSession[]>(async (resolve, reject) => {
			if (!$socketClient.socket) {
				return reject(Error('SocketClient is not setup properly.'));
			}
			$socketClient.socket.emit(
				'sessions:getPersonal',
				undefined,
				(response: {
					status: string;
					data: IPersonalSession[];
					currentSession: IPersonalSession;
				}) => {
					if (response.status !== 'Ok' || !response.data) {
						throw new Error('Failed to get personal sessions from the server');
					}
					$globalState.personalSessions = response.data;
					$globalState.currentSession = response.currentSession;
					resolve(response.data);
				}
			);
		});
	}
	$socketClient.getPersonalSessions = getPersonalSessions;

	/**
	 * Checks if the other user has keys
	 */
	async function checkForKeys() {
		if (!$socketClient.socket) {
			throw new Error('there is no socket connection');
		}

		if (!$globalState.user) {
			throw new Error('user is not authenticated');
		}

		$socketClient.socket.emit(
			'keys:hasKeysCheck',
			{ username: $globalState.user.username === 'Alice' ? 'Bob' : 'Alice' },
			(response: { status: string; canSend: boolean }) => {
				if (response.status == 'Ok' && response.canSend) {
					$globalState.canSend = true;
				} else {
					$globalState.canSend = false;
				}
			}
		);
	}
	$socketClient.checkForKeys = checkForKeys;
</script>
