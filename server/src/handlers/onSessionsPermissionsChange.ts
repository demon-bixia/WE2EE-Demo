import type { ISessionSocket } from "@src/types/types";

import logger from "jet-logger";

import { UserModel } from "@src/models";
import { callbackResponse } from "@src/utils";
import { validSession } from "@src/validators";


/**
 * Adjusts the sessions permissions.
 */
async function onSessionsPermissionsChange(payload: { signature: string, sessionId: string, main: boolean }, socket: ISessionSocket, callback: any) {
  // Get the request user
  const user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    const message = 'onSessionsPermissionsChange: User not found';
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }

  // Check if the connection is associated with a session
  if (!socket.data.sessionId) {
    const message = `onSessionsPermissionsChange: Socket with #id ${socket.id} not associated with a session`;
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  // Get the associated session form the database
  const associatedSession = user.sessions.find(session => session.IK === socket.data.sessionId);
  if (!associatedSession || !validSession(associatedSession)) {
    const message = 'onSessionsPermissionsChange: The associated session is not a valid session';
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }

  // Check if the associated session is a main session
  if (!associatedSession.main) {
    const message = 'onSessionsPermissionsChange: Permissions can only be changed from the main session';
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  // Check if the user will have any main session after change
  if (
    !payload.main &&
    payload.sessionId === associatedSession.IK &&
    user.sessions.filter((session) => session.main).length === 1
  ) {
    const message = 'onSessionsPermissionsChange: The user must have at least one main session';
    logger.err(message);
    return callbackResponse(callback, { status: 'Bad Request', message });
  }

  // Update the sessions to make the new session the main session
  user.sessions = user.sessions.map((session) =>
    session.IK === payload.sessionId ? { ...session, main: payload.main } : session
  );

  // Save changes
  const newUser = await user.save();
  if (!('username' in newUser)) {
    const message = "onSessionsPermissionsChange: Failed to update the user\'s session or keys";
    logger.err(message);
    return callbackResponse(callback, { status: 'Bad Request', message });
  }

  // Log changing the permissions
  logger.info(`onSessionsPermissionsChange: Changes permissions of session with #id ${payload.sessionId} to main: ${payload.main}`)

  return callbackResponse(callback, { status: 'Ok' });
}


// **** Default export  **** //

export default onSessionsPermissionsChange;
