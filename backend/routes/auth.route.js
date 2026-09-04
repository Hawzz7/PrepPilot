import express from "express";
import { googleAuth, logout, refreshAccessToken } from "../controllers/auth.controller.js";

const authRouter = express.Router();

// Google authentication route
authRouter.post("/google", googleAuth);

// Refresh token route
authRouter.post("/refresh", refreshAccessToken);

// logout route
authRouter.post("/logout", logout);

export default authRouter;