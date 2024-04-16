import type { IUser } from '@src/models/UserModel';
import * as e from 'express';


// **** Express **** //

export interface IReq<T = any> extends e.Request {
  body: T;
  user?: { username: string };
  _query: any
}

export interface IRes extends e.Response {
  locals: Record<string, unknown>;
}
