import { Router } from "express";
import { auth } from "../lib/auth.js";

const authRouter = Router();

authRouter.all("*", (req, res) => {
    return auth.handler(req, res);
});

export default authRouter;