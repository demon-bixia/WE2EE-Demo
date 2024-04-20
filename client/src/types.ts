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
  from: string;
  to: string;
  content: string;
}

export interface IStoreData {
  loading: boolean;
  user?: IUser;
  logEntries: ILogEntry[];
  messages: IMessage[];
}
