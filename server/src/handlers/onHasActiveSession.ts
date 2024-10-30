import type { Server } from "socket.io";
import { callbackResponse } from "@src/utils";

/**
 * Simply checks if the user has any active socket connection
 */
async function onHasActiveSession(
  payload: { username: string },
  io: Server,
  callback: any
) {
  // find a socket connection that is associated with the username
  const sockets = await io.fetchSockets();
  const receiverSocket = sockets.find(
    (socket) => socket.data && socket.data.username === payload.username
  );

  if (!receiverSocket) {
    return callbackResponse(callback, {
      status: "Ok",
      hasActiveSession: false,
    });
  }

  return callbackResponse(callback, {
    status: "Ok",
    hasActiveSession: true,
  });
}

// **** Default export  **** //

export default onHasActiveSession;
