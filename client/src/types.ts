import type { Socket } from 'socket.io-client';
import type { InitialMessageKeys } from '$lib/WE2EE/types';

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

export interface IStoreData {
  socket?: Socket<any>,
  loading: boolean;
  protocolLog: boolean;
  user?: IUser;
  logEntries: ILogEntry[];
  messages: ISavedMessage[];
}

export interface IGetTokenResponseData {
  user?: IUser;
  message?: string;
  token?: string;
}
