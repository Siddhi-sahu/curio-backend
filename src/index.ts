//Startup file connecting to local Redis on boot.

import app from "./app.js";
import { connectRedis } from "./lib/redis.js";
import * as dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 8000;

const startServer = async () => {
    try {
        await connectRedis();
        app.listen(PORT, () => {
        console.log(`Curio Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();