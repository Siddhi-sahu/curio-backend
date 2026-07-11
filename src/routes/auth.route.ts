import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth.js";

const authRouter = Router();

authRouter.use(toNodeHandler(auth));

export default authRouter;