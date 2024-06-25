import type { ISessionSocket } from "@src/types/types";

import { UserModel } from "@src/models";
import { callbackResponse } from "@src/utils";

import logger from "jet-logger";


/**
 *  Check if the session has few OPKs and if they need to be refiled.
 */
async function onKeysCheck(_payload: any, socket: ISessionSocket, callback: any) {
  // get the authenticated user 
  const user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    const message = "onKeysCheck: User not found";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Not Found",
      message
    });
  }

  // Check if the connection is associated with a session.
  if (!socket.data.sessionId) {
    const message = `onKeysCheck: Socket with #id ${socket.id} not associated with a session`;
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  // search for the request session
  const session = user.sessions.find((session) => session.IK === socket.data.sessionId);
  if (!session) {
    const message = "onKeysCheck: Session not found on database";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Not Found",
      message,
    });
  }

  const needKeys = session.OPKs.length === 0;
  if (needKeys) logger.info(`onKeysCheck: Socket with #id ${socket.id} needs to refill OPKs`);
  return callbackResponse(callback, {
    status: "Ok",
    needKeys: needKeys
  });
}


// **** Default export  **** //

export default onKeysCheck;
