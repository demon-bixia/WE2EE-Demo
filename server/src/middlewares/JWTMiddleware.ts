/**
 * json web token middleware
 */
import type { IReq, IRes } from '@src/routes/types/express/misc';

import JWTUtil from '@src/utils/JWTUtil';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import { RouteError } from '@src/other/classes';


// **** Functions **** //

/**
 * Authenticates jwt in protected routes
 */
async function AuthenticateToken(req: IReq, res: IRes, next: Function) {
  // extract token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // check if token exists
  if (!token) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'No token provided' }).end();
  }

  // verify token
  try {
    const decoded = await JWTUtil.verifyToken(token);
    if (!decoded) return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'Invalid token' }).end();
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof RouteError)
      return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'Invalid token' }).end();
  }
}

/**
 * Authenticates jwt in websocket server 
 */
async function WSAuthenticateToken(req: IReq, res: IRes, next: Function) {
  const isHandshake = req._query.sid === undefined; // ensure only applied to the first session

  if (!isHandshake) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // check if token exists
  if (!token) {
    return next(new Error("No token provided"));
  }

  // verify token
  try {
    const decoded = await JWTUtil.verifyToken(token);
    if (!decoded) return next(new Error("invalid token"));
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof RouteError) return next(new Error("invalid token"));
  }
}


// **** Export default **** //

export default {
  AuthenticateToken,
  WSAuthenticateToken
} as const;
