import { Router } from 'express';

import Paths from '@src/constants/Paths';
import authRouter from '@src/routes/authRoutes';


// **** Add Routes **** //

// Base routes
const BaseRouter = Router();

// Add AuthRouter
BaseRouter.use(Paths.Auth.Base, authRouter);


// **** Export default **** //

export default BaseRouter
