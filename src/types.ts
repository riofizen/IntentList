export type Priority = 'high' | 'normal' | 'low';

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
}

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
}

export type ViewType = 'today' | 'overdue' | 'upcoming' | 'all' | 'calendar' | 'timeline' | 'pomodoro';
