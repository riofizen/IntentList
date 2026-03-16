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
  date: string;
  time: string | null;
  completed: boolean;
  priority: Priority;
  tags: string[];
  createdAt: string;
  parentId?: string | null;
  recurrence?: RecurrenceRule | null;
  duration?: number | null;
  raw?: string | null;
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
  | 'templates'
  | 'habits';

