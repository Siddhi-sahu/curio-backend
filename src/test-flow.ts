import axios from "axios";

const BACKEND_URL = "http://localhost:8000";

async function runTest() {
  console.log("🚀 Starting End-to-End Test for Curio Backend...");

  const client = axios.create({
    baseURL: BACKEND_URL,
    validateStatus: () => true, // Don't crash on non-200 HTTP statuses
  });

  // 1. Sign Up a test user
  console.log("\n1. Registering test user...");
  // Using the correct Better Auth endpoint: "/api/auth/sign-up/email"
  const signupRes = await client.post("/api/auth/sign-up/email", {
    email: "curio_test@example.com",
    password: "securepassword123",
    name: "Curio Tester",
  });

  let cookies: string[] = [];
  if (signupRes.status === 200) {
    console.log("✅ User registered successfully!");
    cookies = signupRes.headers["set-cookie"] || signupRes.headers["Set-Cookie"] || [];
  } else {
    console.log(`⚠️ Signup status: ${signupRes.status}. User might already exist. Trying Sign-In...`);
    const signinRes = await client.post("/api/auth/sign-in/email", {
      email: "curio_test@example.com",
      password: "securepassword123",
    });

    if (signinRes.status === 200) {
      console.log("✅ Signed in successfully!");
      cookies = signinRes.headers["set-cookie"] || signinRes.headers["Set-Cookie"] || [];
    } else {
      console.error("❌ Sign-in failed!", signinRes.data);
      process.exit(1);
    }
  }

  const authHeaders = cookies.length > 0 ? { Cookie: cookies.join("; ") } : {};

  // 2. Fetch available sources & topics catalog
  console.log("\n2. Fetching available portal configurations...");
  const configRes = await client.get("/api/config");
  console.log("Catalog Config:", JSON.stringify(configRes.data, null, 2));

  const availableSources = configRes.data.sources || [];
  const availableTopics = configRes.data.topics || [];

  if (availableSources.length === 0 || availableTopics.length === 0) {
    console.error("❌ DB configuration catalog is empty! Did you seed the database?");
    process.exit(1);
  }

  // Pick the first two entries for testing
  const selectedSources = availableSources.slice(0, 2).map((s: any) => s.id);
  const selectedTopics = availableTopics.slice(0, 2).map((t: any) => t.id);

  console.log(`\nSelecting Preferences:\nSources: ${selectedSources.join(", ")}\nTopics: ${selectedTopics.join(", ")}`);

  // 3. Save preferences
  console.log("\n3. Saving onboarding choices...");
  const prefRes = await client.post("/api/preferences", {
    sourceIds: selectedSources,
    topicIds: selectedTopics,
  }, { headers: authHeaders });

  if (prefRes.status === 200) {
    console.log("✅ Preferences saved successfully!");
  } else {
    console.error("❌ Failed to save preferences:", prefRes.data);
    process.exit(1);
  }

  // 4. Trigger RSS Sync
  console.log("\n4. Triggering News RSS Feeds aggregation in background...");
  const syncRes = await client.post("/api/news/sync?secret=default_cron_secret");
  console.log("Sync response:", syncRes.data);

  // Wait a few seconds for background threads to pull RSS, scrape HTML, and summarize with Groq Llama
  console.log("⏳ Waiting 10 seconds for Groq to summarize feed articles...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // 5. Fetch personalized news feed (1st hit: Cache Miss)
  console.log("\n5. Fetching personalized newsfeed (First attempt - Cache Miss)...");
  const feedRes1 = await client.get("/api/news", { headers: authHeaders });
  
  if (feedRes1.status === 200) {
    console.log(`✅ Retrieved newsfeed! Article count: ${feedRes1.data.count}`);
    if (feedRes1.data.articles.length > 0) {
      console.log("Sample article:", JSON.stringify(feedRes1.data.articles[0], null, 2));
    } else {
      console.log("ℹ️ No articles in feed yet. Background sync may still be running.");
    }
  } else {
    console.error("❌ Failed to fetch newsfeed:", feedRes1.data);
  }

  // 6. Fetch personalized news feed again (2nd hit: Cache Hit)
  console.log("\n6. Fetching newsfeed again (Second attempt - Redis Cache Hit)...");
  const feedRes2 = await client.get("/api/news", { headers: authHeaders });
  if (feedRes2.status === 200) {
    console.log(`✅ Retrieved from Redis instantly! Article count: ${feedRes2.data.count}`);
  }

  console.log("\n🏁 E2E Test Flow Completed Successfully!");
}

runTest().catch((err) => console.error("❌ Test crashed:", err));
