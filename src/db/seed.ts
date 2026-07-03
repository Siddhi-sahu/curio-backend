import { db } from "./index.js";
import { sources, topics, feeds } from "./schema.js";

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Seed Topics
  const topicData = [
    { id: "technology", name: "Technology" },
    { id: "business", name: "Business" },
    { id: "sports", name: "Sports" },
    { id: "politics", name: "Politics" },
    { id: "india", name: "India" }
  ];

  for (const t of topicData) {
    await db.insert(topics).values(t).onConflictDoNothing();
  }
  console.log("✅ Seeded Topics.");

  // 2. Seed Sources
  const sourceData = [
    { id: "bbc", name: "BBC News", logoUrl: "https://logos-world.net/wp-content/uploads/2021/12/BBC-Logo.png" },
    { id: "the_hindu", name: "The Hindu", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/eb/The_Hindu_logo.png" },
    { id: "indian_express", name: "Indian Express", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b7/The_Indian_Express_Logo.png" },
    { id: "livemint", name: "Livemint", logoUrl: "https://logos-world.net/wp-content/uploads/2023/02/Mint-Logo.png" }
  ];

  for (const s of sourceData) {
    await db.insert(sources).values(s).onConflictDoNothing();
  }
  console.log("✅ Seeded Sources.");

  // 3. Seed Feeds (RSS URLs linking Source & Topic)
  const feedData = [
    // Indian Express Feeds
    { id: "ie-tech", sourceId: "indian_express", topicId: "technology", url: "https://indianexpress.com/section/technology/feed/" },
    { id: "ie-biz", sourceId: "indian_express", topicId: "business", url: "https://indianexpress.com/section/business/feed/" },
    { id: "ie-sports", sourceId: "indian_express", topicId: "sports", url: "https://indianexpress.com/section/sports/feed/" },
    { id: "ie-india", sourceId: "indian_express", topicId: "india", url: "https://indianexpress.com/section/india/feed/" },

    // Livemint Feeds
    { id: "lm-tech", sourceId: "livemint", topicId: "technology", url: "https://www.livemint.com/rss/technology" },
    { id: "lm-biz", sourceId: "livemint", topicId: "business", url: "https://www.livemint.com/rss/companies" },
    { id: "lm-sports", sourceId: "livemint", topicId: "sports", url: "https://www.livemint.com/rss/sports" },
    { id: "lm-politics", sourceId: "livemint", topicId: "politics", url: "https://www.livemint.com/rss/politics" },

    // BBC Feeds
    { id: "bbc-tech", sourceId: "bbc", topicId: "technology", url: "http://feeds.bbci.co.uk/news/technology/rss.xml" },
    { id: "bbc-biz", sourceId: "bbc", topicId: "business", url: "http://feeds.bbci.co.uk/news/business/rss.xml" },
    { id: "bbc-sports", sourceId: "bbc", topicId: "sports", url: "http://feeds.bbci.co.uk/news/sport/rss.xml" },
    { id: "bbc-india", sourceId: "bbc", topicId: "india", url: "http://feeds.bbci.co.uk/news/world/asia/india/rss.xml" },

    // The Hindu Feeds
    { id: "th-tech", sourceId: "the_hindu", topicId: "technology", url: "https://www.thehindu.com/sci-tech/technology/feeder/default.rss" },
    { id: "th-biz", sourceId: "the_hindu", topicId: "business", url: "https://www.thehindu.com/business/feeder/default.rss" },
    { id: "th-sports", sourceId: "the_hindu", topicId: "sports", url: "https://www.thehindu.com/sport/feeder/default.rss" },
    { id: "th-india", sourceId: "the_hindu", topicId: "india", url: "https://www.thehindu.com/news/national/feeder/default.rss" }
  ];

  for (const f of feedData) {
    await db.insert(feeds).values(f).onConflictDoNothing();
  }
  console.log("✅ Seeded Feeds.");
  console.log("🌱 Database seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});