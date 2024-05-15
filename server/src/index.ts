import dotenv from 'dotenv';
import logger from 'jet-logger';
import path from 'path';
import { parse } from 'ts-command-line-args';

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { createServer } from "http";
import morgan from "morgan";
import { Server } from "socket.io";

import "express-async-errors";

import Paths from "@src/constants/Paths";
import BaseRouter from "@src/routes";

import { cache, db } from '@src/connections';
import EnvVars from '@src/constants/EnvVars';
import HttpStatusCodes from "@src/constants/HttpStatusCodes";
import { NodeEnvs } from "@src/constants/misc";
import { RouteError } from "@src/errors";

import handler from "@src/handlers";
import { WSAuthenticateToken } from "@src/middlewares";


// **** Types **** //

interface IArgs {
  env: string;
}


// **** Variables **** //

const app = express();


// **** Setup **** //

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

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(EnvVars.CookieProps.Secret));
// Show routes called in console during development
if (EnvVars.NodeEnv === NodeEnvs.Dev.valueOf()) {
  app.use(morgan("dev"));
}
// Security
if (EnvVars.NodeEnv === NodeEnvs.Production.valueOf()) {
  app.use(helmet());
}
// CORS middleware
app.use(cors({
  origin: EnvVars.CORS.AllowOrigin,
  optionsSuccessStatus: EnvVars.CORS.OptionsSuccessStatus,
}));

// Websocket server
const server = createServer(app);
export const io = new Server(server, {
  // CORS
  cors: {
    origin: EnvVars.CORS.AllowOrigin,
    optionsSuccessStatus: EnvVars.CORS.OptionsSuccessStatus,
  }
});
// Share user context with socket.io server
io.engine.use(WSAuthenticateToken);
// Add websocket event handlers
io.on("connection", (socket) => handler(io, socket));


// **** Routes **** //

// Add APIs, must be after middleware
app.use(Paths.Base, BaseRouter);
// Add error handler
app.use(
  (
    err: Error,
    _: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction,
  ) => {
    if (EnvVars.NodeEnv !== NodeEnvs.Test.valueOf()) {
      logger.err(err, true);
    }
    let status = HttpStatusCodes.BAD_REQUEST;
    if (err instanceof RouteError) {
      status = err.status;
    }
    return res.status(status).json({ error: err.message });
  },
);


// **** Start App **** //

// Connect to database
db();
// Connect to cache store
cache();
// Run server
const SERVER_START_MSG = ('Express server started on port: ' + EnvVars.Port.toString());
server.listen(EnvVars.Port, () => logger.info(SERVER_START_MSG));
