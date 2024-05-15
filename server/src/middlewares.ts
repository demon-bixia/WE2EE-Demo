/**
 * json web token middleware
 */
import type { IReq, IRes } from '@src/types/express/misc';

import { verifyToken } from '@src/utils';
import { RouteError } from '@src/errors';


// **** Functions **** //

/**
 * Authenticates jwt in websocket server 
 */
export async function WSAuthenticateToken(req: IReq, _: IRes, next: Function) {
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
    const decoded = await verifyToken(token);
    if (!decoded) return next(new Error("invalid token"));
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof RouteError) return next(new Error("invalid token"));
  }
}
