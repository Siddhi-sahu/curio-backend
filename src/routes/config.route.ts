import { Router } from "express";
import { db } from "../db/index.js";
import { sources, topics } from "../db/schema.js";

const configRouter = Router();

configRouter.get("/", async (req, res) => {
    try {
        const allSources = await db.select().from(sources);
        const allTopics = await db.select().from(topics);

        res.json({
        sources: allSources.map(s => ({ id: s.id, name: s.name, logoUrl: s.logoUrl })),
        topics: allTopics.map(t => ({ id: t.id, name: t.name })),
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to load configuration data" });
    }
});

export default configRouter;