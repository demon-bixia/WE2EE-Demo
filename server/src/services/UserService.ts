import type { IUser } from '@src/models/UserModel';
import type { UpdateWriteOpResult } from 'mongoose';
import type { IReq } from '@src/routes/types/express/misc';

import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import { RouteError } from '@src/other/classes';

import UserModel from '@src/models/UserModel';


// **** Variables **** //

export const USER_NOT_FOUND_ERR = 'User not found';
export const INVALID_VALUES_ERR = 'Unable to update user with the values provided';
export const USER_NOT_AUTHORIZED_ERR = 'You are not authorized to update this user';


// **** Functions **** //

/**
 * get one user.
 */
async function getOne(username: string): Promise<IUser | null> {
  const query = await UserModel.findOne({ username: username })
    .select({ password: 0, _id: 0 }).lean().exec();
  if (!query) {
    throw new RouteError(
      HttpStatusCodes.NOT_FOUND,
      USER_NOT_FOUND_ERR,
    );
  }
  return query;
}

/**
 * Update one user.
 */
async function updateOne(req: IReq, user: IUser): Promise<UpdateWriteOpResult> {
  // check if user exits
  const getQuery = await UserModel.findOne({ username: user.username })
    .select({ password: 0, _id: 0 }).lean().exec();
  if (!getQuery)
    throw new RouteError(
      HttpStatusCodes.NOT_FOUND,
      USER_NOT_FOUND_ERR,
    );

  // check that the request is made by the authenticated user
  if (getQuery.username !== user.username)
    throw new RouteError(
      HttpStatusCodes.UNAUTHORIZED,
      'You are not authorized to update this user',
    );

  // check that the values are valid
  if (!req.user || user.username !== req.user.username)
    throw new RouteError(
      HttpStatusCodes.UNAUTHORIZED,
      USER_NOT_AUTHORIZED_ERR,
    );

  // update user
  const updateQuery = await UserModel.updateOne({ username: user.username }, user);
  if (updateQuery.matchedCount === 0)
    throw new RouteError(
      HttpStatusCodes.BAD_REQUEST,
      USER_NOT_FOUND_ERR,
    );

  return updateQuery;
}


// **** Export default **** //

export default {
  getOne,
  updateOne,
} as const;
