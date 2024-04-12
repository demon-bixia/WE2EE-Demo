/**
 * json web token middleware
 */
import type { IReq, IRes } from '@src/routes/types/express/misc';

import JWTUtil from '@src/util/JWTUtil';
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
    if (err instanceof RouteError) {
      return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'Invalid token' }).end();
    }
  }
}

// **** Export default **** //

export default AuthenticateToken;
