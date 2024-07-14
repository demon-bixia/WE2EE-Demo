/**
 * Keystore used to store protocol keys in indexedDB.
 */
import type { OPK, SignedKeyPair, KeyStoreKeys, KeyStoreQuery, SharedSecret } from './types';

import { IndexedDBConnectionError, IndexedDBInvalidInput, IndexedDBNotFound, IndexedDBTransactionError } from "./errors";
import { bufferToBase64 } from './encoding';


/** 
 * A data store that stores all the keys used by the protocol.
 */
class KeyStore {
  public DB?: IDBDatabase;
  public username: string;
  public storeName: string;

  constructor(storeName: string, username: string) {
    this.username = username;
    this.storeName = storeName;
  }

  /**
   * Connect to the indexedDB store.
   */
  async connect() {
    return new Promise<boolean>((resolve, reject) => {
      const request = window.indexedDB.open(this.storeName);
      // Create the object stores. 
      request.onupgradeneeded = async (event) => {
        await this.createObjectStore(event);
      };
      // Set the database object. 
      request.onsuccess = async (event: Event) => {
        this.DB = (event.target as IDBOpenDBRequest).result;
        await this.addInitialIndex();
        resolve(true);
      };
      // Handle connection errors.
      request.onerror = () => {
        reject(new IndexedDBConnectionError());
      };
    });
  }

  /**
   * Creates the store indexes of the store.
   */
  async createObjectStore(event: IDBVersionChangeEvent) {
    return new Promise<boolean>((resolve, reject) => {
      const DB = (event.target as IDBOpenDBRequest).result;
      // If database not connected
      if (!DB) { return reject(new IndexedDBConnectionError()); }
      // Define the object store
      const objectStore = DB.createObjectStore('keys', { keyPath: "username" });
      objectStore.createIndex("keys", "keys");
      resolve(true)
    });
  }

  /**
   * Adds the initial user data.
   */
  async addInitialIndex() {
    return new Promise<IDBValidKey>((resolve, reject) => {
      // If database not connected
      if (!this.DB) { return reject(new IndexedDBConnectionError()); }

      // Check if there are keys
      const getRequest = this.DB
        .transaction(['keys'], 'readwrite')
        .objectStore('keys')
        .get(this.username);

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          const addRequest = (this.DB as IDBDatabase)
            .transaction(['keys'], 'readwrite')
            .objectStore('keys')
            .add({ username: this.username });
          // Validate request
          addRequest.onsuccess = () => { resolve(addRequest.result) };
          addRequest.onerror = () => { reject(new IndexedDBTransactionError("unable to create initial object")); };
        }
        resolve(getRequest.result);
      };
    });
  }

  /**
   * Gets keys from the keystore
   * passing * will return all the keys.
   */
  getKeys<Type>(query: '*' | KeyStoreQuery[]) {
    return new Promise<Type | undefined>((resolve, reject) => {
      // If database not connected
      if (!this.DB) reject(new IndexedDBConnectionError());
      // Fetch keys from the database
      const request = (this.DB as IDBDatabase)
        .transaction(['keys'], 'readonly')
        .objectStore('keys')
        .get(this.username);
      // Filter the result and return it.
      request.onsuccess = async () => {
        if (request.result.keys) {
          // Check if the request is for all the keys or not;
          const filteredResult: KeyStoreKeys = query === '*'
            ? request.result.keys
            : this.searchKeys(query, request.result.keys);
          // Resolve with the keys.
          resolve(<Type>filteredResult);
        } else {
          resolve(undefined);
        }
      };
      // Throw IndexedDBTransactionError.
      request.onerror = () => {
        reject(new IndexedDBTransactionError("Unable to get keys from keystore"));
      };
    });
  }

  /**
   * Searches the keys returned from 
   * keystore get method using the queries object
   */
  searchKeys(queries: KeyStoreQuery[], keys: KeyStoreKeys) {
    const searchResults: KeyStoreKeys = {}; // Will hold the result
    queries.forEach((query) => {
      // For each query we will loop the array of keys
      Object.entries(keys).forEach(([keyName, keyValue]) => {
        if (query.name === keyName) {
          if (query.filters && Array.isArray(keyValue)) {
            // Loop all the filters and apply them
            let filterResults: SignedKeyPair[] | OPK[] | SharedSecret[] = keyValue;
            Object.entries(query.filters).forEach(([filterName, filterValue]) => {
              filterResults = this.applyFilter(filterResults, filterName, filterValue);
            });
            searchResults[keyName] = filterResults;
          }
          else {
            // Just add the key
            searchResults[keyName] = keyValue;
          }
        }
      });
    });
    return searchResults;
  }

  /**
   * Takes an array of keys, a filterName and a filterValue 
   * and returns the keys that match the filer
   */
  applyFilter(
    keyArray: any[],
    filterName: string,
    filterValue: string
  ) {
    if (filterName === 'timeFilter' && this.hasTimestamps(keyArray)) {
      // If it's an array them apply the time filters
      const timestamp_92_hours_ago = Date.now() - 1000 * 60 * 60 * 92;
      if (filterValue === 'newest-key') {
        const timestampArray = keyArray.map((key) => key.timestamp);
        const newestTimestamp = Math.max(...timestampArray);
        return keyArray.filter((key) => key.timestamp === newestTimestamp);
      }
      else if (filterValue === 'more-than-92-hours') {
        return keyArray.filter((key) => key.timestamp <= timestamp_92_hours_ago);
      }
      else if (filterValue === 'less-than-92-hours') {
        return keyArray.filter((key) => key.timestamp > timestamp_92_hours_ago);
      } else {
        return [];
      }
    }
    else {
      return keyArray.filter(
        (key) => {
          if (filterName in key && (key[filterName] instanceof ArrayBuffer || key[filterName] instanceof Uint8Array)) {
            return bufferToBase64(key[filterName]) === filterValue;
          }
          else {
            return filterName in key && key[filterName] === filterValue;
          }
        }
      );
    }
  }

  /**
   * Checks if all the keys inside an array have a timestamp property
   */
  hasTimestamps(keyArray: SignedKeyPair[] | OPK[] | SharedSecret[]) {
    return keyArray.every((key) => 'timestamp' in key);
  }

  /**
   * Validates the input to the add and update methods.
   * check if the input is of type KeyStoreInput
   */
  isValid(input: KeyStoreKeys) {
    if (!(input.IK || input.SPKs || input.OPKs || input.SSs)) {
      return false;
    }
    return true;
  }

  /**
   * Updates the in the key store.
   */
  updateKeys(input: KeyStoreKeys) {
    return new Promise(async (resolve, reject) => {
      // If database not connected
      if (!this.DB) return reject(new IndexedDBConnectionError());
      // Validate input
      if (!this.isValid(input)) {
        reject(new IndexedDBInvalidInput("Input is missing some properties"));
      }

      // Start a transaction
      const objectStore = this.DB
        .transaction(['keys'], 'readwrite')
        .objectStore('keys')

      // Get the old keys from the key store
      const getRequest = objectStore.get(this.username);

      // Update the keys
      getRequest.onsuccess = async () => {
        let data = getRequest.result;
        data['keys'] = data.keys
          ? { ...data.keys, ...input }
          : input;

        const putRequest = objectStore.put(data);
        // Resolve with updated data
        putRequest.onsuccess = () => {
          resolve(input);
        }
        putRequest.onerror = () => {
          reject(new IndexedDBInvalidInput('Unable to update values'));
        }
      };
      getRequest.onerror = () => {
        reject(new IndexedDBNotFound());
      };
    });
  };
}


// **** Default export  **** //

export default KeyStore;
