/**
 * Protocol functions used to sign, verify, encrypt,
 * decrypt messages and exchange keys.
 */
import type { ExportedKeyBundle, ExportedKeyPair, InitialMessageKeys, ExportedSignedKeyPair, ExportedOPK, PreparedKeyBundle } from './types';

import { ExchangeError } from './errors';
import KeyStore from './store';


/**
 * Contains the methods that are used by the protocol.
 */
class Protocol {
  // **** Properties **** //

  // ASCII string representing the application.
  public APPLICATION_ID = "WE2EE";
  // Key encoding format used. 
  public KEY_FORMAT: "spki" = "spki";
  // encodes strings to utf8
  public utf8encoder = new TextEncoder();
  // decodes strings from utf8
  public utf8decoder = new TextDecoder();
  // key store object used to manipulate indexedDB key store
  public store: KeyStore;


  // **** Constructor **** //

  constructor(storeName: string, storePassword: string, username: string) {
    this.store = new KeyStore(storeName, this.encode(storePassword), username);
  }


  // **** Methods **** //

  /**
   * concatenates an array of ArrayBuffers.
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
   * encodes a string into utf8
   * @param data 
   * @returns {Unit8Array}
   */
  encode(data: string) {
    return this.utf8encoder.encode(data)
  }

  /**
   *  decodes a utf8 into a string
   * @param data 
   * @returns {String}
   */
  decode(data: ArrayBuffer | Uint8Array) {
    return this.utf8decoder.decode(data);
  }

  /**
   *  Sign the message using EcDSA.
   */
  async sign(PK: ArrayBuffer, data: ArrayBuffer) {
    // convert the spki key into CryptoKey object that can be used by the Web Crypto API.
    const importedPK = await window.crypto.subtle.importKey(this.KEY_FORMAT, PK, 'ECDSA', false, ['sign']);
    // sign the message with private key
    return await window.crypto.subtle.sign({ name: 'ECDSA', hash: { name: 'SHA-384' } }, importedPK, data);
  }

  /**
   * Verify the message using EcDSA.
   */
  async verify(publicKey: CryptoKey, signature: ArrayBuffer, data: ArrayBuffer) {
    return await window.crypto.subtle.verify('ECDSA', publicKey, signature, data);
  }

