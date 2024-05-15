import type { IReq, IRes } from '@src/types/express/misc';

import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import { UserModel } from '@src/models';
import { generateAccessToken } from '@src/utils';

import { Router } from 'express';

import Paths from '@src/constants/Paths';


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
  const user = await UserModel.findOne({ username: req.body['username'] }).select({ _id: 0, sessions: 0, }).lean().exec();
  if (!user) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'Invalid username ' }).end();
  }

  // generate access token
  const token = generateAccessToken(user);
  return res.status(HttpStatusCodes.OK).json({ token, user: user }).end();
}


// **** Add Routes **** //

// Base routes
const apiRouter = Router();
// Authentication routes
const authRouter = Router();

// Generate token route.
authRouter.post(Paths.Auth.GetToken, getToken);
// Add AuthRouter
apiRouter.use(Paths.Auth.Base, authRouter);


// **** Export default **** //

export default apiRouter
