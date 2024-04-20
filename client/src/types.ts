export interface IUser {
  username: string;
  status: string;
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
