import '@src/pre-start'; // Must be the first import
import logger from 'jet-logger';

import EnvVars from '@src/constants/EnvVars';
import server from '@src/server';

import db from '@src/connections/db';
import cache from '@src/connections/cache';


// **** Start App **** //

// Connect to database
db.connect();

// Connect to cache store
cache.connect();

// Run server
const SERVER_START_MSG = ('Express server started on port: ' + EnvVars.Port.toString());
server.listen(EnvVars.Port, () => logger.info(SERVER_START_MSG));
