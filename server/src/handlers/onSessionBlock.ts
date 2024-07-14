import type { ISessionSocket } from "@src/types/types";
import type { Server } from "socket.io";

import logger from "jet-logger";

import { redisClient } from "@src/connections/cache";
import { UserModel } from "@src/models";
import { callbackResponse } from "@src/utils";
import { validSession } from "@src/validators";


/**
 * Adds a session the block list.
 */
async function onSessionBlock(payload: { signature: string; sessionId: string; }, io: Server, socket: ISessionSocket, callback: any) {
  // Get the request user
  const user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    const message = 'onSessionBlock: User not found';
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }

  // Get the associated session form the database
  const associatedSession = user.sessions.find(session => session.IK === socket.data.sessionId);
  if (!associatedSession || !validSession(associatedSession)) {
    const message = 'onSessionBlock: The associated session is not a valid session';
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }

  // Check if the associated session is a main session
  if (!associatedSession.main) {
    const message = 'onSessionBlock: Permissions can only be changed from the main session';
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  // Check if the session to be blocked is the associated session
  if (associatedSession.IK === payload.sessionId) {
    const message = 'onSessionBlock: You can\'t block yourself';
    logger.err(message);
    return callbackResponse(callback, { status: 'Bad Request', message });
  }

  // Get the session to be blocked
  const blockedSessionIndex = user.sessions.findIndex((session) => session.IK === payload.sessionId);
  if (blockedSessionIndex === -1) {
    const message = 'onSessionBlock: the session to be blocked does not exist';
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }
  const blockedSession = user.sessions[blockedSessionIndex];

  // Check if the session to be blocked is a main session
  if (blockedSession.main) {
    const message = 'onSessionBlock: a main session must be demoted before blocking';
    logger.err(message);
    return callbackResponse(callback, { status: 'Not Found', message });
  }

  // Add session to block list and remove bundles
  const blocklist = await redisClient.get(`blocklist`);
  const parsedBlocklist = JSON.parse(blocklist || '{"sessions": []}');
  if (!parsedBlocklist.sessions.includes(blockedSession.IK)) {
    parsedBlocklist.sessions.push(blockedSession.IK);
    await redisClient.set('blocklist', JSON.stringify(parsedBlocklist));
  }

  // Find the blocked session's connected socket
  const sockets = await io.fetchSockets();
  const blockedSocket = sockets.find((socket) => socket.data.sessionId === payload.sessionId);
  if (blockedSocket) {
    // Send a logout message to the session if connected
    blockedSocket.emit("action", { action: "logout" });
    // Disconnect the blocked session's  socket if connected
    blockedSocket.disconnect();
  }

  // Remove the blocked session from the database
  user.sessions.splice(blockedSessionIndex, 1);
  // Update the user
  const newUser = await user.save();
  if (!('username' in newUser)) {
    const message = "Failed to update the user\'s session or keys";
    logger.err(message);
    return callbackResponse(callback, { status: 'Bad Request', message });
  }


  // Log adding to block list
  const message = `onSessionBlock: session with #id ${socket.data.sessionId} added session with #id ${payload.sessionId} tio block`;
  logger.info(message);

  return callbackResponse(callback, { status: 'Ok', message, action: "update-password" });
}


// **** Default export  **** //

export default onSessionBlock;
