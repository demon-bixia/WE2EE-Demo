import envVars from '@src/constants/EnvVars';
import logger from 'jet-logger';
import mongoose from 'mongoose';
import UserModel from '@src/models/UserModel';

/**
 * Connect to mongodb
 * @returns Promise<void>
 */
async function connect() {
  mongoose.set('strictQuery', false);
  try {
    await mongoose.connect(envVars.Mongo.connectionString);
    logger.info("Successfully connected to mongodb.");
		
		// setup database inital data automatically
		try {
			const resultA = await UserModel.findOne({username: 'Alice'});
			const resultB = await UserModel.findOne({username: 'Bob'});

			// create Alice
			if (!resultA){
				await UserModel.create({username: 'Alice', password:'Alice', preKeys:[], sessions: []});
			}
			
			// create Bob
			if(!resultB) {
				await UserModel.create({username: 'Bob', password:'Bob', preKeys:[], sessions: []});
			}

			logger.info("Successfully setup inital database data");
		} catch(error) {
			logger.err('setting inital data failed');
			throw error;
		}

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