  /**
   * Generates an iv to be used by aes
   */
  generateIV() {
    return window.crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Generates a P-384 key pairs used by this protocol
   * for ECDH and ECDSA key exchange.
   * 
   * @param {string} passphrase the user's password.
   */
  async generateKeyPair() {
    // generate elliptic curve keys.
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384'
      },
      true,
      ["deriveKey"],
    );
    // return the encoded keys in spki format.
    return {
      publicKey: await window.crypto.subtle.exportKey(this.KEY_FORMAT, keyPair.publicKey),
      privateKey: await window.crypto.subtle.exportKey(this.KEY_FORMAT, keyPair.privateKey)
    };
  }

  /**
   * Generates a long-term identity key.
   */
  async generateIK() {
    return await this.generateKeyPair();
  }

  /**
   * Generates a temporary ECDH key signed with
   * the private identity key using ECDSA.
   */
  async generateSPK(ExportedPK: ArrayBuffer) {
    const keyPair = await this.generateKeyPair();
    // sign the public key using the IK
    const signature = await this.sign(ExportedPK, keyPair.publicKey);
    // return the encoded keys and the signature
    return {
      id: window.crypto.randomUUID(),
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      signature: signature,
      timestamp: Date.now(),
    }
  }

  /**
   * Create a new spk and updates the keystore.
   */
  async regenerateSPK(ExportedPK: ArrayBuffer) {
    const newSPK = await this.generateSPK(ExportedPK);
    const oldSPKs = await this.store.getKeys<ExportedSignedKeyPair[]>([{ name: 'SPKs' }]);
    this.store.updateKeys({ SPKs: [...oldSPKs, newSPK] });
    const decodedSPK = (this.processSPK(newSPK, this.decode) as ExportedSignedKeyPair);
    const preparedSPK = this.prepareSPK(decodedSPK);
    return preparedSPK;
  }

  /**
   * Generates an a list of single use one time pre-keys. 
   */
  async generateOPKs() {
    return new Array(5).fill({
      id: window.crypto.randomUUID(),
      key: await this.generateKeyPair(),
    });
  }

  /**
   * Creates and saves a new array of OPKs ready to be uploaded to the server.
   */
  async regenerateOPKs() {
    const OPKs = await this.generateOPKs();
    this.store.updateKeys({ OPKs });
    const decodedOPKs = (this.processOPKs(OPKs, this.decode) as ExportedOPK[]);
    const preparedOPK = this.prepareOPKs(decodedOPKs);
    return preparedOPK;
  }

  /**
   * Runs when the user logs-in for the first time, generates a key bundle
   * containing the following keys:
   * 1. IK:	A long-term Identity key.
   * 2. SPK:	A temporary signed pre-key.
   * 3. OPKs: A list of single use one time pre-keys. 
   */
  async generateKeyBundle() {
    const IK = await this.generateIK();
    const SPK = await this.generateSPK(IK.privateKey);
    const OPKs = await this.generateOPKs();
    const keyBundle = { IK, SPK, OPKs };
    // update key store
    this.store.updateKeys(keyBundle);
    return keyBundle;
  }

  /**
   * Encodes or decodes an IK
   */
  processIK(IK: ExportedKeyPair, operation: (data: any) => ArrayBuffer | string) {
    return ({
      publicKey: operation(IK.publicKey), privateKey: operation(IK.privateKey),
    });
  }

  /**
   * Encodes or decodes a SPK
   */
  processSPK(SPK: ExportedSignedKeyPair, operation: (data: any) => ArrayBuffer | string) {
    let key: ExportedSignedKeyPair = {
      id: SPK.id, publicKey: operation(SPK.publicKey), signature: operation(SPK.signature), timestamp: SPK.timestamp
    }
    if ('privateKey' in SPK) { key['privateKey'] = operation(SPK.privateKey); }
    return key;
  }

  /**
   * Encodes or decodes an OPK array
   */
  processOPKs(OPKs: ExportedOPK[], operation: (data: any) => ArrayBuffer | string) {
    return OPKs.map((OPK) => ({
      id: OPK.id, publicKey: operation(OPK.publicKey), privateKey: operation(OPK.privateKey),
    }));
  }

  /**
   * Encodes or decodes a KeyBundle into utf8 so it can be used by the protocol or transmitted into json.
   * @param keyBundle 
   * @returns {DecodedKeyBundle}
   */
  processKeyBundle<BundleType>(keyBundle: ExportedKeyBundle, operation: (data: any) => ArrayBuffer | string) {
    return <BundleType>({
      IK: this.processIK(keyBundle.IK, operation),
      SPK: this.processSPK(keyBundle.SPK, operation),
      OPKs: this.processOPKs(keyBundle.OPKs, operation),
    })
  }

  /**
   * Removes secrets from SPK
   */
  prepareSPK(SPK: ExportedSignedKeyPair) {
    return { id: SPK.id, publicKey: SPK.publicKey, signature: SPK.signature, timestamp: SPK.timestamp }
  }

  /**
   * Removes secrets from OPKs
   */
  prepareOPKs(OPKs: ExportedOPK[]) {
    return OPKs.map((OPK) => ({ id: OPK.id, publicKey: OPK.publicKey }));
  }

  /*/**
   *  Removes the private keys from the key bundle, and decodes the public
   *  keys into utf8 strings.
   */
  prepareKeyBundle(keyBundle: ExportedKeyBundle) {
    const decodedKeyBundle = this.processKeyBundle<ExportedKeyBundle>(keyBundle, this.decode);
    return {
      IK: decodedKeyBundle.IK.publicKey,
      SPK: this.prepareSPK(decodedKeyBundle.SPK),
      OPKs: this.prepareOPKs(decodedKeyBundle.OPKs)
    }
  }

  /**
   * performs an ECDH exchange and outputs raw bytes.
   */
  async dh(privateKey: CryptoKey, publicKey: CryptoKey) {
    const outputKey = await window.crypto.subtle.deriveKey({ name: 'ECDH', public: publicKey }, privateKey, { name: "AES-GCM", length: 256 }, true, ['encrypt', 'decrypt']);
    return await window.crypto.subtle.exportKey("raw", outputKey);
  }

  /**
   * Preforms an extended ECDH key exchange.
   * this is the part where the user receive a key bundle from the server.
   */
  async deriveFromBundle(keyBundle: PreparedKeyBundle) {
    // get personal IK from store
    const { IK } = await this.store.getKeys<{ IK: ExportedKeyPair }>([{ name: 'IK' }]);
    // import the personal public identity key 
    const importedIK = await window.crypto.subtle.importKey(this.KEY_FORMAT, <ArrayBuffer>IK.privateKey, 'ECDH', false, ['deriveKey']);
    // A temporary key that provides some mitigation in case the private keys are compromised
    const EK = await this.generateKeyPair();
    const privateEK = await window.crypto.subtle.importKey('raw', EK.privateKey, 'ECDH', false, ['deriveKey']);
    // import the odd identity public key
    const oddIK = await window.crypto.subtle.importKey(this.KEY_FORMAT, this.encode(keyBundle.IK.publicKey), 'ECDH', false, ['deriveKey']);
    // signed pre-key received form server
    const oddSPK = await window.crypto.subtle.importKey(this.KEY_FORMAT, this.encode(keyBundle.SPK.publicKey), 'ECDH', false, ['deriveKey']);
    // verify the SPK signature to determine that the server didn't manipulate the keyBundle.
    const validSPK = await this.verify(oddIK, this.encode(keyBundle.SPK.signature), this.encode(keyBundle.SPK.publicKey));
    if (validSPK) {
      // first ecdh between personal IK and keyBundle.SPK
      const DH1 = await this.dh(importedIK, oddSPK);
      // second ecdh between personal ephemeral key and keyBundle.IK
      const DH2 = await this.dh(privateEK, oddIK);
      // third ecdh between personal ephemeral key and keyBundle.SPK
      const DH3 = await this.dh(privateEK, oddSPK);

      // if a onetime pre-key is provided perform a fourth dh
      let DH4 = null;
      if (keyBundle.OPK) {
        // import the opk
        const OPK = await window.crypto.subtle.importKey(this.KEY_FORMAT, this.encode(keyBundle.OPK.publicKey), 'ECDH', false, ['deriveKey']);
        // and a fourth one with the OPK and EK
        DH4 = await this.dh(privateEK, oddSPK);
      }

      // generate AD "associated data" byte sequence used for verification
      const AD = this.concatenate([(IK.publicKey as ArrayBuffer), this.encode(keyBundle.IK.publicKey), this.encode(this.APPLICATION_ID).buffer]);

      // the base keys that will be put in the kdf 
      let finalResult = [DH1, DH2, DH3,];
      if (DH4) finalResult.push(DH4);
      const baseKey = await window.crypto.subtle.importKey('raw', this.concatenate(finalResult), 'HKDF', false, ['deriveKey']);

      // derive the shared key SK = KDF(DH1 || DH2 || DH3 || DH3) 
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const SK = await window.crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          salt: salt,
          info: AD,
          hash: "SHA-384",
        },
        baseKey,
        { name: "AES-CBC", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
      const exportedSK = await window.crypto.subtle.exportKey('spki', SK);

      return {
        IK: this.encode(keyBundle.IK.publicKey),
        SK: exportedSK,
        salt,
        AD,
        EK: EK.publicKey,
      };
    } else {
      throw new ExchangeError("Invalid signed pre-key signature.");
    }
  }

  /**
   * Performs an extended ECDH key exchange.
   * this is the part where the user receive the initial message.
   */
  async deriveFromInitialMessage(messageKeys: InitialMessageKeys) {
    // get personal IK from store
    const { IK } = await this.store.getKeys<{ IK: ExportedKeyPair }>([{ name: 'IK' }]);
    // import the personal public identity key
    const importedIK = await window.crypto.subtle.importKey(this.KEY_FORMAT, <ArrayBuffer>IK.privateKey, 'ECDH', false, ['deriveKey']);

    // get the SPK from store
    const { SPKs } = await this.store.getKeys<{ SPKs: ExportedSignedKeyPair[] }>([{ name: 'SPKs', filters: { id: messageKeys.SPK_ID } }]);
    const SPK = SPKs[0];

    // import the SPK.
    const importedSPK = await window.crypto.subtle.importKey(this.KEY_FORMAT, <ArrayBuffer>SPK.privateKey, 'ECDH', false, ['deriveKey']);

    // import the messageKeys.IK.
    const importedOddIK = await window.crypto.subtle.importKey(this.KEY_FORMAT, this.encode(messageKeys.IK), 'ECDH', false, ['deriveKey']);

    // import the messageKeys.EK
    const importedEK = await window.crypto.subtle.importKey(this.KEY_FORMAT, this.encode(messageKeys.EK), 'ECDH', false, ['deriveKey']);

    // first ecdh between the other messageKeys.IK and personal SPK
    const DH1 = await this.dh(importedSPK, importedOddIK);
    // second ecdh between messageKeys.EK and the personal IK
    const DH2 = await this.dh(importedIK, importedEK);
    // third ecdh between messageKeys.EK and personal SPK
    const DH3 = await this.dh(importedSPK, importedEK);

    // if a onetime pre-key is used perform a fourth dh
    let DH4 = null;
    if (messageKeys.OPK_ID) {
      // find the opk
      const { OPKs } = await this.store.getKeys<{ OPKs: ExportedOPK[] }>([{ name: 'OPKs' }]);
      const OPKIndex = OPKs.findIndex((value) => value.id === messageKeys.OPK_ID);
      const OPK = OPKIndex !== -1 ? OPKs[OPKIndex] : undefined
      if (OPK) {
        // import the opk
        const importedOPK = await window.crypto.subtle.importKey(this.KEY_FORMAT, <ArrayBuffer>OPK.privateKey, 'ECDH', false, ['deriveKey']);
        // and a fourth one with the OPK and EK
        DH4 = await this.dh(importedOPK, importedEK);
        // delete the used OPK
        await this.store.updateKeys({ OPKs: OPKs.splice(OPKIndex, 1) });
      }
    }

    // the base keys that will be put in the kdf 
    let finalResult = [DH1, DH2, DH3,];
    if (DH4) finalResult.push(DH4);
    const baseKey = await window.crypto.subtle.importKey('raw', this.concatenate(finalResult), 'HKDF', false, ['deriveKey']);

    // generate AD "associated data" byte sequence used for verification
    const AD = this.concatenate([this.encode(messageKeys.IK), <ArrayBuffer>IK.publicKey, this.encode(this.APPLICATION_ID).buffer]);

    // derive the shared key SK = KDF(DH1 || DH2 || DH3 || DH3) 
    const SK = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: this.encode(messageKeys.salt),
        info: AD,
        hash: "SHA-384",
      },
      baseKey,
      { name: "AES-CBC", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
    const exportedSK = await window.crypto.subtle.exportKey('spki', SK);

    return {
      IK: this.encode(messageKeys.IK),
      salt: this.encode(messageKeys.salt),
      SK: exportedSK,
      AD
    };
  }

  /**
   * Encrypts a message using AES in cdc mode.
   */
  async encrypt(SK: ArrayBuffer, IV: ArrayBuffer, plaintext: string) {
    const importedSK = await window.crypto.subtle.importKey('spki', SK, 'AES-CBC', false, ['encrypt']);
    const encodedPlaintext = this.encode(plaintext);
    const encodedCiphertext = await window.crypto.subtle.encrypt({ name: 'AES_CBC', iv: IV }, importedSK, encodedPlaintext);
    return this.decode(encodedCiphertext);
  }

  /**
   * Decrypts a message using AES in cdc mode.
   */
  async decrypt(SK: ArrayBuffer, IV: ArrayBuffer, ciphertext: string) {
    const importedKey = await window.crypto.subtle.importKey('spki', SK, 'AES-CBC', false, ['decrypt']);
    const encodedCiphertext = this.encode(ciphertext);
    const encodedPlaintext = await window.crypto.subtle.encrypt({ name: 'AES_CBC', iv: IV }, importedKey, encodedCiphertext);
    return this.decode(encodedPlaintext);
  }
}


// **** Default export  **** //

export default Protocol;
