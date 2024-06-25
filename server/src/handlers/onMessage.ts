import type {
  IInitialMessage,
  IMessage,
  ISessionSocket
} from "@src/types/types";
import type { Server } from "socket.io";

import logger from "jet-logger";

import { redisClient } from "@src/connections/cache";
import { callbackResponse } from "@src/utils";
import { validMessage } from "@src/validators";


/**
 * Simply sends the message to the user specified or stores it in a queue 
 * if the user is not connected.
 */
async function onMessage(payload: { receiverId: string, message: IMessage | IInitialMessage }, io: Server, socket: ISessionSocket, callback: any) {
  // Check if the socket is associated with a session.
  if (!socket.data.sessionId) {
    const message = `onMessage: Socket with #id ${socket.id} not associated with a session`;
    logger.err(message);
    return callbackResponse(callback, { status: 'Unauthorized', message })
  }

  // Check if the message provided is valid
  if (!validMessage(payload.message)) {
    const message = `onMessage: Invalid message provided by socket with #id ${socket.id}`;
    logger.err(message);
    return callbackResponse(callback, { status: 'Bad Request', message })
  }

  // Send the message
  const sockets = await io.fetchSockets();
  const receiverSocket = sockets.find((socket) => socket.data.sessionId === payload.receiverId);

  // If not found save the message.
  if (!receiverSocket) {
    let messages = await redisClient.get(`${payload.receiverId}:messages`);
    if (!messages) {
      await redisClient.set(`${payload.receiverId}:messages`, JSON.stringify({ messages: [payload.message] }));
    } else {
      const parsedMessages: { messages: IMessage[] } = JSON.parse(messages);
      const newMessages = [...(parsedMessages.messages || []), payload.message];
      await redisClient.set(`${payload.receiverId}:messages`, JSON.stringify({ messages: newMessages }));
    }
    logger.info(`onMessage: Stored message sent from Session with #id ${socket.data.sessionId.slice(-10)} to Session with #id ${payload.receiverId.slice(-10)}`)
    return callbackResponse(callback, { status: 'Ok' });
  } else {
    // Send the message
    receiverSocket.emit("message", payload.message);
    logger.info(`onMessage: Sent message from Session with #id ${socket.data.sessionId.slice(-10)} to Session with #id ${payload.receiverId.slice(-10)}`)
    return callbackResponse(callback, { status: 'Ok' });
  }
}


// **** Default export  **** //

export default onMessage;
