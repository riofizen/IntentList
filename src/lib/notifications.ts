/**
 * lib/notifications.ts
 * Due-time notification scheduler.
 * Schedules browser notifications when tasks have a specific time set.
 * All scheduling is done via setTimeout — no service worker required.
 * Respects browser Notification permission.
 */

import { Task } from '../types';
import { format, parseISO, isToday, isTomorrow, differenceInMilliseconds, startOfDay, addMilliseconds } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledNotification {
  taskId: string;
  timeoutId: ReturnType<typeof setTimeout>;
  scheduledFor: Date;
}

// ─── Module state ─────────────────────────────────────────────────────────────

const scheduled = new Map<string, ScheduledNotification>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTaskDateTime(task: Task): Date | null {
  if (!task.time) return null;
  try {
    const [h, m] = task.time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const base = startOfDay(parseISO(task.date));
    return addMilliseconds(base, (h * 60 + m) * 60 * 1000);
  } catch {
    return null;
  }
}

function getNotificationBody(task: Task): string {
  const d = parseISO(task.date);
  const when = isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'MMM d');
  const tags  = task.tags.filter(t => t !== 'subtask' && t !== 'parent');
  if (tags.length > 0) return `${when} · ${tags.map(t => '#' + t).join(' ')}`;
  return when;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Request notification permission if not already granted.
 * Returns true if permission is granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Schedule a browser notification for a task at its due time.
 * Does nothing if: no time, task is completed, permission not granted,
 * task is in the past, or already scheduled.
 */
export function scheduleTaskNotification(task: Task): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (task.completed) return;

  const dueAt = parseTaskDateTime(task);
  if (!dueAt) return;

  const now = new Date();
  const msUntilDue = differenceInMilliseconds(dueAt, now);

  // Skip if already past or more than 48 hours away (reschedule on next open)
  if (msUntilDue <= 0 || msUntilDue > 48 * 60 * 60 * 1000) return;

  // Cancel existing if already scheduled
  cancelTaskNotification(task.id);

  // Schedule 5-minute warning
  const msWarning = msUntilDue - 5 * 60 * 1000;
  if (msWarning > 0) {
    const warningId = setTimeout(() => {
      if (Notification.permission !== 'granted') return;
      new Notification(`⏰ In 5 minutes: ${task.text}`, {
        body: getNotificationBody(task),
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `intentlist-warning-${task.id}`,
        silent: false,
      });
    }, msWarning);

    // Track the earlier timeout (warning fires first)
    scheduled.set(`${task.id}-warn`, {
      taskId: task.id,
      timeoutId: warningId,
      scheduledFor: new Date(now.getTime() + msWarning),
    });
  }

  // Schedule exact due-time notification
  const timeoutId = setTimeout(() => {
    if (Notification.permission !== 'granted') return;
    new Notification(`🎯 Due now: ${task.text}`, {
      body: getNotificationBody(task),
      icon: '/logo.png',
      badge: '/logo.png',
      tag: `intentlist-due-${task.id}`,
      requireInteraction: true,
    });
    scheduled.delete(task.id);
    scheduled.delete(`${task.id}-warn`);
  }, msUntilDue);

  scheduled.set(task.id, {
    taskId: task.id,
    timeoutId,
    scheduledFor: dueAt,
  });
}

/**
 * Cancel a scheduled notification for a specific task.
 */
export function cancelTaskNotification(taskId: string): void {
  const entry = scheduled.get(taskId);
  if (entry) { clearTimeout(entry.timeoutId); scheduled.delete(taskId); }
  const warnEntry = scheduled.get(`${taskId}-warn`);
  if (warnEntry) { clearTimeout(warnEntry.timeoutId); scheduled.delete(`${taskId}-warn`); }
}

/**
 * Synchronise all scheduled notifications against the current task list.
 * Call this: on app load, whenever tasks change, and periodically.
 * - Cancels notifications for completed/deleted tasks
 * - Schedules new notifications for tasks with upcoming due times
 */
export function syncNotifications(tasks: Task[]): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const taskIds = new Set(tasks.map(t => t.id));

  // Cancel orphaned notifications
  for (const [key] of scheduled) {
    const taskId = key.replace('-warn', '');
    if (!taskIds.has(taskId)) {
      const entry = scheduled.get(key);
      if (entry) clearTimeout(entry.timeoutId);
      scheduled.delete(key);
    }
  }

  // Schedule / update for today and tomorrow's tasks with times
  const relevant = tasks.filter(t =>
    !t.completed && t.time &&
    (isToday(parseISO(t.date)) || isTomorrow(parseISO(t.date)))
  );

  for (const task of relevant) {
    scheduleTaskNotification(task);
  }
}

/**
 * Cancel all scheduled notifications. Call on logout.
 */
export function clearAllNotifications(): void {
  for (const [, entry] of scheduled) {
    clearTimeout(entry.timeoutId);
  }
  scheduled.clear();
}

/**
 * Get count of currently scheduled notifications (for debugging/display).
 */
export function getScheduledCount(): number {
  return scheduled.size;
}
