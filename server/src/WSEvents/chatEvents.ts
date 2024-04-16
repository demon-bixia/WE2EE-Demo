import type { Socket } from 'socket.io';
import type { ISessionSocket, IMessage } from '@src/WSEvents/types/types';
import { redisClient } from '@src/connections/cache';

import logger from 'jet-logger';
import { io } from "@src/server";


// **** Functions **** //

/**
 * A socket.io sever with a socket
 * event for sending messaging.
 */
io.on("connection", async (defaultSocket: Socket) => {
  const socket = defaultSocket as ISessionSocket;

  // (event) handle connection errors
  socket.on("connect_error", (err) => {
    logger.err(err.message);
  });

  // set the username on the socket
  socket.data['username'] = socket.request.user.username;

  // log new connections
  logger.info(`new socket connection established by user: ${socket.data['username']} with socket #id: ${socket.id}`);

  // check for message in queue and send them.
  const messages = await redisClient.json.get(`${socket.data['username']}:messages`);
  if (messages) {
    socket.emit('messages', messages);
  }
  await redisClient.json.del(`${socket.data['username']}:messages`);

  // (event) sending messages
  socket.on('messages', async (msg: IMessage) => {
    const sockets = await io.fetchSockets();
    const targetSocket = sockets.find((socket) => socket.data['username'] === msg['receiver']);

    // if not found save the message.
    if (!targetSocket) {
      let messages = await redisClient.json.get(`${msg['receiver']}:messages`);
      if (!Array.isArray(messages)) {
        redisClient.json.set(`${msg['receiver']}:messages`, '$', { 'messages': messages });
        return;
      } else {
        (messages as Array<any>).push(msg);
        redisClient.json.set(`${msg['receiver']}:messages`, '$', { 'messages': messages });
        return;
      }
    };

    // send the message
    targetSocket.emit('messages', [msg]);
  });

  // (event) disconnected users
  socket.on('disconnect', (reason) => {
    logger.info("socket #id: " + socket.id + " disconnected with reason: " + reason);
  });
});
