import logger from "jet-logger";


/**
 *  Logs connection errors
 */
async function onConnectionError(error: Error) {
  logger.err(error.message);
}


// **** Default export  **** //

export default onConnectionError
