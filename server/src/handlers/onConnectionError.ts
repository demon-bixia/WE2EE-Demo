import logger from "jet-logger";


/**
 *  Logs connection errors
 */
function onConnectionError(error: Error) {
  logger.err(error.message);
}


// **** Default export  **** //

export default onConnectionError
