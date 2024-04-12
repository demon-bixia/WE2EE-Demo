import type { IUser } from '@src/models/UserModel';
import type { IReq, IRes } from '@src/routes/types/express/misc';

import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import UserService from '@src/services/UserService';


// **** Functions **** //

/**
 * Get a user.
 */
async function getOne(req: IReq, res: IRes) {
  const query = await UserService.getOne(req.params.username);
  return res.status(HttpStatusCodes.OK).json(query).end();
}

/**
 * Update one user.
 */
async function updateOne(req: IReq<{ user: IUser }>, res: IRes) {
  const { user } = req.body;
  await UserService.updateOne(req, user);
  return res.status(HttpStatusCodes.OK).json({ message: 'User updated successfully' }).end();
}


// **** Export default **** //

export default {
  getOne,
  updateOne,
} as const;
