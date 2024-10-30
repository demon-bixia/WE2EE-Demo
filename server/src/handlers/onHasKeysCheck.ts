import type { ISessionSocket } from "@src/types/types";

import { UserModel } from "@src/models";
import { callbackResponse } from "@src/utils";

import logger from "jet-logger";

/**
 *  Check if the other user has keys.
 */
async function onHasKeysCheck(
  payload: { username: string },
  socket: ISessionSocket,
  callback: any
) {
  // get the requested user
  const user = await UserModel.findOne({
    username: payload.username,
  });
  if (!user) {
    const message = "onHasKeysCheck: User not found";
    logger.err(message);
    return callbackResponse(callback, {
      status: "Not Found",
      message,
    });
  }

  // check if the user has any session
  if (user.sessions.length <= 0) {
    return callbackResponse(callback, {
      status: "Ok",
      canSend: false,
    });
  }

  return callbackResponse(callback, {
    status: "Ok",
    canSend: true,
  });
}

// **** Default export  **** //

export default onHasKeysCheck;
