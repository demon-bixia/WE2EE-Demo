/**
 * Types used by the protocol.
 */

// **** Generated Keys **** //

export interface KeyPair {
	publicKey: ArrayBuffer;
	privateKey: CryptoKey;
}

export interface SignedKeyPair extends KeyPair {
	id: string;
	signature: ArrayBuffer;
	timestamp: number;
}

export interface OPK extends KeyPair {
	id: string;
}

export interface KeyBundle {
	IK: KeyPair;
	SIK: KeyPair;
	SPK: SignedKeyPair;
	OPKs: OPK[];
}

// **** Prepared Keys **** //

export interface PreparedKeyPair {
	publicKey: string;
}

export interface PreparedSignedKeyPair extends PreparedKeyPair {
	id: string;
	signature: string;
	timestamp: number;
}

export interface PreparedOPK extends PreparedKeyPair {
	id: string;
}

export interface PreparedKeyBundle {
	IK: string;
	SIK: string;
	SPK: PreparedSignedKeyPair;
	OPKs: PreparedOPK[];
}

// **** Received Keys **** //

export interface ReceivedKeyPair {
	publicKey: string;
}

export interface ReceivedSignedKeyPair extends ReceivedKeyPair {
	id: string;
	signature: string;
	timestamp: number;
}

export interface ReceivedOPK extends ReceivedKeyPair {
	id: string;
}

export interface ReceivedKeyBundle {
	IK: string;
	SIK: string;
	SPK: ReceivedSignedKeyPair;
	OPK?: ReceivedOPK;
}

// **** ECDH Types **** //

export interface InitialMessageKeys {
	IK: string;
	SIK: string;
	EK: string;
	SPK_ID: string;
	OPK_ID?: string;
	salt: string;
}

export interface DHResult {
	IK: ArrayBuffer;
	SIK: ArrayBuffer;
	oddIK: ArrayBuffer;
	SK: CryptoKey;
	salt: ArrayBuffer;
	AD: ArrayBuffer;
	EK: ArrayBuffer;
	SPK_ID: string;
	OPK_ID?: string;
	DH1: string;
	DH2: string;
	DH3: string;
	DH4?: string;
}

export interface SharedSecret {
	username: string;
	IK: string;
	SIK: string;
	SK: CryptoKey;
	AD: ArrayBuffer;
}

// **** Store types **** //

export interface KeyStoreKeys {
	[key: string]: undefined | KeyPair | SignedKeyPair[] | OPK[] | SharedSecret[];
	IK?: KeyPair;
	SIK?: KeyPair;
	SPKs?: SignedKeyPair[];
	OPKs?: OPK[];
	SSs?: SharedSecret[];
}

export interface KeyStoreQuery {
	name: string;
	filters?: {
		id?: string;
		IK?: string;
		SIK?: string;
		username?: string;
		timeFilter?: 'newest-key' | 'less-than-92-hours' | 'more-than-92-hours';
	};
}
