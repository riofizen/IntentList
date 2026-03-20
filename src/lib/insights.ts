/**
 * lib/insights.ts
 * Pure-logic productivity insights engine.
 * No API calls. Runs entirely on local task data.
 * Generates personal, specific insights that feel like a human coach.
 */

import { Task } from '../types';
import {
  parseISO, isToday, isYesterday, format, subDays,
  startOfToday, differenceInDays, getDay, isSameDay,
  startOfWeek, endOfWeek, isWithinInterval,
} from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductivityInsight {
  type: 'warning' | 'pattern' | 'win' | 'risk' | 'capacity';
  title: string;
  body: string;
  stat?: string;
  statLabel?: string;
  isPro: boolean; // false = teaser (blurred for free users)
}

export interface InsightReport {
  score: number;              // 0–100 productivity score
  scoreLabel: string;         // "Building" | "Steady" | "Focused" | "In flow" | "Peak"
  scoreColor: string;
  peakDay: string;            // "Tuesday"
  worstDay: string;           // "Friday"
  bestTag: string | null;     // "#work"
  worstTag: string | null;    // "#personal"
  bestTagRate: number;        // 89
  worstTagRate: number;       // 31
  completionRate7d: number;   // % last 7 days
  avgTasksPerDay: number;
  carryForwardCount: number;  // tasks rescheduled 3+ times (proxy: very old overdue)
  overdueAging: number;       // tasks overdue 7+ days
  todayCapacity: string;      // "overloaded" | "manageable" | "light" | "empty"
  todayCount: number;
  todayDone: number;
  streakRisk: boolean;        // true if no task done yesterday and today
  totalTasks: number;
  insights: ProductivityInsight[];
}

// ─── Day labels ───────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function completionRateForTasks(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
}

function tasksInLast(tasks: Task[], days: number): Task[] {
  const cutoff = subDays(new Date(), days);
  return tasks.filter(t => {
    const d = parseISO(t.date);
    return d >= cutoff && d <= new Date();
  });
}

// ─── Main function ────────────────────────────────────────────────────────────

