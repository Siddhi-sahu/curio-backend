//Scrapes full article bodies using Mozilla Readability and images from Open Graph meta.

import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

interface ScrapedArticle {
    content: string;
    imageUrl: string | null;
}

export const scrapeArticle = async (url: string): Promise<ScrapedArticle> => {
    try {
        const response = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
        timeout: 10000,
    });

    const dom = new JSDOM(response.data, { url });
    const doc = dom.window.document;

    // 1. Extract cover image from Open Graph or Twitter metadata
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
    const twitterImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
    const articleImage = doc.querySelector('link[rel="image_src"]')?.getAttribute("href");
    const imageUrl = ogImage || twitterImage || articleImage || null;

    // 2. Extract article body using Mozilla Readability
    const reader = new Readability(doc);
    const parsedArticle = reader.parse();

    // Clean up content snippet if readability failed
    const content = parsedArticle?.textContent
        ? parsedArticle.textContent.replace(/\s+/g, " ").trim()
        : "";

        return {
        content,
        imageUrl,
        };
    } catch (error) {
        console.error(`Error scraping article from ${url}:`, error);
        return {
        content: "",
        imageUrl: null,
        };
    }
};