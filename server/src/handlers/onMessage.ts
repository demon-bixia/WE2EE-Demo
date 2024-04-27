import type { IMessage, ISessionSocket } from "@src/handlers/types/types";
import type { IUser } from "@src/models/UserModel";

import { redisClient } from "@src/connections/cache";
import { io } from "@src/server";

// **** Functions **** //

async function onMessage(socket: ISessionSocket, msg: IMessage) {
  const sockets = await io.fetchSockets();
  const receiverSocket = sockets.find(
    (socket) => socket.data["username"] === msg["to"],
  );

  // if not found save the message.
  if (!receiverSocket) {
    let messages = await redisClient.get(`${msg["to"]}:messages`);
    if (!messages) {
      await redisClient.set(
        `${msg["to"]}:messages`,
        JSON.stringify({ messages: [msg] }),
      );
    } else {
      const parsedMessages: { messages: IMessage[] } = JSON.parse(messages);
      const newMessages = [...(parsedMessages.messages || []), msg];
      await redisClient.set(
        `${msg["to"]}:messages`,
        JSON.stringify({ messages: newMessages }),
      );
    }
  } else {
    // send the message
    receiverSocket.emit("message", msg);
  }

  // emit message back to sender
  const senderSocket = sockets.find((socket) => (socket.data["username"] === msg["from"]));
	if (senderSocket) {
		senderSocket.emit("message", msg);
	}
}

// **** Export default **** //

export default onMessage;
