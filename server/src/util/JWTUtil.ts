import type { VerifyErrors, JwtPayload } from 'jsonwebtoken';

import jwt from 'jsonwebtoken';
import envVars from '@src/constants/EnvVars';


// **** Functions **** //

/**
 * generate a new token using the username as data
 */
function generateAccessToken(user: { username: string }) {
  return jwt.sign(user, envVars.Jwt.Secret, { expiresIn: '3600s' });
}

/**
 * test if the token is valid
 */
function verifyToken(token: string) {
  return new Promise<{ username: string } | undefined>((resolve, reject) => jwt.verify(token, envVars.Jwt.Secret,
    (error: VerifyErrors | null, decoded: string | undefined | JwtPayload) => error ? reject(undefined) : resolve((decoded as { username: string }))));
}


// **** Export default **** //

export default {
  generateAccessToken,
  verifyToken
} as const;
