import { createClient, type User as SupabaseAuthUser } from "@supabase/supabase-js";
import { Task, User } from "../types";

const API_BASE = "/api";
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const supabase = SUPABASE_ENABLED
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

type SupabaseTaskRow = {
  id: string;
  user_id: string;
  text: string;
  date: string;
  time: string | null;
  completed: boolean;
  priority: "high" | "normal" | "low";
  tags: unknown;
  created_at: string;
  // Optional extended columns — present once DB migration is run
  parent_id?: string | null;
  recurrence?: unknown;
  duration?: number | null;
};

const toPlan = (value: unknown): User["plan"] => (value === "pro" ? "pro" : "free");

const toUser = (authUser: SupabaseAuthUser): User => ({
  id: authUser.id,
  email: authUser.email ?? "",
  plan: toPlan(authUser.user_metadata?.plan),
});

const toTask = (row: SupabaseTaskRow): Task => ({
  id: row.id,
  userId: row.user_id,
  text: row.text,
  date: row.date,
  time: row.time,
  completed: Boolean(row.completed),
  priority: row.priority ?? "normal",
  tags: Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === "string")
    : [],
  createdAt: row.created_at,
  // Extended fields — gracefully default when columns don't exist yet
  parentId: row.parent_id ?? null,
  recurrence: (row.recurrence as Task["recurrence"]) ?? null,
  duration: row.duration ?? null,
});

// Only send fields that exist in the current DB schema.
// parentId / recurrence / duration are NOT sent until you add the columns:
//   ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id text null;
//   ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence jsonb null;
//   ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration integer null;
const toSupabaseTaskInsert = (task: Task) => ({
  id: task.id,
  user_id: task.userId,
  text: task.text,
  date: task.date,
  time: task.time,
  completed: task.completed,
  priority: task.priority,
  tags: task.tags,
  created_at: task.createdAt,
});

const toSupabaseTaskUpdate = (updates: Partial<Task>) => {
  const payload: Record<string, unknown> = {};
  if (updates.text !== undefined) payload.text = updates.text;
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.time !== undefined) payload.time = updates.time;
  if (updates.completed !== undefined) payload.completed = updates.completed;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  return payload;
};

const toAuthError = (message: string, fallback: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Invalid email or password";
  if (normalized.includes("email not confirmed")) return "Check your email and confirm your account before signing in";
  if (normalized.includes("already") || normalized.includes("registered")) return "User already exists";
  return message || fallback;
};

export const taskService = {
  async getTasks(userId: string): Promise<Task[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .order("time", { ascending: true, nullsFirst: false });

      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => toTask(row as SupabaseTaskRow));
    }

    const res = await fetch(`${API_BASE}/tasks?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
  },

  async createTask(task: Task): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("tasks").insert(toSupabaseTaskInsert(task));
      if (error) throw new Error(error.message);
      return;
    }

    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error("Failed to create task");
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    if (supabase) {
      const payload = toSupabaseTaskUpdate(updates);
      if (Object.keys(payload).length === 0) return;

      const { error } = await supabase.from("tasks").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }

    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update task");
  },

  async deleteTask(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }

    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
  },
};

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    if (supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;
      return toUser(data.user);
    }

    try {
      const raw = localStorage.getItem("intentlist_user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch (error) {
      console.error("Failed to restore local auth user:", error);
      return null;
    }
  },

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? toUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async login(email: string, password: string): Promise<User> {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error(toAuthError(error?.message ?? "", "Login failed"));
      return toUser(data.user);
    }

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },

  async signup(email: string, password: string): Promise<User> {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { plan: "free" } },
      });

      if (error || !data.user) throw new Error(toAuthError(error?.message ?? "", "Signup failed"));
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error("Account already exists. Sign in instead.");
      }
      if (!data.session) {
        throw new Error("Account created. Check your email to confirm it, then sign in.");
      }
      return toUser(data.user);
    }

    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Signup failed");
    return res.json();
  },

  async logout(): Promise<void> {
    if (supabase) await supabase.auth.signOut();
  },
};
