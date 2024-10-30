<script lang="ts">
	import type { ReceivedKeyBundle, SharedSecret } from '$lib/WE2EE/types';
	import type { Writable } from 'svelte/store';
	import type { IECDHMessage, ISocketClient, IStoreData } from '../../../types';

	import Protocol from '$lib/WE2EE';
	import { getContext } from 'svelte';
	import { bufferToDecimalArray } from '$lib/WE2EE/encoding';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socketClient = getContext<Writable<ISocketClient>>('socketClient');
	const protocol = getContext<Writable<Protocol>>('protocol');
	const log = getContext<(logEntry: any) => void>('log');

	/**
	 * Derives shared secrets from all the session
	 * of the user with the provided username.
	 */
	async function deriveFromBundles(username: string, sessions: ReceivedKeyBundle[]) {
		if (!$globalState.user || !$socketClient.socket) {
			return [];
		}

		return await Promise.all(
			sessions.map((session) => {
				return deriveFromBundle(username, session);
			})
		);
	}
	$socketClient.deriveFromBundles = deriveFromBundles;

	/**
	 * Derive a shared key from a key bundle.
	 */
	async function deriveFromBundle(username: string, session: ReceivedKeyBundle) {
		// Preform a ECDH.
		const DHResult = await $protocol.deriveFromBundle(session);
		const SS: SharedSecret = {
			username: username,
			IK: session.IK,
			SIK: session.SIK,
			SK: DHResult.SK,
			AD: DHResult.AD
		};

		// Save the shared secret
		const SSsQueryResult = await $protocol.store.getKeys<{ SSs: SharedSecret[] }>([
			{ name: 'SSs' }
		]);
		if (SSsQueryResult && SSsQueryResult.SSs && SSsQueryResult.SSs.length > 0) {
			await $protocol.store.updateKeys({ SSs: [...SSsQueryResult.SSs, SS] });
		} else {
			await $protocol.store.updateKeys({ SSs: [SS] });
		}

		// Log deriving from bundle.
		log({
			title: 'Derived from key bundle',
			more: {
				DH1: { value: DHResult.DH1, preview: 'end' },
				DH2: { value: DHResult.DH2, preview: 'end' },
				DH3: { value: DHResult.DH3, preview: 'end' },
				DH4: { value: DHResult.DH4, preview: 'end' }
			}
		});

		// Add the associated data to the verification codes array
		addVerificationCode(SS);

		return DHResult;
	}
	$socketClient.deriveFromBundle = deriveFromBundle;

	/**
	 * Derives a shared secret using the keys in an ECDH message
	 */
	async function deriveFromMessage(message: IECDHMessage) {
		// derive a new SK
		const DHResult = await $protocol.deriveFromInitialMessage(message);
		const SS: SharedSecret = {
			username: message.from,
			IK: message.IK,
			SIK: message.SIK,
			SK: DHResult.SK,
			AD: DHResult.AD
		};

		// Save the result
		const SSsQueryResult = await $protocol.store.getKeys<{ SSs: SharedSecret[] }>([
			{ name: 'SSs' }
		]);
		if (SSsQueryResult && SSsQueryResult.SSs && SSsQueryResult.SSs.length > 0) {
			await $protocol.store.updateKeys({ SSs: [...SSsQueryResult.SSs, SS] });
		} else {
			await $protocol.store.updateKeys({ SSs: [SS] });
		}

		// Log deriving from initial message.
		log({
			title: 'Derived from initial message',
			more: {
				DH1: { value: DHResult.DH1, preview: 'end' },
				DH2: { value: DHResult.DH2, preview: 'end' },
				DH3: { value: DHResult.DH3, preview: 'end' },
				DH4: { value: DHResult.DH4, preview: 'end' }
			}
		});

		// Add the associated data to the verification codes array
		addVerificationCode(SS);

		// if the bundle is derived form an session owned by this user update the owned sessions
		if ($globalState.user?.username === message.from && $socketClient.getPersonalSessions) {
			$socketClient.getPersonalSessions();
		}

		return DHResult;
	}
	$socketClient.deriveFromMessage = deriveFromMessage;

	/**
	 * Adds the AD byte sequence as to the verification codes list
	 */
	function addVerificationCode(SS: SharedSecret) {
		let codesIndex = $globalState.verificationCodes.findIndex(
			(codes) => codes.username === SS.username
		);

		if (codesIndex !== -1) {
			$globalState.verificationCodes[codesIndex] = {
				username: SS.username,
				codes: [
					...$globalState.verificationCodes[codesIndex].codes,
					bufferToDecimalArray(SS.AD).slice(-20, -9).join(' ')
				]
			};
		} else {
			$globalState.verificationCodes = [
				...$globalState.verificationCodes,
				{
					username: SS.username,
					codes: [bufferToDecimalArray(SS.AD).slice(-20, -9).join(' ')]
				}
			];
		}

		console.log($globalState.verificationCodes);
	}
	$socketClient.addVerificationCode = addVerificationCode;
</script>
