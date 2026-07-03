import Parser from "rss-parser";

const parser = new Parser();

export interface RSSArticle {
    title: string;
    url: string;
    publishedAt: Date | null;
    rssContentSnippet: string;
}

export const parseFeed = async (feedUrl: string, limit = 5): Promise<RSSArticle[]> => {
    try {
        const feed = await parser.parseURL(feedUrl);
        const items = feed.items.slice(0, limit);

        return items.map((item) => {
        let publishedAt: Date | null = null;
        if (item.pubDate) {
            const parsedDate = Date.parse(item.pubDate);
            if (!isNaN(parsedDate)) {
            publishedAt = new Date(parsedDate);
            }
        }

        return {
            title: item.title || "No Title",
            url: item.link || "",
            publishedAt,
            rssContentSnippet: item.contentSnippet || item.content || "",
        };
        });
    } catch (error) {
        console.error(`Error parsing RSS Feed ${feedUrl}:`, error);
        return [];
    }
};