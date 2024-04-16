import { Router } from 'express';
import jetValidator from 'jet-validator';

import Paths from '@src/constants/Paths';
import { isUser } from '@src/models/UserModel';
import UserRoutes from '@src/routes/UserRoutes';
import AuthRoutes from '@src/routes/AuthRoutes';
import JwtMiddleware from '@src/middlewares/JWTMiddleware';


// **** Variables **** //

const apiRouter = Router();
const validate = jetValidator();


// ** Add UserRouter ** //

const userRouter = Router();

// get one user
userRouter.get(
  Paths.Users.Get,
  UserRoutes.getOne,
);

// Update one user
userRouter.patch(
  Paths.Users.Update,
  validate(['user', isUser]),
  JwtMiddleware.AuthenticateToken,
  UserRoutes.updateOne,
);

// ** Add AuthRouter ** //

const authRouter = Router();

// generate token
authRouter.post(Paths.Auth.GetToken, AuthRoutes.getToken);


// Add UserRouter
apiRouter.use(Paths.Users.Base, userRouter);

// Add AuthRouter
apiRouter.use(Paths.Auth.Base, authRouter);

// **** Export default **** //

export default apiRouter;
