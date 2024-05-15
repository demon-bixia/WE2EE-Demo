import type { CompleteKeyBundle, IInitialMessage, IKeyBundle, IMessage, ISessionSocket, IUser, IReceivedKeyBundle } from "@src/types/types";
import { Buffer } from 'node:buffer';
import { createPublicKey, verify } from 'node:crypto';
import { Server, Socket } from "socket.io";

import { redisClient } from "@src/connections";
import { UserModel } from "@src/models";
import { hasDuplicateKeys, valIKeys, validSession, validUser } from "@src/validators";

import logger from "jet-logger";


/**
 * Handles registering new sockets.
 */
async function handler(io: Server, defaultSocket: Socket) {
  const socket = defaultSocket as ISessionSocket;
  // **** Register Event Handlers **** //
  // handle connection errors
  socket.on("connect_error", onConnectionError);
  // associated session
  socket.on("sessions:associate", (payload: { sessionId: string; signature: string; }, callback) => onAssociateSession(payload, socket, callback))
  // promote session
  socket.on("sessions:promote", onPromoteSession);
  // receiving messages
  socket.on("message", async (payload: { message: IMessage | IInitialMessage; }, callback) => await onMessage(payload, io, socket, callback));
  // uploading keys
  socket.on("keys:upload", async (payload: { newSession: boolean; keyBundle: IKeyBundle; }, callback) => await onKeysUpload(payload, io, socket, callback));
  // requesting keys
  socket.on("keys:request", async (payload: { username: string }, callback) => await onKeysRequest(payload, socket, callback));
  // check if there are keys
  socket.on("keys:check", async (payload: { sessionID: string }, callback) => await onKeysCheck(payload, socket, callback))
  // disconnected users
  socket.on("disconnect", (reason: any) => onDisconnect(socket, reason));

  // set the username on the socket
  socket.data["username"] = (socket.request.user as IUser).username;
  // log new connections
  logger.info(
    `new socket connection established by user: ${socket.data["username"]} with socket #id: ${socket.id}`,
  );
}

/**
 *  Logs connection errors
 */
async function onConnectionError(error: Error) {
  logger.err(error.message);
}

/**
 * Associates a socket connection with a session, messages can only be sent to and from sockets associated with sessions.
 */
async function onAssociateSession(payload: { sessionId: string, signature: string }, socket: ISessionSocket, callback: any) {
  // Search for the authenticated user.
  let user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    return callback({
      status: "Not Found",
      message: "User not found"
    });
  }

  // Search for the session with the provided IK.
  const session = user.sessions.find((session) => session.IK === payload.sessionId);
  if (!session) {
    return callback({
      status: "Not Found",
      message: "IK doesn\'t match a valid session"
    });
  }

  // Validate main session signature.
  const valid = await verify(
    'ecdsa-with-SHA256',
    Buffer.from(payload.sessionId),
    createPublicKey({ key: session.IK, format: 'der', type: 'spki' }),
    Buffer.from(payload.signature));;
  if (!valid) {
    return callback({ status: 'Unauthorized', message: 'Invalid main session signature' });
  }

  // Associate the session with the socket by setting the 'sessionId' in the socket.data object.
  socket.data["sessionId"] = payload.sessionId;

  // Check for message in queue and send them.
  const messages = await redisClient.get(`${socket.data.username}:${socket.data.sessionId}:messages`);
  const parsedMessages: { messages: IMessage[] } | null = JSON.parse(messages || '{}');
  if (parsedMessages && Array.isArray(parsedMessages.messages)) {
    await socket.emit("queued-messages", parsedMessages.messages);
    await redisClient.del(`${socket.data.username}:${socket.data.sessionId}:messages`);
  }

  callback({
    status: 'Ok',
  });
}

/**
 * Moves the main session form the main session
 * to the session id provided, can only be run by the main session.
 */
