import { Task, User } from "../types";

const API_BASE = "/api";

export const taskService = {
  async getTasks(userId: string): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks?userId=${userId}`);
    return res.json();
  },

  async createTask(task: Task): Promise<void> {
    await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    await fetch(`${API_BASE}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },

  async deleteTask(id: string): Promise<void> {
    await fetch(`${API_BASE}/tasks/${id}`, {
      method: "DELETE",
    });
  }
};

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },

  async signup(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Signup failed");
    return res.json();
  }
};
