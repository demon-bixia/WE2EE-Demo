import type { IncomingMessage } from 'http';
import type { Socket } from 'socket.io';


interface ISessionIncomingMessage extends IncomingMessage {
  user: { username: string }
};

export interface ISessionSocket extends Socket {
  request: ISessionIncomingMessage,
	data: any
};

export interface IMessage {
	subject: string;
  from: string;
  to: string;
  content: string;
	timestamp: string;
}

