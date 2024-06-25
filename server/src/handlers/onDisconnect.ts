import logger from "jet-logger";
import type { ISessionSocket } from "@src/types/types";


/**
 * Logs disconnected users
 */
function onDisconnect(socket: ISessionSocket, reason: any) {
  logger.info(
    "socket #id: " + socket.id + " disconnected with reason: " + reason,
  );
}


// **** Default export  **** //

export default onDisconnect;
