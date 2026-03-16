import { addDays, addWeeks, addMonths, addYears, format, parseISO, isAfter, startOfToday, getDay } from 'date-fns';
import { Task } from '../types';

/**
 * Checks all tasks with a recurrence rule and generates the next occurrence
 * if the last occurrence was in the past and no future occurrence exists yet.
 *
 * Called once on app load after tasks are fetched.
 */
export function generateRecurringTasks(tasks: Task[], userId: string): Task[] {
  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');
  const newTasks: Task[] = [];

  // Build a set of all existing task text+date combos to avoid duplicates
  const existingKeys = new Set(tasks.map(t => `${t.text}::${t.date}`));

  for (const task of tasks) {
    if (!task.recurrence) continue;
    if (task.parentId)   continue; // Don't recur subtasks

    const rule = task.recurrence;
    const taskDate = parseISO(task.date);

    // If this task is already in the future, skip — it hasn't happened yet
    if (isAfter(taskDate, today)) continue;

    // Check if a future occurrence of this recurring task already exists
    const futureExists = tasks.some(t =>
      t.text === task.text &&
      t.recurrence &&
      isAfter(parseISO(t.date), today)
    );
    if (futureExists) continue;

    // Calculate the next occurrence date
    const nextDate = getNextOccurrence(task.date, rule);
    if (!nextDate) continue;

    const nextDateStr = format(nextDate, 'yyyy-MM-dd');

    // Don't create a duplicate
    if (existingKeys.has(`${task.text}::${nextDateStr}`)) continue;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      text: task.text,
      date: nextDateStr,
      time: task.time,
      completed: false,
      priority: task.priority,
      tags: task.tags,
      createdAt: new Date().toISOString(),
      recurrence: task.recurrence,
      duration: task.duration,
      raw: task.raw,
      parentId: null,
    };

    newTasks.push(newTask);
    existingKeys.add(`${task.text}::${nextDateStr}`);
  }

  return newTasks;
}

function getNextOccurrence(
  lastDateStr: string,
  rule: NonNullable<Task['recurrence']>
): Date | null {
  const last = parseISO(lastDateStr);
  const today = startOfToday();
  const { type, interval, daysOfWeek } = rule;

  // For weekly rules with specific days, find the next matching weekday
  if (type === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
    return nextWeekday(today, daysOfWeek);
  }

  // Otherwise advance from last date by interval units until we're >= today
  let next = last;
  let iterations = 0;
  const MAX = 365;

  while (!isAfter(next, today) || next.getTime() === today.getTime()) {
    switch (type) {
      case 'daily':   next = addDays(next, interval);   break;
      case 'weekly':  next = addWeeks(next, interval);  break;
      case 'monthly': next = addMonths(next, interval); break;
      case 'yearly':  next = addYears(next, interval);  break;
      default:        return null;
    }
    if (++iterations > MAX) return null;
  }

  return next;
}

function nextWeekday(fromDate: Date, targetDays: number[]): Date | null {
  if (!targetDays.length) return null;

  // Look ahead up to 7 days for the nearest matching weekday
  for (let i = 0; i <= 7; i++) {
    const candidate = addDays(fromDate, i);
    if (targetDays.includes(getDay(candidate))) {
      // Must be strictly after today (not today — today's instance should already exist)
      if (i === 0) continue;
      return candidate;
    }
  }

  return null;
}
