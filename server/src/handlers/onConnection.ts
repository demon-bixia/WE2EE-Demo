import type {
  IInitialMessage,
  IKeyBundle,
  IMessage,
  ISessionSocket
} from "@src/types/types";
import type { Server } from "socket.io";

import logger from "jet-logger";

import onAssociateSession from "@src/handlers/onAssociateSession";
import onConnectionError from "@src/handlers/onConnectionError";
import onDisconnect from "@src/handlers/onDisconnect";
import onKeysCheck from "@src/handlers/onKeysCheck";
import onKeysRequest from "@src/handlers/onKeysRequest";
import onKeysUpload from "@src/handlers/onKeysUpload";
import onMessage from "@src/handlers/onMessage";
import onPromoteSession from "@src/handlers/onPromoteSession";


/**
 * Handles registering new sockets.
 */
async function onConnection(io: Server, socket: ISessionSocket) {
  // ** Register Event Handlers ** //
  // handle connection errors
  socket.on("connect_error", onConnectionError);
  // associated session
  socket.on("sessions:associate", (payload: { sessionId: string; signature: string; }, callback) => onAssociateSession(payload, socket, callback))
  // promote session
  socket.on("sessions:promote", onPromoteSession);
  // receiving messages
  socket.on("message", async (payload: { receiverId: string; message: IMessage | IInitialMessage; }, callback) => await onMessage(payload, io, socket, callback));
  // uploading keys
  socket.on("keys:upload", async (payload: { newSession: boolean; keyBundle: IKeyBundle; }, callback) => await onKeysUpload(payload, socket, callback));
  // requesting keys
  socket.on("keys:request", async (payload: { username: string }, callback) => await onKeysRequest(payload, socket, callback));
  // check if there are keys
  socket.on("keys:check", async (payload: any, callback) => await onKeysCheck(payload, socket, callback))
  // disconnected users
  socket.on("disconnect", (reason: any) => onDisconnect(socket, reason));
  // log new connections
  logger.info(
    `new socket connection established with socket #id: ${socket.id}`,
  );
}


// **** Default export  **** //

export default onConnection;
