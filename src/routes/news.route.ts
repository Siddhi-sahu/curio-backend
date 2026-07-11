import { Router } from "express";
import { auth } from "../lib/auth.js";
import { db } from "../db/index.js";
import { userSources, userTopics } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { redisClient } from "../lib/redis.js";
import { fetchPersonalizedFeed } from "../services/news.service.js";

const newsRouter = Router();

const requireAuth = async (req: any, res: any, next: any) => {
    const session = await auth.api.getSession({
        headers: req.headers,
    });

    if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = session.user;
    next();
};

newsRouter.get("/", requireAuth, async (req: any, res) => {
    const cacheKey = `user:feed:${req.user.id}`;
    const CACHE_TTL = 12 * 60 * 60; // 12 hours in seconds

    try {
        // 1. Try fetching from Redis Cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
        console.log(`⚡ Redis cache hit for user ${req.user.id}`);
        return res.json(JSON.parse(cachedData));
        }

        console.log(`Cache miss. Fetching from feeds/DB for user ${req.user.id}`);

        // 2. Fetch user preferences
        const selectedSources = await db
        .select({ sourceId: userSources.sourceId })
        .from(userSources)
        .where(eq(userSources.userId, req.user.id));

        const selectedTopics = await db
        .select({ topicId: userTopics.topicId })
        .from(userTopics)
        .where(eq(userTopics.userId, req.user.id));

        const sourceIds = selectedSources.map(s => s.sourceId);
        const topicIds = selectedTopics.map(t => t.topicId);

        if (sourceIds.length === 0 || topicIds.length === 0) {
        return res.json({
            message: "Welcome to Curio! Please select your preferences to see your feed.",
            articles: [],
        });
    }

    // 3. Process aggregation
    const newsfeed = await fetchPersonalizedFeed(req.user.id, sourceIds, topicIds);

    const responsePayload = {
        user: req.user.id,
        count: newsfeed.length,
        articles: newsfeed,
    };

    // 4. Cache response in Redis for 12 hours
    await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
        EX: CACHE_TTL,
    });
    res.json(responsePayload);

    } catch (error) {
        console.error("News retrieval error:", error);
        res.status(500).json({ error: "Failed to load personalized news feed." });
    }
});

export default newsRouter;