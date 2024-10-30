import type {
	InitialMessageKeys,
	ReceivedKeyBundle,
	SharedSecret,
	DHResult,
	KeyPair
} from '$lib/WE2EE/types';
import type { Socket } from 'socket.io-client';

export interface IUser {
	username: string;
	authToken?: string;
}

export interface ILogEntry {
	time: string;
	title: string;
	more?: {
		[key: string]: { value: string; preview: 'end' | 'start' };
	};
}

export interface ISavedMessage {
	id: string;
	subject: string;
	to: string;
	from: string;
	content: string;
	timestamp: number;
	knownSessions: string[];
}

export type TMessageTypes = 'ecdh' | 'text' | 'forward' | 'update';

export interface IBaseMessage {
	id: string;
	subject: TMessageTypes;
	to: string;
	from: string;
	timestamp: number;
	IK: string;
	SIK: string;
	knownSessions: string[];
	signature: string;
}

export interface ITextMessage extends IBaseMessage {
	content: string;
	iv: string;
}

export interface IUpdateMessage extends IBaseMessage {
	unknownSessions: string[];
	messageID: string;
}

export interface IECDHMessage extends IBaseMessage, InitialMessageKeys {
	iv?: string;
}

export interface IInitialMessage extends IBaseMessage, InitialMessageKeys {
	content: string;
	iv?: string;
}

export interface IForwardMessage extends IBaseMessage {}

export interface IGetTokenResponseData {
	user?: IUser;
	message?: string;
	token?: string;
}

export interface IPersonalSession {
	IK: string;
	main: boolean;
}

export interface ISocketClient {
	socket?: Socket<any>;
	connect?: () => void;
	disconnect?: () => void;
	setupKeys?: () => void;
	deriveFromBundles?: (username: string, sessionKeys: ReceivedKeyBundle[]) => Promise<DHResult[]>;
	deriveFromBundle?: (username: string, sessionKeys: ReceivedKeyBundle) => Promise<DHResult>;
	deriveFromMessage?: (message: IECDHMessage) => Promise<DHResult>;
	addVerificationCode?: (SS: SharedSecret) => void;
	receiveMessage?: (message: ITextMessage | IECDHMessage) => void;
	sendMessage?: (messageContent: string) => void;
	saveMessage?: (message: ITextMessage | IInitialMessage | IECDHMessage, content: string) => void;
	broadcastMessage?: (
		subject: TMessageTypes,
		to: string,
		keys: SharedSecret[] | DHResult[] | (SharedSecret | DHResult)[],
		IK: KeyPair,
		SIK: KeyPair,
		save: boolean,
		content?: string,
		extraData?: any
	) => void;
	getPersonalSessions?: () => Promise<IPersonalSession[]>;
	checkForKeys?: () => {};
}

export interface IStoreData {
	currentSession?: IPersonalSession;
	socketClient?: ISocketClient;
	loading: boolean;
	IDBPermissionDenied: boolean;
	protocolLog: boolean;
	user?: IUser;
	logEntries: ILogEntry[];
	messages: ISavedMessage[];
	personalSessions: IPersonalSession[];
	verificationCodes: { username: string; codes: string[] }[];
	canSend: boolean;
}
