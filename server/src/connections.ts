import envVars from '@src/constants/EnvVars';
import { UserModel } from '@src/models';
import logger from 'jet-logger';
import mongoose from 'mongoose';
import { createClient, RedisClientType } from 'redis';


// **** Variables **** //

export let redisClient: RedisClientType;


// **** Functions **** //

/**
 * starts a connection with redis store
 * @returns Promise<RedisClientType>
 */
export async function cache() {
  redisClient = createClient({ url: envVars.Redis.connectionString });

  redisClient.on('error', error => logger.err('Connection to redis failed with error:', error));
  redisClient.on('ready', () => logger.info('Successfully connected to redis'));

  await redisClient.connect();

  return redisClient;
}

/**
 * Connect to mongodb
 * @returns Promise<void>
 */
export async function db() {
  mongoose.set('strictQuery', false);
  try {
    await mongoose.connect(envVars.Mongo.connectionString);
    logger.info("Successfully connected to mongodb.");
    // setup database initial data automatically
    try {
      const resultA = await UserModel.findOne({ username: 'Alice' });
      const resultB = await UserModel.findOne({ username: 'Bob' });
      // create Alice
      if (!resultA) {
        await UserModel.create({ username: 'Alice', password: 'Alice', OPKs: [], sessions: [] });
      }
      // create Bob
      if (!resultB) {
        await UserModel.create({ username: 'Bob', password: 'Bob', OPKs: [], sessions: [] });
      }
      logger.info("Successfully setup initial database data");
    } catch (error) {
      logger.err('Setting initial data failed');
      throw error;
    }
  } catch (error) {
    if (error) {
      logger.err('Connection to mongodb failed with error:');
      throw error;
    }
  }
}
