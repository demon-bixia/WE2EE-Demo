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
			SK: DHResult.SK,
			AD: DHResult.AD,
			salt: DHResult.salt
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
		const SS = {
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
			await $protocol.store.updateKeys({ SSs: [...SSsQueryResult.SSs, SS] });
		} else {
			await $protocol.store.updateKeys({ SSs: [SS] });
		}

		// Add the associated data to the verification codes array
		addVerificationCode(SS);

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
			$globalState.verificationCodes.push({
				username: SS.username,
				codes: [bufferToDecimalArray(SS.AD).slice(-20, -9).join(' ')]
			});
		}
	}
	$socketClient.addVerificationCode = addVerificationCode;
</script>
