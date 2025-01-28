# Redis Tutorial

A simple Node.js application demonstrating how to integrate Redis as a caching layer to optimize API responses. The project fetches data from the GitHub API, caches the data in Redis for a specified period, and serves cached responses when available, reducing the load on the GitHub API.

## Features

- Fetches GitHub user data (e.g., the number of public repositories).
- Caches the response in Redis for 1 hour (3600 seconds).
- Implements error handling for both Redis and GitHub API operations.
- Middleware for checking cache before making external API calls.

---

## Prerequisites

Ensure you have the following installed:

1. **Node.js** (v16 or later)
2. **Redis** (running locally or on a remote server)
3. **npm** (comes with Node.js)

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/colinmarklubembe/redis-tutorial
cd redis-tutorial
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Redis Server

If Redis is installed locally, start the Redis server:
```bash
redis-server
```
If using a remote Redis server, ensure you have the correct `REDIS_PORT` and connection details.

### 4. Create Environment Variables
Create a `.env` file in the project root and define the following variables:
```env
PORT=5000
REDIS_PORT=6379
```
Adjust the `PORT` and `REDIS_PORT` values as needed.

### 5. Start the Application
```bash
npm run dev
```
This will start the server on the specified `PORT` (default: 5000).

---

## API Endpoints

### 1. **Get GitHub Repositories for a User**
**Endpoint:** `/repos/:username`

- **Method:** GET
- **Parameters:**
  - `username` (required): GitHub username
- **Description:**
  - Checks Redis for cached data. If found, serves the cached response.
  - If not cached, fetches data from the GitHub API, caches it in Redis, and serves the response.

#### Example Request
```bash
GET http://localhost:5000/repos/octocat
```

#### Example Response
```html
<h2>octocat has 8 public repositories on GitHub</h2>
```

---

## Code Overview

### Key Components

1. **Redis Client Setup:**
   ```typescript
   const client = createClient({
     socket: { port: Number(REDIS_PORT) },
   });

   client.on("error", (err) => console.error("Redis Client Error:", err));

   (async () => {
     try {
       await client.connect();
       console.log("🔗 Connected to Redis");
     } catch (error) {
       console.error("❌ Failed to connect to Redis:", error);
     }
   })();
   ```

2. **Cache Middleware:**
   ```typescript
   const cache = async (
     req: express.Request,
     res: express.Response,
     next: express.NextFunction
   ) => {
     try {
       const { username } = req.params;

       const cachedData = await client.get(username);

       if (cachedData) {
         console.log(`Cache hit for user: ${username}`);
         res.send(setResponse(username, Number(cachedData)));
       } else {
         console.log(`Cache miss for user: ${username}`);
         next();
       }
     } catch (error) {
       console.error("Redis cache error:", error);
       next();
     }
   };
   ```

3. **GitHub API Fetching:**
   ```typescript
   const getRepos = async (req: express.Request, res: express.Response) => {
     try {
       console.log("Fetching data...");
       const { username } = req.params;

       const response = await fetch(`https://api.github.com/users/${username}`);
       const data = await response.json();

       if (response.ok && data.public_repos !== undefined) {
         const repos = data.public_repos;

         await client.setEx(username, 3600, String(repos));

         res.send(setResponse(username, repos));
       } else {
         res.status(404).send(`<h2>User ${username} not found</h2>`);
       }
     } catch (error) {
       console.error("Error fetching data:", error);
       res.status(500).json({ error: "Internal server error" });
     }
   };
   ```

4. **Set Response Helper Function:**
   ```typescript
   const setResponse = (username: string, repos: number) => {
     return `<h2>${username} has ${repos} public repositories on GitHub</h2>`;
   };
   ```

5. **Routes:**
   ```typescript
   app.get("/repos/:username", cache, getRepos);
   ```

---

## Error Handling

1. **Redis Connection Errors:**
   - The application logs errors if the Redis client fails to connect or perform operations, ensuring the app does not crash.
   - On Redis failure, the app fetches data directly from the GitHub API.

2. **GitHub API Errors:**
   - Returns a `404` status if the username is not found.
   - Returns a `500` status if an internal server error occurs.

---

## Testing the Application

1. Start the Redis server locally or ensure remote Redis is accessible.
2. Run the app and test using the following steps:

- **Cache Miss:**
  - Access a GitHub username for the first time.
  - Observe that the app fetches data from the GitHub API and logs "Cache miss."

- **Cache Hit:**
  - Access the same username again.
  - Observe that the app serves data from Redis and logs "Cache hit."

- **Error Scenarios:**
  - Stop the Redis server and test the fallback mechanism.

---

## Contributing

Feel free to fork this repository, make your improvements, and create a pull request. Suggestions are always welcome!

