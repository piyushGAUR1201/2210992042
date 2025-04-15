const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 9876;

let users = [];
let posts = [];
let comments = [];

const CACHE_TTL = 2 * 60 * 1000;
let lastFetchedTime = 0;

const fetchData = async () => {
  const now = Date.now();
  if (now - lastFetchedTime < CACHE_TTL) return;

  try {
    const [userRes, postRes, commentRes] = await Promise.all([
      axios.get("http://20.244.56.144/social-media/users"),
      axios.get("http://20.244.56.144/social-media/posts"),
      axios.get("http://20.244.56.144/social-media/comments"),
    ]);

    users = userRes.data;
    posts = postRes.data;
    comments = commentRes.data;
    lastFetchedTime = now;
  } catch (err) {
    console.error("Error fetching data", err.message);
  }
};

const getCommentCountsByPost = () => {
  const map = new Map();
  comments.forEach((c) => {
    map.set(c.postId, (map.get(c.postId) || 0) + 1);
  });
  return map;
};

app.get("/users", async (req, res) => {
  await fetchData();
  const commentMap = getCommentCountsByPost();

  const userCommentCount = new Map();

  posts.forEach((post) => {
    const count = commentMap.get(post.id) || 0;
    userCommentCount.set(post.userId, (userCommentCount.get(post.userId) || 0) + count);
  });

  const topUsers = [...userCommentCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, totalComments]) => {
      const user = users.find((u) => u.id === userId);
      return {
        userId,
        name: user?.name || "Unknown",
        totalComments,
      };
    });

  res.json(topUsers);
});

app.get("/posts", async (req, res) => {
  await fetchData();
  const type = req.query.type;

  if (type === "popular") {
    const commentMap = getCommentCountsByPost();

    let maxComments = 0;
    const postMap = new Map();

    posts.forEach((post) => {
      const count = commentMap.get(post.id) || 0;
      if (count > maxComments) {
        maxComments = count;
        postMap.clear();
        postMap.set(post.id, { ...post, commentCount: count });
      } else if (count === maxComments) {
        postMap.set(post.id, { ...post, commentCount: count });
      }
    });

    res.json([...postMap.values()]);
  } else if (type === "latest") {
    const latestPosts = [...posts]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);

    res.json(latestPosts);
  } else {
    res.status(400).json({ error: "Invalid type parameter. Use 'popular' or 'latest'." });
  }
});

app.listen(PORT, () => {
  console.log(`running at http://localhost:${PORT}`);
});