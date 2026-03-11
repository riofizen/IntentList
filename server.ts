import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("intentlist.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    plan TEXT DEFAULT 'free'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    userId TEXT,
    text TEXT,
    date TEXT,
    time TEXT,
    completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'normal',
    tags TEXT DEFAULT '[]',
    createdAt TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
if (!userColumns.some((column) => column.name === "plan")) {
  db.exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'");
}

const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
if (!taskColumns.some((column) => column.name === "tags")) {
  db.exec("ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT '[]'");
}

function parseTags(rawTags: unknown): string[] {
  if (Array.isArray(rawTags)) {
    return rawTags.filter((tag): tag is string => typeof tag === "string");
  }
  if (typeof rawTags !== "string" || rawTags.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(rawTags);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(startPort: number, host: string, maxAttempts = 25): Promise<number> {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate, host)) {
      return candidate;
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

async function startServer() {
  const app = express();
  const host = process.env.HOST || "0.0.0.0";
  const preferredPort = Number(process.env.PORT || 3000);
  const hmrEnabled = process.env.DISABLE_HMR === "false";

  const port = await findAvailablePort(preferredPort, host);
  if (!hmrEnabled) {
    process.env.DISABLE_HMR = "true";
  }

  if (port !== preferredPort) {
    console.warn(`Port ${preferredPort} is in use. Using ${port} instead.`);
  }

  app.use(express.json());

  // Auth Routes (Simplified for demo)
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (user && user.password === password) {
      res.json({ id: user.id, email: user.email, plan: user.plan ?? "free" });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/signup", (req, res) => {
    const { email, password } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const plan = "free";
    try {
      db.prepare("INSERT INTO users (id, email, password, plan) VALUES (?, ?, ?, ?)").run(id, email, password, plan);
      res.json({ id, email, plan });
    } catch (e) {
      res.status(400).json({ error: "User already exists" });
    }
  });

  // Task Routes
  app.get("/api/tasks", (req, res) => {
    const userId = req.query.userId as string;
    const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ? ORDER BY date ASC, time ASC").all(userId);
    res.json(
      tasks.map((task: any) => ({
        ...task,
        completed: !!task.completed,
        tags: parseTags(task.tags),
      })),
    );
  });

  app.post("/api/tasks", (req, res) => {
    const { id, userId, text, date, time, completed, priority, tags, createdAt } = req.body;
    db.prepare(`
      INSERT INTO tasks (id, userId, text, date, time, completed, priority, tags, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      text,
      date,
      time,
      completed ? 1 : 0,
      priority || "normal",
      JSON.stringify(parseTags(tags)),
      createdAt,
    );
    res.json({ success: true });
  });

  app.put("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const { text, date, time, completed, priority, tags } = req.body;
    const updates: Array<[string, string | number | null]> = [];

    if (text !== undefined) updates.push(["text", text]);
    if (date !== undefined) updates.push(["date", date]);
    if (time !== undefined) updates.push(["time", time]);
    if (completed !== undefined) updates.push(["completed", completed ? 1 : 0]);
    if (priority !== undefined) updates.push(["priority", priority]);
    if (tags !== undefined) updates.push(["tags", JSON.stringify(parseTags(tags))]);

    if (updates.length === 0) {
      res.status(400).json({ error: "No updates provided" });
      return;
    }

    const setClause = updates.map(([column]) => `${column} = ?`).join(", ");
    const values = updates.map(([, value]) => value);

    db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).run(...values, id);
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: hmrEnabled },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
