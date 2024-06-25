import dotenv from 'dotenv';

import path from 'path';
import { parse } from 'ts-command-line-args';


// **** Types **** //

interface IArgs {
  env: string;
}


// **** Environment Variables **** //

// Command line arguments
const args = parse<IArgs>({
  env: {
    type: String,
    defaultValue: 'development',
    alias: 'e',
  },
});

// Set the env file
const result2 = dotenv.config({
  path: path.join(__dirname, `../env/${args.env}.env`),
});
if (result2.error) {
  throw result2.error;
}
