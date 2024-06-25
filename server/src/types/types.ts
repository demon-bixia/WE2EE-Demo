import type { IncomingMessage } from 'http';
import type { Socket } from 'socket.io';

import * as e from 'express';
import { Query } from 'express-serve-static-core';


// **** WebSocket Handlers Types **** //

interface ISessionIncomingMessage extends IncomingMessage {
  user: { username: string }
};

export interface ISessionSocket extends Socket {
  request: ISessionIncomingMessage,
  data: any
};

export interface IMessage {
  IK: string;
  subject: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  iv: string;
}

export interface IInitialMessage extends IMessage {
  EK: string;
  SPK_ID: string;
  OPK_ID?: string;
  salt: string;
}

export interface IKeyBundle {
  IK?: string;
  SPK?: IKeyWithId;
  OPKs: IKeyWithId[];
}

export interface IReceivedKeyBundle {
  IK?: string;
  SPK?: IKeyWithId;
  OPK?: IKeyWithId;
}

export interface CompleteKeyBundle {
  IK: string;
  SPK: IKeyWithId;
  OPKs: IKeyWithId[];
}


// **** Database types **** //

export interface IKeyWithId {
  id: string;
  publicKey: string;
  signature?: string;
}

export interface ISession {
  IK: string;
  SPK: IKeyWithId;
  OPKs: IKeyWithId[];
  main: boolean;
}

export interface IUser {
  username: string;
  sessions: ISession[];
};


// **** Express **** //

export interface IReq<T = void> extends e.Request {
  body: T;
}

export interface IReqQuery<T extends Query, U = void> extends e.Request {
  query: T;
  body: U;
}
