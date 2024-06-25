import type { VerifyErrors, JwtPayload } from 'jsonwebtoken';
import type { IUser } from '@src/types/types';

import jwt from 'jsonwebtoken';
import envVars from '@src/constants/EnvVars';


// **** Functions **** //

/**
 * generate a new token using the username as data
 */
export function generateAccessToken(user: IUser) {
  return jwt.sign(user, envVars.JWT.Secret, { expiresIn: '3600s' });
}

/**
 * test if the token is valid
 utils*/
export function verifyToken(token: string) {
  return new Promise<{ username: string } | undefined>((resolve, reject) => jwt.verify(token, envVars.JWT.Secret,
    (error: VerifyErrors | null, decoded: string | undefined | JwtPayload) => error ? reject(undefined) : resolve((decoded as { username: string }))));
}

/**
 * returns a socket callback as response to a websocket event,
 * or if no callback is provided with the event it just returns undefined
 */
export function callbackResponse(callback?: (data: any) => any, data?: any,) {
  if (callback) { return callback(data) }
  else { return; }
}
