import type { IReq, IRes } from "@src/types/express/misc";

import { Router } from "express";

import HttpStatusCodes from "@src/constants/HttpStatusCodes";
import Paths from "@src/constants/Paths";
import { UserModel } from "@src/models";
import { generateAccessToken } from "@src/utils";

// **** Functions **** //

/**
 * Clears the sessions for all users in the database
 */
async function clearSessions(req: IReq, res: IRes) {
  // find all users in the database.
  const result = await UserModel.updateMany(
    {}, // No filter, apply to all documents
    { sessions: [] }
  );

  if (!result.acknowledged) {
    return res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to clear sessions" })
      .end();
  }

  return res
    .status(HttpStatusCodes.OK)
    .json({ message: "Sessions cleared" })
    .end();
}

// **** Add Routes **** //

// Test router
const testRouter = Router();

// Clear database route.
testRouter.get(Paths.Test.ClearSessions, clearSessions);

// **** Export default **** //

export default testRouter;