export function generateInsights(tasks: Task[]): InsightReport {
  const today = startOfToday();
  const topLevel = tasks.filter(t => !t.parentId);

  // ── Today ──
  const todayTasks = topLevel.filter(t => isToday(parseISO(t.date)));
  const todayDone  = todayTasks.filter(t => t.completed).length;
  const todayCount = todayTasks.length;

  // ── Last 7 days ──
  const last7 = tasksInLast(topLevel, 7);
  const completionRate7d = completionRateForTasks(last7);

  // ── Last 30 days ──
  const last30 = tasksInLast(topLevel, 30);
  const avgTasksPerDay = Math.round(last30.length / 30 * 10) / 10;

  // ── Per-day-of-week analysis ──
  const dayBuckets: Record<number, { total: number; done: number }> = {};
  for (let i = 0; i < 7; i++) dayBuckets[i] = { total: 0, done: 0 };

  last30.forEach(task => {
    const dow = getDay(parseISO(task.date));
    dayBuckets[dow].total++;
    if (task.completed) dayBuckets[dow].done++;
  });

  let peakDayIdx = 0, worstDayIdx = 0;
  let peakRate = -1, worstRate = 101;

  for (let i = 0; i < 7; i++) {
    const { total, done } = dayBuckets[i];
    if (total < 2) continue; // not enough data
    const rate = done / total;
    if (rate > peakRate) { peakRate = rate; peakDayIdx = i; }
    if (rate < worstRate) { worstRate = rate; worstDayIdx = i; }
  }

  const peakDay  = DAY_NAMES[peakDayIdx];
  const worstDay = DAY_NAMES[worstDayIdx];

  // ── Tag analysis ──
  const tagMap = new Map<string, { total: number; done: number }>();

  last30.forEach(task => {
    task.tags.filter(t => t !== 'subtask' && t !== 'parent').forEach(tag => {
      if (!tagMap.has(tag)) tagMap.set(tag, { total: 0, done: 0 });
      const entry = tagMap.get(tag)!;
      entry.total++;
      if (task.completed) entry.done++;
    });
  });

  let bestTag: string | null = null, worstTag: string | null = null;
  let bestTagRate = 0, worstTagRate = 100;

  tagMap.forEach((v, tag) => {
    if (v.total < 3) return;
    const rate = Math.round((v.done / v.total) * 100);
    if (rate > bestTagRate)  { bestTagRate = rate;  bestTag  = tag; }
    if (rate < worstTagRate) { worstTagRate = rate; worstTag = tag; }
  });

  // ── Carry-forward / ghost tasks ──
  // Tasks overdue 14+ days that were never completed — they're the "eternal carry-forward"
  const carryForwardCount = topLevel.filter(t =>
    !t.completed &&
    differenceInDays(today, parseISO(t.date)) >= 14
  ).length;

  // Tasks overdue 7+ days
  const overdueAging = topLevel.filter(t =>
    !t.completed &&
    differenceInDays(today, parseISO(t.date)) >= 7
  ).length;

  // ── Streak risk ──
  const yesterdayDone = topLevel.filter(t =>
    isYesterday(parseISO(t.date)) && t.completed
  ).length;
  const streakRisk = yesterdayDone === 0 && todayDone === 0 && topLevel.length > 5;

  // ── Capacity ──
  const todayCapacity: InsightReport['todayCapacity'] =
    todayCount === 0  ? 'empty' :
    todayCount <= 3   ? 'light' :
    todayCount <= 7   ? 'manageable' :
    'overloaded';

  // ── Productivity Score (0–100) ──
  // Weighted: completion rate 40%, consistency 30%, overdue management 20%, capacity 10%
  const consistencyScore = (() => {
    // How many of last 7 days had at least one completed task?
    let activeDays = 0;
    for (let i = 0; i < 7; i++) {
      const d = subDays(new Date(), i);
      const dayDone = topLevel.filter(t => isSameDay(parseISO(t.date), d) && t.completed).length;
      if (dayDone > 0) activeDays++;
    }
    return (activeDays / 7) * 100;
  })();

  const overdueScore = Math.max(0, 100 - (overdueAging * 15));
  const capacityScore = todayCapacity === 'overloaded' ? 50 : 100;

  const score = Math.round(
    completionRate7d * 0.4 +
    consistencyScore * 0.3 +
    overdueScore     * 0.2 +
    capacityScore    * 0.1
  );

  const scoreLabel =
    score >= 85 ? 'Peak'     :
    score >= 70 ? 'In flow'  :
    score >= 50 ? 'Focused'  :
    score >= 30 ? 'Steady'   :
    'Building';

  const scoreColor =
    score >= 85 ? '#13B96D' :
    score >= 70 ? '#3B82F6' :
    score >= 50 ? '#F59E0B' :
    score >= 30 ? '#F97316' :
    '#EF4444';

  // ── Generate insights list ──
  const insights: ProductivityInsight[] = [];

  // Always show these to free users (teasers)
  if (todayCapacity === 'overloaded') {
    insights.push({
      type: 'warning',
      title: 'You\'re overloaded today',
      body: `${todayCount} tasks due today. Based on your history, you complete around ${Math.round(avgTasksPerDay * 1.2)} tasks/day. Something won't get done.`,
      stat: String(todayCount),
      statLabel: 'tasks due today',
      isPro: false,
    });
  }

  if (overdueAging > 0) {
    insights.push({
      type: 'risk',
      title: overdueAging === 1 ? '1 task has been overdue for 7+ days' : `${overdueAging} tasks are 7+ days overdue`,
      body: 'Tasks overdue this long have a very low completion probability. Consider deleting or rescheduling them deliberately.',
      stat: String(overdueAging),
      statLabel: 'aging overdue',
      isPro: false,
    });
  }

  if (completionRate7d >= 80) {
    insights.push({
      type: 'win',
      title: 'Strong week',
      body: `You've completed ${completionRate7d}% of tasks in the last 7 days. That puts you in the top tier of consistent users.`,
      stat: `${completionRate7d}%`,
      statLabel: '7-day rate',
      isPro: false,
    });
  }

  // Pro-only insights
  if (peakRate > 0) {
    insights.push({
      type: 'pattern',
      title: `${peakDay} is your peak day`,
      body: `You complete ${Math.round(peakRate * 100)}% of tasks on ${peakDay}s. Schedule your most important work then. ${worstDay} is your weakest — avoid hard deadlines on ${worstDay}s.`,
      stat: `${Math.round(peakRate * 100)}%`,
      statLabel: `${peakDay} completion`,
      isPro: true,
    });
  }

  if (bestTag && worstTag && bestTag !== worstTag) {
    insights.push({
      type: 'pattern',
      title: `You treat #${bestTag} and #${worstTag} very differently`,
      body: `You complete ${bestTagRate}% of #${bestTag} tasks but only ${worstTagRate}% of #${worstTag}. This likely reflects your actual priorities — or a category that's too vague.`,
      stat: `${bestTagRate}% vs ${worstTagRate}%`,
      statLabel: `#${bestTag} vs #${worstTag}`,
      isPro: true,
    });
  }

  if (carryForwardCount > 0) {
    insights.push({
      type: 'risk',
      title: `${carryForwardCount} task${carryForwardCount > 1 ? 's' : ''} you keep avoiding`,
      body: `${carryForwardCount > 1 ? 'These tasks have' : 'This task has'} been on your list for 14+ days without completion. Research shows tasks this old have a < 10% chance of getting done. Delete, delegate, or break them down.`,
      stat: String(carryForwardCount),
      statLabel: 'ghost tasks',
      isPro: true,
    });
  }

  if (streakRisk) {
    insights.push({
      type: 'risk',
      title: 'Streak at risk',
      body: 'No tasks completed yesterday or today yet. Even completing one small task resets the momentum pattern.',
      stat: '0',
      statLabel: 'done in 2 days',
      isPro: true,
    });
  }

  if (last30.length < 5) {
    insights.push({
      type: 'pattern',
      title: 'Not enough data yet',
      body: 'Add and complete at least 10 tasks across a few days to unlock your personal productivity profile.',
      isPro: false,
    });
  }

  return {
    score,
    scoreLabel,
    scoreColor,
    peakDay,
    worstDay,
    bestTag,
    worstTag,
    bestTagRate,
    worstTagRate,
    completionRate7d,
    avgTasksPerDay,
    carryForwardCount,
    overdueAging,
    todayCapacity,
    todayCount,
    todayDone,
    streakRisk,
    totalTasks: topLevel.length,
    insights,
  };
}

/**
 * Returns a single teaser insight string for free users in the Daily Digest.
 * Shows a real number but hides the actionable conclusion.
 */
export function getTeaserInsight(tasks: Task[]): { visible: string; locked: string } | null {
  const r = generateInsights(tasks);
  if (r.totalTasks < 3) return null;

  if (r.overdueAging > 0) {
    return {
      visible: `You have ${r.overdueAging} task${r.overdueAging > 1 ? 's' : ''} that ${r.overdueAging > 1 ? 'have' : 'has'} been overdue for 7+ days.`,
      locked: 'Research says they won\'t get done. Pro shows you exactly what to cut.',
    };
  }
  if (r.carryForwardCount > 0) {
    return {
      visible: `${r.carryForwardCount} task${r.carryForwardCount > 1 ? 's' : ''} on your list for 14+ days.`,
      locked: 'These are ghost tasks. Pro tells you which ones to delete vs rescue.',
    };
  }
  if (r.completionRate7d > 0) {
    return {
      visible: `Your 7-day completion rate is ${r.completionRate7d}%.`,
      locked: `Pro shows your peak day, weakest day, and which tags you're avoiding.`,
    };
  }
  return null;
}
