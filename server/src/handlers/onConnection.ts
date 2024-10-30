import type {
  IInitialMessage,
  IKeyBundle,
  IMessage,
  ISessionSocket,
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
import onSessionPermissionsChange from "@src/handlers/onSessionsPermissionsChange";
import onSessionBlock from "@src/handlers/onSessionBlock";
import onGetPersonalSessions from "@src/handlers/onGetPersonalSessions";
import onHasKeysCheck from "@src/handlers/onHasKeysCheck";
import onHasActiveSession from "@src/handlers/onHasActiveSession";

/**
 * Handles registering new sockets.
 */
async function onConnection(io: Server, socket: ISessionSocket) {
  // ** Register Event Handlers ** //
  // handle connection errors
  socket.on("connect_error", onConnectionError);
  // get personal sessions
  socket.on(
    "sessions:getPersonal",
    async (_payload: undefined, callback) =>
      await onGetPersonalSessions(socket, callback)
  );
  // associate a session
  socket.on(
    "sessions:associate",
    async (payload: { sessionId: string; signature: string }, callback) =>
      await onAssociateSession(payload, io, socket, callback)
  );
  // promote session
  socket.on(
    "sessions:permissionsChange",
    async (
      payload: { signature: string; sessionId: string; main: boolean },
      callback
    ) => await onSessionPermissionsChange(payload, socket, callback)
  );
  // block session
  socket.on(
    "sessions:block",
    async (payload: { signature: string; sessionId: string }, callback) =>
      await onSessionBlock(payload, io, socket, callback)
  );
  // receiving messages
  socket.on(
    "message",
    async (
      payload: { receiverId: string; message: IMessage | IInitialMessage },
      callback
    ) => await onMessage(payload, io, socket, callback)
  );
  // uploading keys
  socket.on(
    "keys:upload",
    async (payload: { newSession: boolean; keyBundle: IKeyBundle }, callback) =>
      await onKeysUpload(payload, io, socket, callback)
  );
  // requesting keys
  socket.on(
    "keys:request",
    async (payload: { username: string }, callback) =>
      await onKeysRequest(payload, socket, callback)
  );
  // check if there are keys
  socket.on(
    "keys:check",
    async (payload: any, callback) =>
      await onKeysCheck(payload, socket, callback)
  );
  // check if the other user has any keys
  socket.on(
    "keys:hasKeysCheck",
    async (payload: { username: string }, callback) =>
      await onHasKeysCheck(payload, socket, callback)
  );
  // check if a user has any active session
  socket.on(
    "sessions:hasActiveSession",
    async (payload: { username: string }, callback) =>
      await onHasActiveSession(payload, io, callback)
  );
  // disconnected users
  socket.on("disconnect", (reason: any) => onDisconnect(socket, reason));
  // log new connections
  logger.info(
    `new socket connection established with socket #id: ${socket.id}`
  );
}

// **** Default export  **** //

export default onConnection;
