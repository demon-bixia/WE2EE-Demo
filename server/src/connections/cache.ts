import envVars from '@src/constants/EnvVars';
import logger from 'jet-logger';
import { createClient, RedisClientType } from 'redis';


// **** Variables **** //

export let redisClient: RedisClientType;


// **** Functions **** //

/**
 * starts a connection with redis store
 * @returns Promise<RedisClientType>
 */
async function cache() {
  redisClient = createClient({ url: envVars.Redis.connectionString });

  redisClient.on('error', error => logger.err('Connection to redis failed with error:', error));
  redisClient.on('ready', () => logger.info('Successfully connected to redis'));

  await redisClient.connect();

  return redisClient;
}


// **** Default export  **** //

export default cache;
