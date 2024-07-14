import type { IReq, IRes } from '@src/types/express/misc';

import { Router } from 'express';

import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import Paths from '@src/constants/Paths';
import { UserModel } from '@src/models';
import { generateAccessToken } from '@src/utils';


// **** Functions **** //

/**
 * Authenticate user and provide access token
 */
async function getToken(req: IReq, res: IRes) {
  // validate data
  if (!req.body['username']) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: 'Missing some required fields' }).end();
  }

  // find user with username using mongodb model.
  const user = await UserModel.findOne({ username: req.body['username'] }).select({ _id: 0, sessions: 0, }).lean().exec();
  if (!user) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'Invalid username ' }).end();
  }

  // generate access token
  const token = generateAccessToken(user);
  return res.status(HttpStatusCodes.OK).json({ token, user: user }).end();
}


// **** Add Routes **** //

// Authentication routes
const authRouter = Router();

// Generate token route.
authRouter.post(Paths.Auth.GetToken, getToken);


// **** Export default **** //

export default authRouter
