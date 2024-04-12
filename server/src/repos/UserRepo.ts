import type { IUser } from '@src/models/UserModel';
import type { UpdateWriteOpResult } from 'mongoose';

import UserModel from '@src/models/UserModel';


// **** Functions **** //

/**
 * Get one user.
 */
async function getOne(username: string): Promise<IUser | null> {
  const query = await UserModel.findOne({ username: username })
    .select({ password: 0, _id: 0 }).lean().exec();
  return query;
}

/**
 * Update a user.
 */
async function update(username: string, update: any): Promise<UpdateWriteOpResult> {
  const query = await UserModel.updateOne({ username: username }, update);
  return query;
}


// **** Export default **** //

export default {
  getOne,
  update,
} as const;
