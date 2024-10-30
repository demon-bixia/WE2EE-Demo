import { UserModel } from "@src/models";
import type {
  CompleteKeyBundle,
  IKeyBundle,
  ISessionSocket,
} from "@src/types/types";
import type { Server } from "socket.io";

import logger from "jet-logger";

import { callbackResponse } from "@src/utils";
import { hasDuplicateKeys, validKeys } from "@src/validators";

/**
 * Updates the users public keys on the server.
 */
async function onKeysUpload(
  payload: { newSession: boolean; keyBundle: IKeyBundle; signature?: string },
  io: Server,
  socket: ISessionSocket,
  callback: any
) {
  // search for the authenticated user
  let user = await UserModel.findOne({
    username: socket.request.user.username,
  });
  if (!user) {
    const message = "User not found";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Not Found",
      message,
    });
  }

  // If the request is for creating a new session the payload.keyBundle must contain all keys.
  if (!validKeys(payload.keyBundle, !payload.newSession)) {
    const message = "Payload doesn't contain a valid key";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Bad Request",
      message,
    });
  }

  if (payload.newSession) {
    // Check if already has sessions
    if (socket.data.sessionId) {
      const message = "Session is already created";
      logger.err(message);
      return callbackResponse(callback, {
        status: "Bad Request",
        message,
      });
    }
    // Check for duplicates
    if (hasDuplicateKeys(payload.keyBundle, user.sessions)) {
      const message = "Bundle contains duplicate keys";
      logger.err(message);
      return callbackResponse(callback, {
        status: "Bad Request",
        message,
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
    socket.data.username = user.username;
    logger.info(
      `Socket width #id: ${
        socket.id
      } associated with session #id ${session.IK.slice(-10)}`
    );

    // tell other connected sessions owned by other users that you can send
    const otherUsername = user.username === "Alice" ? "Bob" : "Alice";
    const sockets = await io.fetchSockets();
    const receiverSockets = sockets.filter(
      (socket) => socket.data.username === otherUsername
    );
    for (let receiverSocket of receiverSockets) {
      receiverSocket.emit("can-send", { canSend: true });
    }
  } else {
    // Check if the connection is associated with a session.
    if (!socket.data.sessionId) {
      const message = `onKeysUpload: Socket with #id ${socket.id} not associated with a session`;
      logger.err(message);
      return callbackResponse(callback, { status: "Unauthorized", message });
    }

    // Search for the associated session and if not found return Not Found.
    const sessionIndex = user.sessions.findIndex(
      (session) => session.IK === socket.data.sessionId
    );
    if (sessionIndex === -1) {
      const message = "IK doesn't match a valid session";
      logger.err(message);
      return callbackResponse(callback, { status: "Not Found", message });
    }

    // Update the authenticated user's sessions
    Object.entries(payload.keyBundle).forEach(([key, value]) => {
      user.sessions[sessionIndex][key as "IK" | "SIK" | "SPK" | "OPKs"] = value;
    });
  }

  // Save the changes made to the authenticated user.
  const newUser = await user.save();
  if ("username" in newUser) {
    return callback({ status: "Ok" });
  } else {
    const message = "Update failed";
    logger.err(message);
    return callbackResponse(callback, { status: "Bad Request", message });
  }
}

// **** Default export  **** //

export default onKeysUpload;
