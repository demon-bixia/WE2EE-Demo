/**
 * Protocol functions used to sign, verify, encrypt,
 * decrypt messages and exchange keys.
 */
import type {
	InitialMessageKeys,
	KeyBundle,
	KeyPair,
	OPK,
	PreparedKeyBundle,
	PreparedOPK,
	PreparedSignedKeyPair,
	ReceivedKeyBundle,
	SignedKeyPair,
	DHResult,
	KeyStoreKeys
} from './types';

import { base64ToBuffer, bufferToBase64, bufferToString, stringToBuffer } from './encoding';
import { ExchangeError, IndexedDBNotFound } from './errors';
import KeyStore from './store';

/**
 * Contains the methods that are used by the protocol.
 */
class Protocol {
	// ASCII string representing the application.
	public applicationId: ArrayBuffer;
	// Key store object used to manipulate indexedDB key store
	public store: KeyStore;

	constructor(storeName: string, username: string, applicationId: string) {
		this.applicationId = stringToBuffer(applicationId);
		this.store = new KeyStore(storeName, username);
	}

	/**
	 * Concatenates an array of ArrayBuffers.
	 */
	concatenate(buffers: ArrayBuffer[]) {
		let length = 0;
		buffers.forEach((buffer) => {
			length += buffer.byteLength;
		});

		let tmp = new Uint8Array(length);
		let offset = 0;
		buffers.forEach((buffer) => {
			tmp.set(new Uint8Array(buffer), offset);
			offset = buffer.byteLength;
		});

		return tmp.buffer;
	}

	/**
	 *  Sign the message using EcDSA.
	 */
	async sign(privateKey: CryptoKey, data: ArrayBuffer) {
		return await window.crypto.subtle.sign(
			{ name: 'ECDSA', hash: { name: 'SHA-256' } },
			privateKey,
			data
		);
	}

	/**
	 * Creates a signature of the IK private key using
	 * the IK public key as the signed content.
	 */
	async createSIKSignature() {
		const storeQueryResult = await this.store.getKeys<KeyStoreKeys>([
			{ name: 'SIK' },
			{ name: 'IK' }
		]);
		if (!storeQueryResult || !storeQueryResult.SIK || !storeQueryResult.IK) {
			throw new Error('SIK and IK are not found');
		}
		const hashedSessionId = await this.hash(storeQueryResult.IK.publicKey);
		return await this.sign(storeQueryResult.SIK.privateKey, hashedSessionId);
	}

	/**
	 * Verify the message using EcDSA.
	 */
	async verify(publicKey: ArrayBuffer, signature: ArrayBuffer, data: ArrayBuffer) {
		const importedPublicKey = await window.crypto.subtle.importKey(
			'spki',
			publicKey,
			{ name: 'ECDSA', namedCurve: 'P-256' },
			false,
			['verify']
		);
		return await window.crypto.subtle.verify(
			{ name: 'ECDSA', hash: { name: 'SHA-256' } },
			importedPublicKey,
			signature,
			data
		);
	}

	/**
	 * Generates a sha256 hash.
	 */
	async hash(data: ArrayBuffer) {
		return await window.crypto.subtle.digest('SHA-256', data);
	}

	/**
	 * Generates an iv to be used by AES.
	 */
	generateIV() {
		return window.crypto.getRandomValues(new Uint8Array(16));
	}

	/**
	 * Generates a P-256 key pairs used by this protocol
	 * for ECDH and ECDSA key exchange.
	 */
	async generateKeyPair(
		name: 'ECDH' | 'ECDSA',
		useCases: ['deriveKey'] | ['sign', 'verify'],
		exportable: boolean = false
	): Promise<KeyPair> {
		const algorithm = { name: name, namedCurve: 'P-256' };
		// Generate elliptic curve keys.
		const keyPair = await window.crypto.subtle.generateKey(algorithm, exportable, useCases);
		// Return the encoded keys in spki format.
		return {
			publicKey: await window.crypto.subtle.exportKey('spki', keyPair.publicKey),
			privateKey: keyPair.privateKey
		};
	}

