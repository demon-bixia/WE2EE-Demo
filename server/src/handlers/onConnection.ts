import type { Socket } from "socket.io";
import type { ISessionSocket, IMessage } from "@src/handlers/types/types";
import type { IUser } from "@src/models/UserModel";

import { redisClient } from "@src/connections/cache";
import onMessage from "@src/handlers/onMessage";

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
  if (messages) {
    socket.emit("queuedMessages", (JSON.parse(messages) as {messages: IMessage[]}).messages);
		await redisClient.del(`${socket.data["username"]}:messages`);
	}

  // ** Register Event Handlers ** //

  socket.on("message", onMessage);

  // (event) disconnected users
  socket.on("disconnect", (reason: any) => {
    logger.info(
      "socket #id: " + socket.id + " disconnected with reason: " + reason,
    );
  });
}

// **** Export default **** //

export default onConnection;

