/**
 * How the protocol stores keys.
 */
import type { ExportedKeyPair, ExportedOPK, ExportedSignedKeyPair, KeyStoreKeys, KeyStoreQuery, SharedSecret } from './types';

import { IndexedDBConnectionError, IndexedDBInvalidInput, IndexedDBNoPassword, IndexedDBNotFound, IndexedDBTransactionError } from "./errors";


/** 
 * A secure data store that encrypts all the keys using 
 * the user's JWT access token.
 * and re-encrypts the keys when the token changes.
*/
class KeyStore {
  // **** Properties **** //

  public DB?: IDBDatabase;
  public username: string;
  private SEK?: CryptoKey; // AES encryption key.
  private SIV?: ArrayBuffer; // iv used by AES-CBC mode.


  // **** Constructor **** //

  constructor(storeName: string, storePassword: ArrayBuffer, username: string) {
    this.username = username;
    const request = window.indexedDB.open(storeName, 1);
    // Set the database object. 
    request.onsuccess = (event: Event) => {
      this.DB = (event.target as IDBOpenDBRequest).result;
    };
    // Create the object stores. 
    request.onupgradeneeded = () => {
      this.createObjectStore(storePassword);
    };
    // Handle connection errors.
    request.onerror = () => {
      throw new IndexedDBConnectionError();
    };
  }


  // **** Methods **** //

  /**
   * Creates the store indexes of the store.
   */
  createObjectStore(storePassword: ArrayBuffer) {
    // If database not connected
    if (!this.DB) throw new IndexedDBConnectionError();

    // Define the object store
    const objectStore = this.DB.createObjectStore('keys', { keyPath: "username" });
    objectStore.createIndex("keys", "keys");
    objectStore.createIndex("SIV", "SIV");

    // Create the initial object to store the users keys.
    (this.DB as IDBDatabase)
      .transaction(['keys'], 'readwrite')
      .objectStore('keys')
      .add({ username: this.username })
      .onerror = () => { throw new IndexedDBTransactionError("unable to create initial object"); }

    // create the password
    this.setSEK(storePassword);
  }

  /**
   * Create password for the new keystore. 
   */
  async createSEK(password: ArrayBuffer) {
    const encodedPassword = password;
    const passwordHash = await window.crypto.subtle.digest('SHA-256', encodedPassword);
    const SIV = window.crypto.getRandomValues(new Uint8Array(16));
    const SEK = await window.crypto.subtle.importKey('raw', passwordHash, 'AES-CBC', true, ['encrypt', 'decrypt']);
    return { SEK, SIV };
  }

  /**
   * Updates the value of SIV used by AES-CBC in the object store.
   */
  private async updateSIV(SIV: ArrayBuffer) {
    return new Promise<ArrayBuffer | IndexedDBConnectionError | IndexedDBNotFound>((resolve, reject) => {
      // if database not connected
      if (!this.DB) reject(new IndexedDBConnectionError());
      // save SIV in object store.
      const objectStore = (this.DB as IDBDatabase)
        .transaction(['keys'], 'readwrite')
        .objectStore('keys');
      const getRequest = objectStore.get(this.username);
      // add SIV
      getRequest.onsuccess = () => {
        let data = getRequest.result;
        data['SIV'] = SIV;
        const requestUpdate = objectStore.put(data);
        // resolve with updated data
        requestUpdate.onsuccess = () => {
          resolve(SIV);
        }
        requestUpdate.onerror = () => {
          reject(new IndexedDBInvalidInput('Unable to update values'));
        }
      };
      // not found error
      getRequest.onerror = () => {
        reject(new IndexedDBNotFound());
      };
    });
  }

  /**
   * Create & set a password for the new keystore,
   * after running operation this the old password will be deleted.
   */
  async setSEK(password: ArrayBuffer) {
    // create SEK, SIV
    const { SEK, SIV } = await this.createSEK(password);
    this.SEK = SEK;
    this.SIV = SIV;
    this.updateSIV(SIV);
  }

