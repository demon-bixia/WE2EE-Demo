/**
 * Types used by the protocol.
 */


// **** Generated Keys **** //

export interface KeyPair { publicKey: ArrayBuffer; privateKey: CryptoKey; }

export interface SignedKeyPair extends KeyPair { id: string; signature: ArrayBuffer; timestamp: number; }

export interface OPK extends KeyPair { id: string; }

export interface KeyBundle {
  IK: KeyPair;
  SPK: SignedKeyPair;
  OPKs: OPK[];
}


// **** Prepared Keys **** //

export interface PreparedKeyPair { publicKey: string; }

export interface PreparedSignedKeyPair extends PreparedKeyPair { id: string; signature: string; timestamp: number; }

export interface PreparedOPK extends PreparedKeyPair { id: string; }

export interface PreparedKeyBundle {
  IK: string;
  SPK: PreparedSignedKeyPair;
  OPKs: PreparedOPK[];
}


// **** Received Keys **** //

export interface ReceivedKeyPair { publicKey: string; }

export interface ReceivedSignedKeyPair extends ReceivedKeyPair { id: string; signature: string; timestamp: number; }

export interface ReceivedOPK extends ReceivedKeyPair { id: string; }

export interface ReceivedKeyBundle {
  IK: string;
  SPK: ReceivedSignedKeyPair;
  OPK?: ReceivedOPK;
}


// **** ECDH Types **** //

export interface InitialMessageKeys {
  IK: string;
  EK: string;
  SPK_ID: string;
  OPK_ID?: string;
  salt: string;
}

export interface SharedSecret {
  username: string;
  IK: string;
  SK: CryptoKey;
  AD: ArrayBuffer;
  salt: ArrayBuffer;
}


// **** Store types **** //

export interface KeyStoreKeys {
  [key: string]: undefined | KeyPair | SignedKeyPair[] | OPK[] | SharedSecret[];
  IK?: KeyPair;
  SPKs?: SignedKeyPair[];
  OPKs?: OPK[];
  SSs?: SharedSecret[];
}

export interface KeyStoreQuery {
  name: string;
  filters?: {
    id?: string;
    IK?: string;
    username?: string;
    timeFilter?: 'newest-key' | 'less-than-92-hours' | 'more-than-92-hours';
  }
}
