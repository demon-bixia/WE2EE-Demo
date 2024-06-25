import type {
  IReceivedKeyBundle,
  ISessionSocket
} from "@src/types/types";

import { UserModel } from "@src/models";
import { validSession } from "@src/validators";
import { callbackResponse } from "@src/utils";

import logger from "jet-logger";


/** 
 * Sends back a key bundle for the request user.
*/
async function onKeysRequest(payload: { username: string, allSessions?: boolean; }, socket: ISessionSocket, callback: any) {
  // find the requested user
  let user = await UserModel.findOne({ username: payload.username });
  if (!user) {
    const message = "Requested user not found";
    logger.err(message);
    return callbackResponse(callback, { status: "Bad Request", message });
  }

  // Check if the socket is associated with a session.
  if (!socket.data.sessionId) {
    const message = `onKeysRequest: Socket with #id ${socket.id} connection not associated with a session`;
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  if (payload.allSessions) {
    // return all the sessions associated with the requested user
    // validate all the sessions the user owns
    for (let session of user.sessions) {
      if (!session || !validSession(session)) {
        const message = "User has invalid sessions";
        logger.err(message);
        return callbackResponse(callback, { status: 'Not Found', message });
      }
    }

    // create a list of keyBundles
    let keyBundles: IReceivedKeyBundle[] = [];
    for (let session of user.sessions) {
      // exclude this session from the bundle if exists
      if (session.IK !== socket.data.sessionId) {
        keyBundles.push({
          IK: session.IK,
          SPK: session.SPK,
          OPK: session.OPKs.length > 0 ? session.OPKs.splice(0, 1)[0] : undefined,
        });
      }
    }
    logger.info(`Sent keyBundle to socket with #id ${socket.id}`);
    return callbackResponse(callback, {
      status: 'Ok',
      data: keyBundles,
    });
  } else {
    // return the keys of the main session
    // get the main session
    const mainSessionIndex = user.sessions.findIndex(session => session.main);
    const mainSession = user.sessions[mainSessionIndex];
    if (!mainSession || !validSession(mainSession)) {
      const message = "User has no active session";
      return callbackResponse(callback, { status: 'Not Found', message });
    }
    // create a key bundle containing IK, SPK, and an OPK.
    let keyBundle: IReceivedKeyBundle = {
      IK: mainSession.IK,
      SPK: mainSession.SPK,
      OPK: mainSession.OPKs.length > 0 ? mainSession.OPKs.splice(0, 1)[0] : undefined,
    };

    // update the users main session with the removed OPK
    user.sessions[mainSessionIndex] = mainSession;
    const newUser = await user.save();
    // validate update
    if (!('username' in newUser)) {
      const message = "Failed to update the user\'s session or keys";
      logger.err(message);
      return callbackResponse(callback, { status: 'Bad Request', message });
    }

    logger.info(`Sent keyBundle to socket with #id ${socket.id}`);
    return callbackResponse(callback, {
      status: 'Ok',
      data: keyBundle,
    });
  }
}


// **** Default export  **** //

export default onKeysRequest;
