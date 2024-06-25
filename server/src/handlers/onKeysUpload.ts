import { UserModel } from "@src/models";
import type {
  CompleteKeyBundle,
  IKeyBundle,
  ISessionSocket
} from "@src/types/types";

import logger from "jet-logger";

import { callbackResponse } from "@src/utils";
import { hasDuplicateKeys, validKeys } from "@src/validators";


/**
 * Updates the users public keys on the server.
 */
async function onKeysUpload(payload: { newSession: boolean, keyBundle: IKeyBundle; signature?: string; }, socket: ISessionSocket, callback: any) {
  // search for the authenticated user
  let user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    const message = 'User not found';
    logger.err(message);
    return callbackResponse(callback, {
      status: "Not Found",
      message
    })
  }

  // If the request is for creating a new session the payload.keyBundle must contain all keys.
  if (!validKeys(payload.keyBundle, !payload.newSession)) {
    const message = "Payload doesn\'t contain a valid key";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Bad Request",
      message
    });
  }

  if (payload.newSession) {
    // Check for duplicates
    if (hasDuplicateKeys(payload.keyBundle, user.sessions)) {
      const message = "Bundle contains duplicate keys";
      logger.err(message);
      return callbackResponse(callback, {
        status: 'Bad Request',
        message
      });
    }
    // Create a new session.
    const session = {
      ...(payload.keyBundle as CompleteKeyBundle),
      main: user.sessions.length === 0,
    };
    user.sessions.push(session);
    // Associate the new session with this socket connection
    socket.data.sessionId = session.IK;
    logger.info(`Socket width #id: ${socket.id} associated with session #id ${session.IK.substring(0, 10)}`);
  } else {
    // Check if the connection is associated with a session.
    if (!socket.data.sessionId) {
      const message = `onKeysUpload: Socket with #id ${socket.id} not associated with a session`;
      logger.err(message);
      return callbackResponse(callback, { status: 'Unauthorized', message });
    }

    // Search for the associated session and if not found return Not Found.
    const sessionIndex = user.sessions.findIndex((session) => session.IK === socket.data.sessionId);
    if (sessionIndex === -1) {
      const message = "IK doesn\'t match a valid session";
      logger.err(message);
      return callbackResponse(callback, { status: "Not Found", message });
    }

    // Update the authenticated user's sessions
    Object.entries(payload.keyBundle).forEach(([key, value]) => {
      user.sessions[sessionIndex][key as 'IK' | 'SPK' | 'OPKs'] = value;
    })
  }

  // Save the changes made to the authenticated user.
  const newUser = await user.save();
  if ('username' in newUser) {
    return callback({ status: 'Ok' });
  }
  else {
    const message = "Update failed";
    logger.err(message);
    return callbackResponse(callback, { status: 'Bad Request', message });
  }
}


// **** Default export  **** //

export default onKeysUpload;
