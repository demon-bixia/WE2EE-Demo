import type { Socket } from "socket.io";
import type { ISessionSocket, IMessage } from "@src/handlers/types/types";
import type { IUser } from "@src/models/UserModel";

import { redisClient } from "@src/connections/cache";
import onMessage from "@src/handlers/onMessage";
import onDisconnect from "@src/handlers/onDisconnect";

import logger from "jet-logger";


/**
 * Handles registering new sockets.
 */
async function onConnection(defaultSocket: Socket) {
  const socket = defaultSocket as ISessionSocket;

  // (event) handle connection errors
  socket.on("connect_error", (err: Error) => {
    logger.err(err.message);
  });

  // set the username on the socket
  socket.data["username"] = (socket.request.user as IUser).username;

  // log new connections
  logger.info(
    `new socket connection established by user: ${socket.data["username"]} with socket #id: ${socket.id}`,
  );

  // check for message in queue and send them.
  const messages = await redisClient.get(`${socket.data["username"]}:messages`);
 	const parsedMessages: {messages: IMessage[]} | null = JSON.parse(messages || '{}');
	
	if (parsedMessages &&  Array.isArray(parsedMessages.messages)) {
	  await socket.emit("queuedMessages", parsedMessages.messages);
		await redisClient.del(`${socket.data["username"]}:messages`);
	}

  // ** Register Event Handlers ** //

	// (event) receiving messages
	socket.on("message", (message: IMessage) => onMessage(socket, message));
	// (event) disconnected users
  socket.on("disconnect", (reason: any) => onDisconnect(socket, reason));
}

// **** Export default **** //

export default onConnection;

