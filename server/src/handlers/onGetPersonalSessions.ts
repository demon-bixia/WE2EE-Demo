import type { ISessionSocket } from "@src/types/types";

import { UserModel } from "@src/models";
import { callbackResponse } from "@src/utils";
import { validSession } from "@src/validators";

import logger from "jet-logger";


/** 
 * Sends back a key bundle for the request user.
*/
async function onGetPersonalSessions(socket: ISessionSocket, callback: any) {
  // Check if the socket is associated with a session.
  if (!socket.data.sessionId) {
    const message = `onGetPersonalSessions: Socket with #id ${socket.id} connection not associated with a session`;
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  // Find the requested user
  let user = await UserModel.findOne({ username: socket.data.username });

  if (!user) {
    const message = "onGetPersonalSessions: Requested user not found";
    logger.err(message);
    return callbackResponse(callback, { status: "Bad Request", message });
  }

  // Validate all the sessions the user owns
  for (let session of user.sessions) {
    if (!session || !validSession(session)) {
      const message = "onGetPersonalSessions: User has invalid sessions";
      logger.err(message);
      return callbackResponse(callback, { status: 'Not Found', message });
    }
  }

  // Create a list containing the identity keys of all session this user owns
  let personalSessions: { IK: string, main: boolean }[] = [];
  for (let session of user.sessions) {
    personalSessions.push({ IK: session.IK, main: session.main });
  }

  // Find the current session
  const currentSession = personalSessions.find((session) => session.IK === socket.data.sessionId);
  if (!currentSession) {
    const message = "onGetPersonalSessions: The current session is not among the personal sessions";
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }

  if (personalSessions.length > 0) {
    // Log sending the list of personal sessions
    logger.info(`onGetPersonalSessions: Sent list of known sessions to socket with #id ${socket.id}`);
  }

  return callbackResponse(callback, {
    status: 'Ok',
    data: personalSessions,
    currentSession: currentSession
  });
}


// **** Default export  **** //

export default onGetPersonalSessions;
