import express from "express";
import { createClient } from "redis";

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const app = express();

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

const setResponse = (username: string, repos: number) => {
  return `<h2>${username} has ${repos} public repositories on GitHub</h2>`;
};

const cache = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { username } = req.params;

    // Attempt to retrieve cached data from Redis
    const cachedData = await client.get(username);

    if (cachedData) {
      console.log(`Cache hit for user: ${username}`);
      res.send(setResponse(username, Number(cachedData)));
    } else {
      console.log(`Cache miss for user: ${username}`);
      next(); // Proceed to the next middleware/route handler
    }
  } catch (error) {
    console.error("Redis cache error:", error);

    // Fallback: Proceed to the next middleware/route handler
    // despite Redis error, so the app can still function
    next();
  }
};

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

app.get("/repos/:username", cache, getRepos);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
