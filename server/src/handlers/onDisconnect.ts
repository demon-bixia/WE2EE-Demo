import logger from "jet-logger";
import { ISessionSocket } from "@src/handlers/types/types";

/*
	* handles disconnecting users from the socket server.
	* */
function onDisconnect(socket:ISessionSocket, reason: any) {
  logger.info(
    "socket #id: " + socket.id + " disconnected with reason: " + reason,
  );
}


// **** Export default **** //

export default onDisconnect;

