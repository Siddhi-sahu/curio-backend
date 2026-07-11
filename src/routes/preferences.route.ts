import { Router } from "express";
import { db } from "../db/index.js";
import { userSources, userTopics } from "../db/schema.js";
import { auth } from "../lib/auth.js";
import { eq } from "drizzle-orm";
import { redisClient } from "../lib/redis.js";

const preferencesRouter = Router();

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

// GET user saved preferences
preferencesRouter.get("/", requireAuth, async (req: any, res) => {
    try {
        const selectedSources = await db
        .select({ sourceId: userSources.sourceId })
        .from(userSources)
        .where(eq(userSources.userId, req.user.id));

        const selectedTopics = await db
        .select({ topicId: userTopics.topicId })
        .from(userTopics)
        .where(eq(userTopics.userId, req.user.id));

        res.json({
        sources: selectedSources.map((s) => s.sourceId),
        topics: selectedTopics.map((t) => t.topicId),
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user preferences" });
    }
});

// POST user preferences
preferencesRouter.post("/", requireAuth, async (req: any, res) => {
    const { sourceIds, topicIds } = req.body;

    if (!Array.isArray(sourceIds) || !Array.isArray(topicIds)) {
        return res.status(400).json({ error: "Invalid payload. Arrays sourceIds and topicIds are required." });
    }

    try {
        await db.transaction(async (tx) => {
        await tx.delete(userSources).where(eq(userSources.userId, req.user.id));
        await tx.delete(userTopics).where(eq(userTopics.userId, req.user.id));

        if (sourceIds.length > 0) {
            await tx.insert(userSources).values(
            sourceIds.map((sid) => ({
                userId: req.user.id,
                sourceId: sid,
            }))
            );
        }

        if (topicIds.length > 0) {
            await tx.insert(userTopics).values(
            topicIds.map((tid) => ({
                userId: req.user.id,
                topicId: tid,
            }))
            );
        }
        });

        // Invalidate redis cache for user feed
        const cacheKey = `user:feed:${req.user.id}`;
        await redisClient.del(cacheKey);

        res.json({ message: "Preferences updated successfully." });
    } catch (error) {
        console.error("❌ Save preferences error:", error);
        res.status(500).json({ error: "Failed to save user preferences." });
    }
});

export default preferencesRouter;