import type { IMessage, ISessionSocket } from "@src/handlers/types/types";

import { redisClient } from "@src/connections/cache";
import { io } from "@src/server";


// **** Functions **** //

async function onMessage(msg: IMessage) {
  const sockets = await io.fetchSockets();
  const targetSocket = sockets.find(
    (socket) => socket.data["username"] === msg["receiver"],
  );

  // if not found save the message.
  if (!targetSocket) {
    let messages = await redisClient.get(`${msg["receiver"]}:messages`);
		if (!messages) {
			await redisClient.set(`{msg["receiver"]}:messages`, JSON.stringify({messages: messages}));
    } else {
			const newMessages = [...(JSON.parse(messages) as {messages: IMessage[]}).messages, msg];
      await redisClient.set(`${msg["receiver"]}:messages`, JSON.stringify({ messages: newMessages })); 
    }
		return;
  }

  // send the message
  targetSocket.emit("message", [msg]);
}

// **** Export default **** //

export default onMessage;
