/**
 * Types used by the protocol.
 */


/**
 * An EC key pair exported in spki format
 */
export interface ExportedKeyPair { publicKey: ArrayBuffer | string; privateKey?: ArrayBuffer | string; }

/**
 * An EC signed pre-key pair exported in spki format
 */
export interface ExportedSignedKeyPair extends ExportedKeyPair { id: string; signature: ArrayBuffer | string; timestamp: number; }

/**
 * An EC one time pre-key pair exported in spki format.
 */
export interface ExportedOPK extends ExportedKeyPair { id: string; }

/**
 * A collection of keys used for the ECDH exchange exported in spki format.
 */
export interface ExportedKeyBundle {
  IK: ExportedKeyPair;
  SPK: ExportedSignedKeyPair;
  OPKs: ExportedOPK[];
}

/**
 * The key bundle received from the server
 */
export interface PreparedKeyBundle {
  IK: { publicKey: string };
  SPK: { id: string; publicKey: string; signature: string; timestamp: number; };
  OPK?: { id: string; publicKey: string; };
}

/**
 * The keys sent with the initial message.
 */
export interface InitialMessageKeys {
  IK: string;
  EK: string;
  SPK_ID: string;
  OPK_ID?: string;
  salt: string;
}

/**
 * The result of the ECDH exchange.
 * IK is the public key of the other party you performed the exchange with. 
 */
export interface SharedSecret {
  username: string;
  IK: ArrayBuffer;
  SK: ArrayBuffer;
  AD: ArrayBuffer;
  salt: ArrayBuffer;
}

/**
 * Keys stored in the key store.
 */
export interface KeyStoreKeys {
  [key: string]: undefined | ExportedKeyPair | ExportedSignedKeyPair[] | ExportedOPK[] | SharedSecret[];
  IK?: ExportedKeyPair;
  SPKs?: ExportedSignedKeyPair[];
  OPKs?: ExportedOPK[];
  SKs?: SharedSecret[];
}

/**
 * All the keys stored in the key store.
 */
export interface AllKeyStoreKeys {
  [key: string]: undefined | ExportedKeyPair | ExportedSignedKeyPair[] | ExportedOPK[] | SharedSecret[];
  IK?: {publicKey: ArrayBuffer, privateKey:ArrayBuffer;};
  SPKs?: {id:string; publicKey: ArrayBuffer, privateKey:ArrayBuffer; signature: ArrayBuffer; timestamp:number;}[];
  OPKs?:  {id:string; publicKey: ArrayBuffer, privateKey:ArrayBuffer;}[];
  SKs?: SharedSecret[];
}


/**
 * The get query passed as parameter to the KeyStore.getKeys() method.
 */
export interface KeyStoreQuery {
  name: string;
  filters?: {
    id?: string;
    username?: string;
    timeFilter?: 'newest-key' | 'less-than-92-hours' | 'more-than-92-hours';
  }
}
