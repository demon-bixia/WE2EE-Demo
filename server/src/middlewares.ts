/**
 * json web token middleware
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import { verifyToken } from '@src/utils';
import url from 'node:url';


// **** Functions **** //

/**
 * Authenticates jwt in websocket server 
 */
export async function WSAuthenticateToken(req: IncomingMessage, res: ServerResponse, next: Function) {
  const queryData = url.parse(req.url || '', true).query;
  const isHandshake = queryData.sid === undefined; // Ensure only applied to the first session

  if (!isHandshake) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Check if token exists

  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify({ message: 'No token provided' }));
    res.end();
    return;
  }

  // Verify token
  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify({ message: 'invalid token' }));
      res.end();
      return;
    }
    (req as any).user = decoded;
    next();
  } catch (error) {
    //return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: 'Invalid token' }).end();
  }
}
