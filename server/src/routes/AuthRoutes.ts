import type { IReq, IRes } from '@src/routes/types/express/misc';

import { createHash } from 'crypto';

import UserModel from '@src/models/UserModel';
import JWTUtil from '@src/util/JWTUtil';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';


// **** Functions **** //

/**
 * Authenticate user and provide access token
 */
async function getToken(req: IReq, res: IRes) {
  // validate data
  if (!req.body['username'] || !req.body['password']) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: 'Missing username or password' }).end();
  }

  // find user with username using mongodb model and check password
  const user = await UserModel.findOne({ username: req.body['username'] }).lean().exec();
  if (!user || !user.password || createHash('sha256').update(req.body['password']).digest('hex') !== user.password) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'Invalid username or password' }).end();
  }

  // generate access token
  const token = JWTUtil.generateAccessToken({ username: user.username });
  return res.status(HttpStatusCodes.OK).json({ token }).end();
}


// **** Export default **** //

export default {
  getToken
} as const;
