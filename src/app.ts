import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import preferencesRouter from "./routes/preferences.route.js";
import newsRouter from "./routes/news.route.js";
import configRouter from "./routes/config.route.js";

const app = express();

app.use(cors({
    origin: true,
    credentials: true,
}));

// Mount Better Auth router BEFORE body-parsing middleware to prevent hanging requests
app.use("/api/auth", authRouter);

app.use(express.json());

// Mount other routers
app.use("/api/preferences", preferencesRouter);
app.use("/api/news", newsRouter);
app.use("/api/config", configRouter);

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});

export default app;