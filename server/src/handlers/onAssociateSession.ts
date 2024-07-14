import type {
  IMessage,
  ISessionSocket
} from "@src/types/types";

import logger from "jet-logger";

import { redisClient } from "@src/connections/cache";
import { UserModel } from "@src/models";
import { callbackResponse } from "@src/utils";


/**
 * Associates a socket connection with a session, messages can only be sent to and from sockets associated with sessions.
 */
async function onAssociateSession(payload: { sessionId: string, signature: string }, socket: ISessionSocket, callback: any) {
  // Search for the authenticated user.
  let user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    const message = "onAssociateSession: User not found";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Not Found",
      message
    })
  }

  // Check if session is blocked
  const blocklist = await redisClient.get(`blocklist`);
  const parsedBlocklist = JSON.parse(blocklist || '{"sessions": []}');
  if (parsedBlocklist.sessions.includes(payload.sessionId)) {
    socket.emit("action", { action: "logout" });
    const message = "onAssociateSession: This session is blocked";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Unauthorized",
      message
    });
  }

  // Search for the session with the provided IK.
  const session = user.sessions.find((session) => session.IK === payload.sessionId);
  if (!session) {
    const message = "onAssociateSession: IK doesn\'t match a valid session";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Not Found",
      message
    })
  }

  // Validate session signature.
  const importedPublicKey = await crypto.subtle.importKey(
    'spki',
    Buffer.from(payload.sessionId, 'base64'),
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
    const message = "onAssociateSession: Invalid main session signature";
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message });
  }

  // Associate the session with the socket by setting the 'sessionId' in the socket.data object.
  socket.data["username"] = user.username;
  socket.data["sessionId"] = payload.sessionId;

  // Check for message in queue and send them.
  const messages = await redisClient.get(`${socket.data.sessionId}:messages`);
  const parsedMessages: { messages: IMessage[] } | null = JSON.parse(messages || '{}');
  if (parsedMessages && Array.isArray(parsedMessages.messages)) {
    await socket.emit("queued-messages", parsedMessages.messages);
    await redisClient.del(`${socket.data.sessionId}:messages`);
  }

  // Log associating session
  logger.info(`onAssociateSession: Socket width #id: ${socket.id} associated with session #id ${payload.sessionId.slice(-10)}`);

  return callbackResponse(callback, {
    status: 'Ok',
  });
}


// **** Default export  **** //

export default onAssociateSession;
