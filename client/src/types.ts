import type { Socket } from 'socket.io-client';


export interface Session {
  _id: number;
}

export interface IUser {
  username: string;
  status?: string;
  authToken?: string;
  IDK?: string;
  SPK?: string;
  preKeys: string[];
  sessions: Session[];

}

export interface ILogEntry {
  date: string;
  title: string;
  more?: {
    [key: string]: string | number;
  };
}

export interface IMessage {
	subject: string;
  from: string;
  to: string;
  content: string;
	timestamp: string;
}

export interface IStoreData {
  socket?: Socket<any>,
  loading: boolean;
  user?: IUser;
  logEntries: ILogEntry[];
  messages: IMessage[];
}

export interface IGetTokenResponseData {
	user?: IUser;
	message?: string;
	token?: string;
}

