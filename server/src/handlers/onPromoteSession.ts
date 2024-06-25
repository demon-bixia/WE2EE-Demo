import type {
  IKeyBundle,
  ISessionSocket
} from "@src/types/types";

import logger from "jet-logger";

import { UserModel } from "@src/models";
import { validSession } from "@src/validators";
import { Buffer } from 'node:buffer';
import { callbackResponse } from "@src/utils";


/**
 * Moves the main session form the main session
 * to the session id provided, can only be run by the main session.
 */
async function onPromoteSession(payload: { signature: string, sessionId: string, keyBundle: IKeyBundle }, socket: ISessionSocket, callback: any) {
  // get the request user
  const user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    const message = 'User not found';
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }

  // get the main session
  const mainSession = user.sessions.find(session => session.main);
  if (!mainSession || !validSession(mainSession)) {
    const message = 'User has no active session';
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }

  // Validate main session signature.
  const importedPublicKey = await crypto.subtle.importKey(
    'spki',
    Buffer.from(mainSession.IK, 'base64'),
    { name: "ECDSA", namedCurve: "P-384" },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: { name: 'SHA-384' } },
    importedPublicKey,
    Buffer.from(payload.signature, 'base64'),
    Buffer.from(payload.sessionId, 'base64')
  );
  if (!valid) {
    const message = 'Invalid main session signature';
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  // update the sessions to make the new session the main session.
  user.sessions = user.sessions.map((session) =>
    session.IK === payload.sessionId ? { ...session, main: true } : { ...session, main: false }
  );

  // save changes
  const newUser = await user.save();
  if (!('username' in newUser)) {
    const message = "Failed to update the user\'s session or keys";
    logger.err(message);
    return callbackResponse(callback, { status: 'Bad Request', message });
  }

  logger.info(`Session with #id ${payload.sessionId} promoted to main`)
  return callbackResponse(callback, { status: 'Ok' });
}


// **** Default export  **** //

export default onPromoteSession;
