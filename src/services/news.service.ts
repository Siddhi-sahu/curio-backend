//Flow coordinator to sync RSS feeds, trigger parsing, scrape pages, trigger Groq summaries, and save data.

import { db } from "../db/index.js";
import { feeds, articles } from "../db/schema.js";
import { parseFeed } from "./rss.service.js";
import { scrapeArticle } from "./scraper.service.js";
import { summarizeArticle } from "./llm.service.js";
import { eq, and, inArray, desc } from "drizzle-orm";
import crypto from "crypto";

export const syncFeeds = async (feedIds: string[]) => {
    console.log(`Syncing ${feedIds.length} feeds...`);

    // Query details of feeds
    const feedList = await db
        .select()
        .from(feeds)
        .where(inArray(feeds.id, feedIds));

    for (const feed of feedList) {
        const rssArticles = await parseFeed(feed.url, 5);

        for (const item of rssArticles) {
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
        }
    }
};

export const fetchPersonalizedFeed = async (userId: string, sourceIds: string[], topicIds: string[]) => {
    if (sourceIds.length === 0 || topicIds.length === 0) {
        return [];
    }

    // Find all RSS feeds mapping the selected sources & topics
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

    // Sync these feeds inline so the user has the newest articles
    if (feedIds.length > 0) {
        await syncFeeds(feedIds);
    }

    // Load articles from DB
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

    return results;
};