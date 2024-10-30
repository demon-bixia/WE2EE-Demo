import "express-async-errors";
import type { ISessionSocket } from "./types/types";

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { createServer } from "http";
import logger from "jet-logger";
import morgan from "morgan";
import { Server } from "socket.io";

import Paths from "@src/constants/Paths";
import BaseRouter from "@src/routes/router";

import EnvVars from "@src/constants/EnvVars";
import HttpStatusCodes from "@src/constants/HttpStatusCodes";
import { NodeEnvs } from "@src/constants/misc";
import { RouteError } from "@src/errors";

import onConnection from "@src/handlers/onConnection";
import { WSAuthenticateToken } from "@src/middlewares";

// **** Setup **** //

const app = express();

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
app.use(
  cors({
    origin: EnvVars.CORS.AllowOrigin,
    methods: ["GET", "POST"],
    optionsSuccessStatus: EnvVars.CORS.OptionsSuccessStatus,
  })
);

// Websocket server
const server = createServer(app);
export const io = new Server(server, {
  // CORS
  cors: {
    origin: EnvVars.CORS.AllowOrigin,
    optionsSuccessStatus: EnvVars.CORS.OptionsSuccessStatus,
  },
});
// Share user context with socket.io server
io.engine.use(WSAuthenticateToken);

// Add websocket event handlers
io.on("connection", (socket) => onConnection(io, socket as ISessionSocket));

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
    next: NextFunction
  ) => {
    if (EnvVars.NodeEnv !== NodeEnvs.Test.valueOf()) {
      logger.err(err, true);
    }
    let status = HttpStatusCodes.BAD_REQUEST;
    if (err instanceof RouteError) {
      status = err.status;
    }
    return res.status(status).json({ error: err.message });
  }
);

// **** Default export  **** //

export default server;