async function onPromoteSession(payload: { signature: string, sessionId: string, keyBundle: IKeyBundle }, socket: ISessionSocket, callback: any) {
  // get the request user
  const user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    return callback({ status: 'Not Found', message: 'User not found' });
  }

  // get the main session
  const mainSession = user.sessions.find(session => session.main);
  if (!mainSession || !validSession(mainSession)) {
    return callback({ status: 'Not Found', message: 'User has no active session' });
  }

  // Validate main session signature.
  const valid = await verify(
    'ecdsa-with-SHA256',
    Buffer.from(payload.sessionId),
    createPublicKey({ key: mainSession.IK, format: 'der', type: 'spki' }),
    Buffer.from(payload.signature));;
  if (!valid) {
    return callback({ status: 'Unauthorized', message: 'Invalid main session signature' });
  }

  // update the sessions to make the new session the main session.
  user.sessions = user.sessions.map((session) =>
    session.IK === payload.sessionId ? { ...session, main: true } : { ...session, main: false }
  );

  // save changes
  const newUser = user.save();
  if (!validUser(newUser)) {
    return callback({ status: 'Bad Request', message: 'Failed to update the user\'s session or keys' });
  }

  return callback({ status: 'Ok' });
}

/**
 * Updates the users public keys on the server.
 */
async function onKeysUpload(payload: { newSession: boolean, keyBundle: IKeyBundle; signature?: string; }, io: Server, socket: ISessionSocket, callback: any) {
  // search for the authenticated user
  let user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    return callback({
      status: "Not Found",
      message: "User not found"
    });
  }
  // If the request is for creating a new session the payload.keyBundle must contain all keys.
  if (!valIKeys(payload.keyBundle, payload.newSession)) {
    return callback({
      status: "Bad Request",
      message: "Payload doesn\'t contain valid key"
    });
  }
  if (payload.newSession) {
    // Check for duplicates    
    if (hasDuplicateKeys(payload.keyBundle, user.sessions)) {
      return callback({
        status: 'Bad Request',
        message: 'Bundle contains duplicate keys'
      });
    }
    // Create a new session.
    const session = {
      ...(payload.keyBundle as CompleteKeyBundle),
      main: user.sessions.length === 0,
    };
    user.sessions.push(session);
    // Associate the new session with this socket connection
    socket.data['sessionId'] = session.IK;
  } else {
    // Check if the connection is associated with a session.
    if (!socket.data.sessionId) {
      return callback({ status: 'Unauthorized', message: 'No session associated with socket connection' });
    }
    // Check if a signature was provided
    if (!payload.signature) {
      return callback({ status: 'Unauthorized', message: 'No signature was provided' });
    }
    // Validate main session signature.
    const valid = await verify(
      'ecdsa-with-SHA256',
      Buffer.from(socket.data.sessionId),
      createPublicKey({ key: socket.data.sessionId, format: 'der', type: 'spki' }),
      Buffer.from(payload.signature));;
    if (!valid) {
      return callback({ status: 'Unauthorized', message: 'Invalid main session signature' });
    }
    // Search for the session with the provided IK and update the keys in it.
    const sessionIndex = user.sessions.findIndex((session) => session.IK === payload.keyBundle.IK);
    if (sessionIndex === -1) {
      return callback({ status: "Not Found", message: "IK doesn\'t match a valid session" });
    }
    user.sessions[sessionIndex] = { ...user.sessions[sessionIndex], ...payload.keyBundle };
  }
  // Update the authenticated user.
  const newUser = user.save();
  // Validate response
  if (validUser(newUser))
    return callback({ status: 'Ok' });
  else
    return callback({ status: 'Bad Request', message: 'Update failed' });
}