	/**
	 * Generates a long-term identity key.
	 */
	async generateIK() {
		return await this.generateKeyPair('ECDH', ['deriveKey'], false);
	}

	/**
	 * Generates a long-term signing identity key.
	 */
	async generateSIK() {
		return await this.generateKeyPair('ECDSA', ['sign', 'verify'], false);
	}

	/**
	 * Generates a temporary ECDH key signed with
	 * the private identity key using ECDSA.
	 */
	async generateSPK(privateKey: CryptoKey): Promise<SignedKeyPair> {
		// Generate the key
		const keyPair = await this.generateKeyPair('ECDH', ['deriveKey']);
		// Sign the public key using the IK
		const signature = await this.sign(privateKey, keyPair.publicKey);
		// Return the encoded keys and the signature
		return {
			id: window.crypto.randomUUID(),
			publicKey: keyPair.publicKey,
			privateKey: keyPair.privateKey,
			signature: signature,
			timestamp: Date.now()
		};
	}

	/**
	 * Create a new spk and updates the keystore.
	 */
	async regenerateSPK(privateKey: CryptoKey): Promise<PreparedSignedKeyPair> {
		const newSPK = await this.generateSPK(privateKey);
		const SPKsQueryResult = await this.store.getKeys<{ SPKs: SignedKeyPair[] }>([{ name: 'SPKs' }]);
		// Save the key
		if (SPKsQueryResult && SPKsQueryResult.SPKs && SPKsQueryResult.SPKs.length > 0) {
			this.store.updateKeys({ SPKs: [...SPKsQueryResult.SPKs, newSPK] });
		} else {
			this.store.updateKeys({ SPKs: [newSPK] });
		}
		// Remove the secrets
		const preparedSPK = this.prepareSPK(newSPK);
		return preparedSPK;
	}

	/**
	 * Generates an a list of single use one time pre-keys.
	 */
	async generateOPKs(): Promise<OPK[]> {
		const OPKs = await Promise.all(
			Array(5)
				.fill(0)
				.map(async (): Promise<OPK> => {
					const keyPair = await this.generateKeyPair('ECDH', ['deriveKey']);
					return {
						id: window.crypto.randomUUID(),
						publicKey: keyPair.publicKey,
						privateKey: keyPair.privateKey
					};
				})
		);
		return OPKs;
	}

	/**
	 * Creates and saves a new array of OPKs ready to be uploaded to the server.
	 */
	async regenerateOPKs(): Promise<PreparedOPK[]> {
		const OPKs = await this.generateOPKs();
		// Save the key
		this.store.updateKeys({ OPKs });
		const preparedOPK = this.prepareOPKs(OPKs);
		return preparedOPK;
	}

	/**
	 * Runs when the user logs-in for the first time, generates a key bundle
	 * containing the following keys:
	 * 1. IK:	A long-term Identity key.
	 * 2. SPK:	A temporary signed pre-key.
	 * 3. OPKs: A list of single use one time pre-keys.
	 */
	async generateKeyBundle(): Promise<KeyBundle> {
		const IK = await this.generateIK();
		const SIK = await this.generateSIK();
		const SPK = await this.generateSPK(SIK.privateKey);
		const OPKs = await this.generateOPKs();
		// Save the keyBundle
		await this.store.updateKeys({ IK, SIK, SPKs: [SPK], OPKs: OPKs });
		return { IK, SIK, SPK, OPKs: OPKs };
	}

	/**
	 * Removes secrets from SPK
	 */
	prepareSPK(SPK: SignedKeyPair): PreparedSignedKeyPair {
		return {
			id: SPK.id,
			publicKey: bufferToBase64(SPK.publicKey),
			signature: bufferToBase64(SPK.signature),
			timestamp: SPK.timestamp
		};
	}

