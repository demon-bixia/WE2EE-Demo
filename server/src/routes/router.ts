import { Router } from "express";

import Paths from "@src/constants/Paths";
import authRouter from "@src/routes/authRoutes";
import testRouter from "@src/routes/testRoutes";

// **** Add Routes **** //

// Base routes
const BaseRouter = Router();

// Add AuthRouter
BaseRouter.use(Paths.Auth.Base, authRouter);

// Add TestRouter
BaseRouter.use(Paths.Test.Base, testRouter);

// **** Export default **** //

export default BaseRouter;
