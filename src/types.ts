export type Priority = 'high' | 'normal' | 'low';

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
}

export interface Task {
  id: string;
  userId: string;
  text: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string | null; // HH:mm
  completed: boolean;
  priority: Priority;
  tags: string[];
  createdAt: string;
  // New optional fields — stored in local state/cache, persisted to DB once columns are added
  parentId?: string | null;
  recurrence?: RecurrenceRule | null;
  duration?: number | null;
}

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
}

export type ViewType =
  | 'today'
  | 'overdue'
  | 'upcoming'
  | 'all'
  | 'calendar'
  | 'timeline'
  | 'pomodoro'
  | 'digest'
  | 'weekly'
  | 'templates';
