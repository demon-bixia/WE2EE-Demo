import type { IReq, IRes } from '@src/routes/types/express/misc';

import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import UserModel from '@src/models/UserModel';
import JWTUtil from '@src/utils/JWTUtil';


// **** Functions **** //

/**
 * Authenticate user and provide access token
 */
async function getToken(req: IReq, res: IRes) {
  // validate data
  if (!req.body['username']) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: 'Missing username field' }).end();
  }

  // find user with username using mongodb model.
  const user = await UserModel.findOne({ username: req.body['username'] }).select({ _id: 0 }).lean().exec();
  if (!user) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'Invalid username ' }).end();
  }

  // generate access token
  const token = JWTUtil.generateAccessToken(user);
  return res.status(HttpStatusCodes.OK).json({ token, user: user }).end();
}


// **** Export default **** //

export default {
  getToken
} as const;
