import { createClient } from "redis";
import * as dotenv from "dotenv";
dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const isSecure = redisUrl.startsWith("rediss://");

export const redisClient = createClient({
  url: redisUrl,
  ...(isSecure ? {
    socket: {
      tls: true,
      rejectUnauthorized: false
    }
  } : {})
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("Connected to Redis");
  }
};