	/**
	 * Removes secrets from OPKs
	 */
	prepareOPKs(OPKs: OPK[]): PreparedOPK[] {
		return OPKs.map((OPK) => ({ id: OPK.id, publicKey: bufferToBase64(OPK.publicKey) }));
	}

	/*
	 *  Removes the private keys from the key bundle, and decodes the public
	 *  keys into utf8 strings.
	 */
	prepareKeyBundle(keyBundle: KeyBundle): PreparedKeyBundle {
		return {
			IK: bufferToBase64(keyBundle.IK.publicKey),
			SIK: bufferToBase64(keyBundle.SIK.publicKey),
			SPK: this.prepareSPK(keyBundle.SPK),
			OPKs: this.prepareOPKs(keyBundle.OPKs)
		};
	}

	/**
	 * Performs an ECDH exchange and outputs raw bytes.
	 */
	async dh(privateKey: CryptoKey, publicKey: CryptoKey) {
		const outputKey = await window.crypto.subtle.deriveKey(
			{ name: 'ECDH', public: publicKey },
			privateKey,
			{ name: 'AES-GCM', length: 256 },
			true,
			['encrypt', 'decrypt']
		);
		return await window.crypto.subtle.exportKey('raw', outputKey);
	}

	/**
	 * Preforms an extended ECDH key exchange.
	 * this is the part where the user receive a key bundle from the server.
	 */
	async deriveFromBundle(keyBundle: ReceivedKeyBundle): Promise<DHResult> {
		// Get personal IK from store
		const IKQueryResult = await this.store.getKeys<{ IK: KeyPair }>([{ name: 'IK' }]);
		if (!IKQueryResult || !IKQueryResult.IK.privateKey) {
			throw new IndexedDBNotFound();
		}

		// Get personal SIK from store
		const SIKQueryResult = await this.store.getKeys<{ SIK: KeyPair }>([{ name: 'SIK' }]);
		if (!SIKQueryResult || !SIKQueryResult.SIK.publicKey) {
			throw new IndexedDBNotFound();
		}

		// A temporary key that provides some mitigation in case the private keys are compromised
		const EK = await this.generateKeyPair('ECDH', ['deriveKey']);

		// Encode the oddSIK
		const EncodedOddSIK = base64ToBuffer(keyBundle.SIK);

		// Encode the oddSIK
		const EncodedOddIK = base64ToBuffer(keyBundle.IK);
		// Import the odd identity public key
		const oddIK = await window.crypto.subtle.importKey(
			'spki',
			EncodedOddIK,
			{ name: 'ECDH', namedCurve: 'P-256' },
			false,
			[]
		);

		// Encode the oddSPK
		const EncodedOddSPK = base64ToBuffer(keyBundle.SPK.publicKey);
		// Encode the oddSPK signature
		const EncodedOddSPKSignature = base64ToBuffer(keyBundle.SPK.signature);
		// Signed pre-key received form server
		const oddSPK = await window.crypto.subtle.importKey(
			'spki',
			EncodedOddSPK,
			{ name: 'ECDH', namedCurve: 'P-256' },
			false,
			[]
		);
		// Verify the SPK signature to determine that the server didn't manipulate the keyBundle.
		const validSPK = await this.verify(EncodedOddSIK, EncodedOddSPKSignature, EncodedOddSPK);
		if (!validSPK) {
			throw new ExchangeError('Invalid signed pre-key signature.');
		}

		// First ecdh between personal IK and oddSPK
		const DH1 = await this.dh(IKQueryResult.IK.privateKey, oddSPK);
		// Second ecdh between personal ephemeral key and oddIK
		const DH2 = await this.dh(EK.privateKey, oddIK);
		// Third ecdh between personal ephemeral key and oddSPK
		const DH3 = await this.dh(EK.privateKey, oddSPK);

		// If a onetime pre-key is provided perform a fourth dh
		let DH4 = null;
		if (keyBundle.OPK) {
			// Import the opk
			const oddOPK = await window.crypto.subtle.importKey(
				'spki',
				base64ToBuffer(keyBundle.OPK.publicKey),
				{ name: 'ECDH', namedCurve: 'P-256' },
				false,
				[]
			);
			// And a fourth one with the OPK and EK
			DH4 = await this.dh(EK.privateKey, oddOPK);
		}

		// Generate AD "associated data" byte sequence used for verification
		const AD = this.concatenate([IKQueryResult.IK.publicKey, EncodedOddIK, this.applicationId]);

		// The base keys that will be put in the kdf
		let finalResult = [DH1, DH2, DH3];
		if (DH4) finalResult.push(DH4);
		const baseKey = await window.crypto.subtle.importKey(
			'raw',
			this.concatenate(finalResult),
			'HKDF',
			false,
			['deriveKey']
		);

		// Derive the shared key SK = KDF(DH1 || DH2 || DH3 || DH3)
		const salt = window.crypto.getRandomValues(new Uint8Array(16));
		const SK = await window.crypto.subtle.deriveKey(
			{
				name: 'HKDF',
				salt: salt,
				info: AD,
				hash: 'SHA-384'
			},
			baseKey,
			{ name: 'AES-CBC', length: 256 },
			false,
			['encrypt', 'decrypt']
		);

		return {
			IK: IKQueryResult.IK.publicKey,
			SIK: SIKQueryResult.SIK.publicKey,
			oddIK: EncodedOddIK,
			SK: SK,
			salt,
			AD,
			EK: EK.publicKey,
			SPK_ID: keyBundle.SPK.id,
			OPK_ID: keyBundle.OPK ? keyBundle.OPK.id : undefined,
			/* for testing */
			DH1: bufferToBase64(DH1),
			DH2: bufferToBase64(DH2),
			DH3: bufferToBase64(DH3),
			DH4: DH4 ? bufferToBase64(DH4) : 'not performed'
		};
	}

