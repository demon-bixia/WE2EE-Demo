import type { InitialMessageKeys } from '$lib/WE2EE/types';
import type { Socket } from 'socket.io-client';

export interface IUser {
  username: string;
  authToken?: string;
}

export interface ILogEntry {
  time: string;
  title: string;
  more?: {
    [key: string]: string | number;
  };
}

export interface ISavedMessage {
  subject: string;
  to: string;
  from: string;
  content: string;
  timestamp: number;
}

export interface IMessage {
  subject: string;
  to: string;
  from: string;
  content: string;
  timestamp: number;
  IK: string;
  iv: string;
}

export interface IInitialMessage extends InitialMessageKeys {
  subject: string;
  to: string;
  from: string;
  content?: string;
  timestamp: number;
  IK: string;
  iv?: string;
}

export interface IGetTokenResponseData {
  user?: IUser;
  message?: string;
  token?: string;
}

export interface ISocketClient {
  socket?: Socket<any>;
  connect?: () => void;
  disconnect?: () => void;
  setupKeys?: () => void;
  receiveMessage?: (message: IMessage | IInitialMessage) => void;
  sendMessage?: (messageContent: string) => void;
}

export interface IStoreData {
  socketClient?: ISocketClient;
  loading: boolean;
  IDBPermissionDenied: boolean;
  protocolLog: boolean;
  user?: IUser;
  logEntries: ILogEntry[];
  messages: ISavedMessage[];
}
