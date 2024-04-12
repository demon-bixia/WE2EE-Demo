import envVars from '@src/constants/EnvVars';
import logger from 'jet-logger';
import mongoose from 'mongoose';


/**
 * Connect to mongodb
 * @returns Promise<void>
 */
async function connect() {
  mongoose.set('strictQuery', false);
  try {
    await mongoose.connect(envVars.Mongo.connectionString);
    logger.info("Successfully connected to mongodb.");
  } catch (error) {
    if (error) {
      logger.err('Connection to mongodb failed with error:');
      throw error;
    }
  }
}

/**
 * ends connection with mongodb 
 * @returns Promise<void>
 */
async function disconnect() {
  await mongoose.disconnect();
}


// **** Export default **** //

export default {
  connect,
  disconnect
} as const;
