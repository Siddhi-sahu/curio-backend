//Flow coordinator to sync RSS feeds, trigger parsing, scrape pages, trigger Groq summaries, and save data.

import { db } from "../db/index.js";
import { feeds, articles } from "../db/schema.js";
import { parseFeed } from "./rss.service.js";
import { scrapeArticle } from "./scraper.service.js";
import { summarizeArticle } from "./llm.service.js";
import { eq, and, inArray, desc } from "drizzle-orm";
import crypto from "crypto";
import { redisClient } from "../lib/redis.js";

export const syncFeeds = async (feedIds: string[]) => {
    console.log(`🔄 Syncing ${feedIds.length} feeds...`);

    // Query details of feeds
    const feedList = await db
        .select()
        .from(feeds)
        .where(inArray(feeds.id, feedIds));

    // Process all feeds in parallel
    await Promise.all(
        feedList.map(async (feed) => {
            try {
                const rssArticles = await parseFeed(feed.url, 5);

                for (const item of rssArticles) {
                    try {
                        // 1. Check if article already exists
                        const existing = await db
                            .select()
                            .from(articles)
                            .where(eq(articles.url, item.url));

                        if (existing.length > 0) continue; // Already processed

                        console.log(`📰 Scraping & summarizing: ${item.title}`);
                        
                        // 2. Scrape full content & image
                        const scraped = await scrapeArticle(item.url);

                        // 3. Summarize using Groq Llama
                        const result = await summarizeArticle(
                            item.title,
                            scraped.content,
                            item.rssContentSnippet
                        );

                        // 4. Save to DB
                        const articleId = crypto.randomUUID();
                        await db.insert(articles).values({
                            id: articleId,
                            title: result.title,
                            url: item.url,
                            summary: result.summary,
                            content: scraped.content || item.rssContentSnippet,
                            imageUrl: scraped.imageUrl,
                            publishedAt: item.publishedAt || new Date(),
                            sourceId: feed.sourceId,
                            topicId: feed.topicId,
                        }).onConflictDoNothing();
                    } catch (articleError) {
                        console.error(`❌ Error processing article ${item.url}:`, articleError);
                    }
                }
            } catch (feedError) {
                console.error(`❌ Error processing feed ${feed.url}:`, feedError);
            }
        })
    );
};

export const syncAllFeeds = async () => {
    console.log("🔄 Starting full sync for all feeds in DB...");
    const allFeeds = await db.select().from(feeds);
    const feedIds = allFeeds.map((f) => f.id);
    if (feedIds.length > 0) {
        await syncFeeds(feedIds);
        console.log("✅ Full sync complete. Invalidating user feed caches...");
        
        // Scan and delete all user cache keys in Redis
        try {
            const keysToDelete: string[] = [];
            for await (const key of (redisClient.scanIterator({
                MATCH: "user:feed:*",
                COUNT: 100
            }) as any)) {
                keysToDelete.push(key);
            }
            if (keysToDelete.length > 0) {
                await Promise.all(keysToDelete.map(key => redisClient.del(key)));
                console.log(`✅ Invalidated ${keysToDelete.length} user feed caches.`);
            } else {
                console.log("✅ No cache keys to invalidate.");
            }
        } catch (err) {
            console.error("❌ Error invalidating redis caches:", err);
        }
    }
};

export const fetchPersonalizedFeed = async (userId: string, sourceIds: string[], topicIds: string[]) => {
    if (sourceIds.length === 0 || topicIds.length === 0) {
        return [];
    }

    // Load articles from DB instantly
    const results = await db
        .select({
            id: articles.id,
            title: articles.title,
            url: articles.url,
            summary: articles.summary,
            imageUrl: articles.imageUrl,
            publishedAt: articles.publishedAt,
            sourceId: articles.sourceId,
            topicId: articles.topicId,
        })
        .from(articles)
        .where(
            and(
                inArray(articles.sourceId, sourceIds),
                inArray(articles.topicId, topicIds)
            )
        )
        .orderBy(desc(articles.publishedAt))
        .limit(30);

    // If no articles exist for these preferences, trigger a background sync so the database gets populated
    if (results.length === 0) {
        const matchingFeeds = await db
            .select()
            .from(feeds)
            .where(
                and(
                    inArray(feeds.sourceId, sourceIds),
                    inArray(feeds.topicId, topicIds)
                )
            );

        const feedIds = matchingFeeds.map(f => f.id);
        if (feedIds.length > 0) {
            console.log(`⚠️ Database is empty for selected preferences. Triggering background sync for user ${userId}...`);
            // Run asynchronously without awaiting, keeping response time under a few ms!
            syncFeeds(feedIds).catch(err => {
                console.error("❌ Background feed sync failed:", err);
            });
        }
    }

    return results;
};