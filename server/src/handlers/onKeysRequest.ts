import type { IReceivedKeyBundle, ISessionSocket } from "@src/types/types";

import { UserModel } from "@src/models";
import { callbackResponse } from "@src/utils";
import { validSession } from "@src/validators";

import logger from "jet-logger";


/** 
 * Sends back a key bundle for the request user.
*/
async function onKeysRequest(payload: { username: string; knownSessions?: string[]; }, socket: ISessionSocket, callback: any) {
  // Check if the socket is associated with a session.
  if (!socket.data.sessionId) {
    const message = `onKeysRequest: Socket with #id ${socket.id} connection not associated with a session`;
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  // Find the requested user
  let user = await UserModel.findOne({ username: payload.username });
  if (!user) {
    const message = "Requested user not found";
    logger.err(message);
    return callbackResponse(callback, { status: "Bad Request", message });
  }

  // Validate all the sessions the user owns
  for (let session of user.sessions) {
    if (!session || !validSession(session)) {
      const message = "User has invalid sessions";
      logger.err(message);
      return callbackResponse(callback, { status: 'Not Found', message });
    }
  }

  // Create a list of keyBundles
  let keyBundles: IReceivedKeyBundle[] = [];
  for (let session of user.sessions) {
    // exclude this session from the bundle if exists
    if (session.IK !== socket.data.sessionId) {
      const keyBundle = {
        IK: session.IK,
        SPK: session.SPK,
        OPK: session.OPKs.length > 0 ? session.OPKs[0] : undefined,
      };

      // Check if the request is for unknown sessions
      if (payload.knownSessions && payload.knownSessions.length > 0) {
        if (!payload.knownSessions.includes(session.IK)) {
          keyBundles.push(keyBundle);
          session.OPKs.splice(0, 1);
        }
      } else {
        keyBundles.push(keyBundle);
        session.OPKs.splice(0, 1);
      }
    }
  }

  // Update the user
  const newUser = await user.save();
  if (!('username' in newUser)) {
    const message = "Failed to update the user\'s session or keys";
    logger.err(message);
    return callbackResponse(callback, { status: 'Bad Request', message });
  }

  if (keyBundles.length > 0) {
    // Log sending keyBundles
    logger.info(`onKeysRequest: Sent keyBundle to socket with #id ${socket.id}`);
  }

  return callbackResponse(callback, {
    status: 'Ok',
    data: keyBundles,
  });
}


// **** Default export  **** //

export default onKeysRequest;