/** 
 * Sends back a key bundle for the request user.
*/
async function onKeysRequest(payload: { username: string, allSessions?: boolean; }, socket: ISessionSocket, callback: any) {
  // find the requested user
  let user = await UserModel.findOne({ username: payload.username });
  if (!user) {
    return callback({ status: "Bad Request", message: "Requested user not found" });
  }

  // Check if the socket is associated with a session.
  if (!socket.data.socketId) {
    return callback({ status: 'Unauthorized', message: 'Socket connection not associated with a session' });
  }

  if (payload.allSessions) {
    // validate all the sessions the user owns
    for (let session of user.sessions) {
      if (!session || !validSession(session)) {
        return callback({ status: 'Not Found', message: 'User has invalid sessions' });
      }
    }
    // create a list of keyBundles
    let keyBundles: IReceivedKeyBundle[] = [];
    for (let session of user.sessions) {
      if (session.IK !== socket.data.sessionId) {
        keyBundles.push({
          IK: session.IK,
          SPK: session.SPK,
          OPK: session.OPKs.length > 0 ? session.OPKs.splice(0, 1)[0] : undefined,
        });
      }
    }
    return callback({
      status: 'Ok',
      data: keyBundles,
    });
  } else {
    // get the main session
    const mainSessionIndex = user.sessions.findIndex(session => session.main);
    const mainSession = user.sessions[mainSessionIndex];
    if (!mainSession || !validSession(mainSession)) {
      return callback({ status: 'Not Found', message: 'User has no active session' });
    }
    // create a key bundle containing IK, spk, and an opk.
    let keyBundle: IReceivedKeyBundle = {
      IK: mainSession.IK,
      SPK: mainSession.SPK,
      OPK: mainSession.OPKs.length > 0 ? mainSession.OPKs.splice(0, 1)[0] : undefined,
    };
    // update the users main session
    user.sessions[mainSessionIndex] = mainSession;
    const newUser = user.save();
    // validate update
    if (!validUser(newUser)) {
      return callback({ status: 'Bad Request', message: 'Failed to update the user\'s session or keys' });
    }
    return callback({
      status: 'Ok',
      data: keyBundle,
    });
  }
}

/**
 * Simply sends the message to the user specified or stores it in a queue 
 * if the user is not connected.
 */
async function onMessage(payload: { message: IMessage | IInitialMessage; }, io: Server, socket: ISessionSocket, callback: any) {

  // Check if the socket is associated with a session.
  if (!socket.data.socketId) {
    return callback({ status: 'Unauthorized', message: 'Socket connection not associated with a session' });
  }

  // send the message
  const sockets = await io.fetchSockets();
  const receiverSocket = sockets.find((socket) => socket.data.username === payload.message.to && socket.data.sessionId === payload.message.IK);
  // if not found save the message.
  if (!receiverSocket) {
    let messages = await redisClient.get(`${payload.message.to}:${socket.data.sessionId}:messages`);
    if (!messages) {
      await redisClient.set(`${payload.message.to}:${socket.data.sessionId}:messages`, JSON.stringify({ messages: [payload] }));
    } else {
      const parsedMessages: { messages: IMessage[] } = JSON.parse(messages);
      const newMessages = [...(parsedMessages.messages || []), payload];
      await redisClient.set(`${payload.message.to}:${socket.data.sessionId}:messages`, JSON.stringify({ messages: newMessages }));
    }
  } else {
    // send the message
    receiverSocket.emit("message", payload);
  }
  // emit message back to sender
  socket.emit("message", payload);
}


/**
 *  Check if the session has few OPKs and if they need to be refiled.
 */
async function onKeysCheck(payload: { sessionID: string }, socket: ISessionSocket, callback: any) {
  // get the authenticated user 
  const user = await UserModel.findOne({ username: socket.request.user.username });
  if (!user) {
    return callback({
      status: "Not Found",
      message: "User not found"
    });
  }

  // search for the request session
  const session = user.sessions.find((session) => session.IK === payload.sessionID);
  if (!session) {
    return callback({
      status: "Not Found",
      message: "Session not registered"
    });
  }

  return callback({
    status: "Ok",
    needKeys: session.OPKs.length === 0
  });
}

/**
 * Logs disconnected users
 */
function onDisconnect(socket: ISessionSocket, reason: any) {
  logger.info(
    "socket #id: " + socket.id + " disconnected with reason: " + reason,
  );
}


// **** Export default **** //

export default handler;