  /**
   * When the user changes his password create a new EK and re-encrypt
   * all the keys.
   */
  async updateSEK(password: ArrayBuffer) {
    // if no password was provided
    if (!this.SEK || !this.SIV) throw new IndexedDBNoPassword("No password was provided");
    // if database not connected
    if (!this.DB) throw new IndexedDBConnectionError();
    // create a new SEK
    const { SEK, SIV } = await this.createSEK(password);
    // get all of the keys
    const decryptedKeys = await this.getKeys('*') as KeyStoreKeys;
    // set the new encryption key
    this.SEK = SEK;
    this.SIV = SIV;
    // update the all the keys using the new encryption key
    this.updateKeys(decryptedKeys);
    // update SIV
    this.updateSIV(SIV);
  }

  /**
   * Encrypt a key with AES-CBC.
   * @param key {any} arraybuffer
   * @returns encrypted key
   */
  async encrypt(SEK: CryptoKey, SIV: ArrayBuffer, key: ArrayBuffer) {
    try {
      return await window.crypto.subtle.encrypt({ name: 'AES_CBC', iv: SIV }, SEK, key);
    } catch (error) {
      console.error('Failed to encrypt keys provided to keystore.');
      throw error;
    }
  }

  /**
     * Decrypts a key encrypted with AES-CBC.
     * @param encryptedKey {any} the key obtained form the keystore
     * @returns decrypted key
     */
  async decrypt(SEK: CryptoKey, SIV: ArrayBuffer, key: ArrayBuffer) {
    try {
      return await window.crypto.subtle.decrypt({ name: 'AES_CBC', iv: SIV }, SEK, key);
    }
    catch (error) {
      console.error('Failed to decrypt keys from obtained from keystore');
      throw error;
    }
  }

  /**
   * Encrypt keys with AES-CBC.
   */
  async processKeys(SEK: CryptoKey, SIV: ArrayBuffer, keys: KeyStoreKeys, operation: (SEK: CryptoKey, SIV: ArrayBuffer, key: ArrayBuffer) => Promise<ArrayBuffer>): Promise<KeyStoreKeys> {
    // encrypt the keys in input
    let encryptedKeys: { [key: string]: any } = {};
    for (const [key, keyValue] of Object.entries(keys)) {
      if (keyValue) {
        if (key === 'SPKs') {
          // encrypt SPKs
          const value = keys[key];
          if (value)
            encryptedKeys[key] = value.map(async (SPK: ExportedSignedKeyPair) => ({
              id: SPK.id,
              publicKey: await operation(SEK, SIV, <ArrayBuffer>SPK.publicKey),
              privateKey: await operation(SEK, SIV, <ArrayBuffer>SPK.privateKey),
              timestamp: SPK.timestamp,
            }))
        }
        else if (key === 'OPKs') {
          // encrypt OPKs
          const value = keys[key];
          if (value)
            encryptedKeys[key] = value.map(async (OPK: ExportedOPK) => ({
              'id': OPK.id,
              'publicKey': await operation(SEK, SIV, <ArrayBuffer>OPK.publicKey),
              'privateKey': await operation(SEK, SIV, <ArrayBuffer>OPK.privateKey)
            }));
        }
        else if (key === 'SEKs') {
          // encrypt SEKs
          encryptedKeys[key] = (keyValue as SharedSecret[]).map(async (SK: SharedSecret) => ({
            'username': SK.username,
            'IK': await operation(SEK, SIV, SK.IK),
            'SK': await operation(SEK, SIV, SK.SK),
            'AD': SK.AD,
            'salt': SK.salt,
          }));
        }
        else {
          // encrypt the identity key
          encryptedKeys[key] = {
            publicKey: await operation(SEK, SIV, (keyValue as ExportedKeyPair).publicKey as ArrayBuffer),
            privateKey: await operation(SEK, SIV, (keyValue as ExportedKeyPair).privateKey as ArrayBuffer),
          }
        }
      }
    }
    return encryptedKeys;
  }