	/**
	 * Performs an extended ECDH key exchange.
	 * this is the part where the user receive the initial message.
	 */
	async deriveFromInitialMessage(messageKeys: InitialMessageKeys): Promise<DHResult> {
		// Get personal IK from store
		const IKQueryResult = await this.store.getKeys<{ IK: KeyPair }>([{ name: 'IK' }]);
		if (!IKQueryResult || !IKQueryResult.IK.privateKey) {
			throw new IndexedDBNotFound();
		}

		// Get personal SIK from store
		const SIKQueryResult = await this.store.getKeys<{ SIK: KeyPair }>([{ name: 'SIK' }]);
		if (!SIKQueryResult || !SIKQueryResult.SIK.publicKey) {
			throw new IndexedDBNotFound();
		}

		// Get the SPK from store
		const SPKsQueryResult = await this.store.getKeys<{ SPKs: SignedKeyPair[] }>([
			{
				name: 'SPKs',
				filters: { id: messageKeys.SPK_ID }
			}
		]);
		if (!SPKsQueryResult || !SPKsQueryResult.SPKs || SPKsQueryResult.SPKs.length === 0) {
			throw new IndexedDBNotFound();
		}
		const SPKs = SPKsQueryResult.SPKs;
		const SPK = SPKs[0];

		// Import the oddIK.
		const oddIK = await window.crypto.subtle.importKey(
			'spki',
			base64ToBuffer(messageKeys.IK),
			{ name: 'ECDH', namedCurve: 'P-256' },
			false,
			[]
		);

		// Import the other party's EK
		const oddEK = await window.crypto.subtle.importKey(
			'spki',
			base64ToBuffer(messageKeys.EK),
			{ name: 'ECDH', namedCurve: 'P-256' },
			false,
			[]
		);

		// First ecdh between the other oddIK and personal SPK
		const DH1 = await this.dh(SPK.privateKey, oddIK);
		// Second ecdh between EK and the personal IK
		const DH2 = await this.dh(IKQueryResult.IK.privateKey, oddEK);
		// Third ecdh between EK and personal SPK
		const DH3 = await this.dh(SPK.privateKey, oddEK);

		// If a onetime pre-key is used perform a fourth dh
		let DH4 = null;
		if (messageKeys.OPK_ID) {
			// Find the opk
			const OPKsQueryResult = await this.store.getKeys<{ OPKs: OPK[] }>([{ name: 'OPKs' }]);
			if (!OPKsQueryResult || !OPKsQueryResult.OPKs) {
				throw new IndexedDBNotFound();
			}
			const OPKIndex = OPKsQueryResult.OPKs.findIndex((value) => value.id === messageKeys.OPK_ID);
			const OPK = OPKIndex !== -1 ? OPKsQueryResult.OPKs[OPKIndex] : undefined;
			if (OPK) {
				// And a fourth one with the OPK and EK
				DH4 = await this.dh(OPK.privateKey, oddEK);
				// Delete the used OPK and update the store
				OPKsQueryResult.OPKs.splice(OPKIndex, 1);
				await this.store.updateKeys({ OPKs: OPKsQueryResult.OPKs });
			}
		}

		// The base keys that will be put in the kdf
		let finalResult = [DH1, DH2, DH3];
		if (DH4) finalResult.push(DH4);
		const baseKey = await window.crypto.subtle.importKey(
			'raw',
			this.concatenate(finalResult),
			'HKDF',
			false,
			['deriveKey']
		);

		// Generate AD "associated data" byte sequence used for verification
		const AD = this.concatenate([
			base64ToBuffer(messageKeys.IK),
			IKQueryResult.IK.publicKey,
			this.applicationId
		]);

		// Derive the shared key SK = KDF(DH1 || DH2 || DH3 || DH3)
		const SK = await window.crypto.subtle.deriveKey(
			{
				name: 'HKDF',
				salt: base64ToBuffer(messageKeys.salt),
				info: AD,
				hash: 'SHA-384'
			},
			baseKey,
			{ name: 'AES-CBC', length: 256 },
			false,
			['encrypt', 'decrypt']
		);

		return {
			IK: IKQueryResult.IK.publicKey,
			SIK: SIKQueryResult.SIK.publicKey,
			oddIK: base64ToBuffer(messageKeys.IK),
			SK,
			salt: base64ToBuffer(messageKeys.salt),
			AD,
			EK: base64ToBuffer(messageKeys.EK),
			SPK_ID: messageKeys.SPK_ID,
			OPK_ID: messageKeys.OPK_ID,

			/* for testing */
			DH1: bufferToBase64(DH1),
			DH2: bufferToBase64(DH2),
			DH3: bufferToBase64(DH3),
			DH4: DH4 ? bufferToBase64(DH4) : 'not performed'
		};
	}

	/**
	 * Encrypts a message using AES in cdc mode.
	 */
	async encrypt(SK: CryptoKey, IV: ArrayBuffer, plaintext: string) {
		const encodedPlaintext = stringToBuffer(plaintext);
		const encodedCipherText = await window.crypto.subtle.encrypt(
			{ name: 'AES-CBC', iv: IV },
			SK,
			encodedPlaintext
		);
		return bufferToBase64(encodedCipherText);
	}

	/**
	 * Decrypts a message using AES in cdc mode.
	 */
	async decrypt(SK: CryptoKey, IV: ArrayBuffer, cipherText: string) {
		const encodedCipherText = base64ToBuffer(cipherText);
		const encodedPlaintext = await window.crypto.subtle.decrypt(
			{ name: 'AES-CBC', iv: IV },
			SK,
			encodedCipherText
		);
		return bufferToString(encodedPlaintext);
	}
}

// **** Default export  **** //

export default Protocol;
