# Curio Backend

Curio is an AI-powered news aggregator backend (similar to Inshorts) that allows users to register, select their favorite news portals (sources), select their topics of interest, and view a personalized feed of summarized news articles.

## 🚀 Key Features
*   **Authentication (Better Auth)**: Supports email/password sign-up/sign-in and Google OAuth with session token storage in PostgreSQL.
*   **Database (PostgreSQL + Drizzle ORM)**: Stores users, preferences, portals catalog, RSS configurations, and compiled articles.
*   **Decoupled Sync & Scraping**: Periodically parses RSS feeds, scrapes full articles (using Mozilla Readability to strip ads/navs), and processes summaries.
*   **Structured AI Summaries**: Uses Groq SDK running `llama-3.1-8b-instant` in JSON mode to generate clean 2-3 sentence summaries and refined titles.
*   **Caching (Redis)**: Caches compiled personalized user news feeds in Redis with a **12-hour TTL** to achieve sub-10ms response times.
*   **Non-blocking API**: GET `/api/news` fetches from the DB instantly. If empty, it triggers an async background feed sync, keeping the API fast.

---

## 🛠️ Local Installation & Setup

### Prerequisites
Make sure you have Node.js (v18+), Docker, and Git installed.

1. **Verify Local Docker Databases are Active**:
   Ensure your local PostgreSQL container is running on port `5432` and Redis is running on port `6379`.
   ```bash
   # Run Postgres if not active
   docker run --name curio-postgres -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres
   
   # Run Redis if not active
   docker run --name curio-redis -d -p 6379:6379 redis
   ```

2. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the project:
   ```env
   PORT=8000
   NODE_ENV=development
   DATABASE_URL=postgres://postgres:password@localhost:5432/postgres
   REDIS_URL=redis://localhost:6379
   GROQ_API_KEY=
   BETTER_AUTH_SECRET=
   BETTER_AUTH_URL=http://localhost:8000
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   CRON_SECRET=default_cron_secret
   ```

4. **Initialize Database Tables & Seed Configurations**:
   ```bash
   # Generate Drizzle migration files
   npm run db:generate

   # Push Drizzle schema tables to Postgres
   npm run db:push

   # Seed initial Sources, Topics, and RSS Feed URLs
   npm run db:seed
   ```

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The backend will start running at `http://localhost:8000` and connect to your database and Redis server.

---

## 🧪 Testing the Backend

### Method A: Automated E2E Test Flow
You can execute the built-in end-to-end flow script which automates user registration, logins, configuring preferences, scraping, summarizing, and cache hits.

In a separate terminal window, run:
```bash
npx tsx src/test-flow.ts
```

### Method B: Manual Testing with Postman
For manual API testing, see the detailed Postman testing steps below.

---

## 📋 API Endpoints Reference

### 1. Authentication (Better Auth)
*   **POST `/api/auth/sign-up/email`** (User Signup)
    *   **Body (JSON)**:
        ```json
        {
          "email": "user@example.com",
          "password": "strongpassword123",
          "name": "Alex Mercer"
        }
        ```
    *   **Response**: Returns the `user` and `session` token, and sets the session cookie.
*   **POST `/api/auth/sign-in/email`** (User Login)
    *   **Body (JSON)**:
        ```json
        {
          "email": "user@example.com",
          "password": "strongpassword123"
        }
        ```
*   **POST `/api/auth/sign-out`** (Sign Out Session)

### 2. Configurations & Preferences Catalog
*   **GET `/api/config`** (Retrieve portal config metadata to display choices)
    *   **Response**:
        ```json
        {
          "sources": [{"id": "bbc", "name": "BBC News", "logoUrl": "..."}],
          "topics": [{"id": "technology", "name": "Technology"}]
        }
        ```
*   **GET `/api/preferences`** (Read user selected preferences)
    *   **Headers**: `Authorization: Bearer <session_token>`
*   **POST `/api/preferences`** (Save onboarding checkbox choices)
    *   **Headers**: `Authorization: Bearer <session_token>`
    *   **Body (JSON)**:
        ```json
        {
          "sourceIds": ["bbc", "indian_express"],
          "topicIds": ["technology"]
        }
        ```

### 3. News Feed & Syncing
*   **GET `/api/news`** (Load personalized news summaries)
    *   **Headers**: `Authorization: Bearer <session_token>`
    *   **Response**: Caches the response payload in Redis for 12 hours on a cache miss. Subsequent loads pull from cache instantly.
*   **POST `/api/news/sync`** (Trigger full RSS feed check, scraping, Llama summarization, and cache clearing)
    *   **Query Params**: `?secret=default_cron_secret` (or Authorization header `Bearer default_cron_secret`)
    *   **Response**: Triggers in the background asynchronously so the client HTTP thread doesn't hang.