  /**
   * Filters the result of transaction(...).get('keys') based on query.
   */
  searchKeys(query: KeyStoreQuery[], resultKeys: KeyStoreKeys) {
    let filteredResultKeys: KeyStoreKeys = {};
    query.forEach((queryKey) => {
      if (resultKeys[queryKey.name]) {
        const arrayOfKeys = resultKeys[queryKey.name];
        if (Array.isArray(arrayOfKeys) && ('filters' in queryKey)) {
          let filterResult: any[] = [];
          arrayOfKeys.forEach((value) => {
            if ('id' in queryKey && (value as ExportedOPK | ExportedSignedKeyPair).id === queryKey.id) {
              filterResult.push(value);
            }
            else if (('username' in queryKey && (value as SharedSecret).username === queryKey.username)) {
              filterResult.push(value);
            }
            else if ('timeFilter' in queryKey) {
              const timestampArray = (arrayOfKeys as ExportedSignedKeyPair[]).map((SPK) => SPK.timestamp);
              const smallestTimestamp = Math.max(...timestampArray);
              const timeLimit = Date.now() - 1000 * 60 * 60 * 92;
              if (queryKey.timeFilter === 'newest-key') {
                if ((value as ExportedSignedKeyPair).timestamp === smallestTimestamp) {
                  filterResult.push(value);
                }
              } else if (queryKey.timeFilter === 'more-than-92-hours') {
                if ((value as ExportedSignedKeyPair).timestamp >= timeLimit) {
                  filterResult.push(value);
                }
              } else if (queryKey.timeFilter === 'less-than-92-hours') {
                if ((value as ExportedSignedKeyPair).timestamp < timeLimit) {
                  filterResult.push(value);
                }
              }
            }
          });
          filteredResultKeys[queryKey.name] = [...filterResult]
        }
        else {
          filteredResultKeys[queryKey.name] = resultKeys[queryKey.name];
        }
      }
    });
    return filteredResultKeys;
  }

  /**
   * Decrypt the keys with AES after finding it
   * passing * will return all the keys.
   */
  getKeys<T>(query: '*' | KeyStoreQuery[]) {
    return new Promise<T>((resolve, reject) => {
      // if no password was provided
      if (!this.SEK || !this.SIV) reject(new IndexedDBNoPassword("No password was provided"));
      // if database not connected
      if (!this.DB) reject(new IndexedDBConnectionError());
      // fetch keys from the database
      const request = (this.DB as IDBDatabase)
        .transaction(['keys'], 'readonly')
        .objectStore('keys')
        .get(this.username);
      // decrypt the keys and return them.
      request.onsuccess = async () => {
        if (request.result.keys) {
          // check if the request is for all the keys or not;
          const filteredResult: KeyStoreKeys = query === '*' ? request.result.keys : this.searchKeys(query, request.result.key);
          // decrypt the keys
          resolve(await <T>this.processKeys((this.SEK as CryptoKey), (this.SIV as ArrayBuffer), filteredResult, this.decrypt));
        } else {
          reject(new IndexedDBNotFound());
        }
      };
      // throw IndexedDBTransactionError.
      request.onerror = () => {
        reject(new IndexedDBTransactionError("Unable to get keys from keystore"));
      };
    });
  };

  /**
   * Validates the input to the add and update methods.
   * check if the input is of type KeyStoreInput
   */
  isValid(input: KeyStoreKeys) {
    if (!(input.IK || input.SPK || input.OPKs || input.SKs)) {
      return false;
    }
    return true;
  }

  /**
   * Decrypt a key with AES then update the key then encrypt it again.
   */
  updateKeys(input: KeyStoreKeys) {
    return new Promise((resolve, reject) => {
      // if no password was provided
      if (!this.SEK || !this.SIV) reject(new IndexedDBNoPassword("No password was provided"));
      // if database not connected
      if (!this.DB) reject(new IndexedDBConnectionError());
      // validate input
      if (!this.isValid(input)) {
        reject(new IndexedDBInvalidInput("Input is missing some properties"));
      }
      // encrypt the keys in input
      const encryptedKeys = this.processKeys((this.SEK as CryptoKey), (this.SIV as ArrayBuffer), input, this.encrypt);
      const objectStore = (this.DB as IDBDatabase)
        .transaction(['keys'], 'readwrite')
        .objectStore('keys')
      // get the values you want to update.
      const request = objectStore.get(this.username);
      // update the keys
      request.onsuccess = () => {
        let data = request.result;
        data['keys'] = data.keys
          ? { ...data.keys, ...encryptedKeys }
          : encryptedKeys;
        const requestUpdate = objectStore.put(data);
        // resolve with updated data
        requestUpdate.onsuccess = () => {
          resolve(encryptedKeys);
        }
        requestUpdate.onerror = () => {
          reject(new IndexedDBInvalidInput('Unable to update values'));
        }
      };
      request.onerror = () => {
        reject(new IndexedDBNotFound());
      };
    });
  };
}


// **** Default export  **** //

export default KeyStore;
