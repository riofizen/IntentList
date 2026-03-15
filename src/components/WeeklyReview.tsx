import React, { useMemo } from 'react';
import { Task } from '../types';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isSameDay,
  eachDayOfInterval,
  isWithinInterval,
  subWeeks,
  startOfToday,
  addDays,
} from 'date-fns';
import { CheckCircle2, TrendingUp, TrendingDown, Calendar, Tag, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../App';
import { type ParsedIntent } from '../lib/parser';
import { InputBox } from './InputBox';

interface WeeklyReviewProps {
  tasks: Task[];
  onAddTask: (intent: ParsedIntent) => void;
}

function getDay(date: Date): string {
  return format(date, 'EEE');
}

export const WeeklyReview: React.FC<WeeklyReviewProps> = ({ tasks, onAddTask }) => {
  const today = startOfToday();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });

  const thisWeekTasks = useMemo(
    () => tasks.filter(t => isWithinInterval(parseISO(t.date), { start: weekStart, end: weekEnd })),
    [tasks, weekStart, weekEnd]
  );

  const lastWeekTasks = useMemo(
    () => tasks.filter(t => isWithinInterval(parseISO(t.date), { start: lastWeekStart, end: lastWeekEnd })),
    [tasks, lastWeekStart, lastWeekEnd]
  );

  const completedThisWeek = thisWeekTasks.filter(t => t.completed);
  const missedThisWeek = thisWeekTasks.filter(t => !t.completed && parseISO(t.date) < today);
  const completionRate = thisWeekTasks.length > 0
    ? Math.round((completedThisWeek.length / thisWeekTasks.length) * 100)
    : 0;

  const lastWeekRate = lastWeekTasks.length > 0
    ? Math.round((lastWeekTasks.filter(t => t.completed).length / lastWeekTasks.length) * 100)
    : 0;

  const rateDelta = completionRate - lastWeekRate;

  // Per-day breakdown for this week
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const dayStats = daysOfWeek.map(day => {
    const dayTasks = thisWeekTasks.filter(t => isSameDay(parseISO(t.date), day));
    return {
      label: getDay(day),
      total: dayTasks.length,
      done: dayTasks.filter(t => t.completed).length,
      isToday: isSameDay(day, today),
      isFuture: day > today,
    };
  });

  const maxDayTotal = Math.max(...dayStats.map(d => d.total), 1);

  // Best day
  const bestDay = [...dayStats]
    .filter(d => !d.isFuture)
    .sort((a, b) => b.done - a.done)[0];

  // Tag breakdown
  const tagMap = new Map<string, number>();
  completedThisWeek.forEach(t => {
    t.tags.forEach(tag => tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1));
  });
  const topTags = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#6B8D86] mb-2">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </p>
        <h2 className="text-3xl font-serif italic text-[#1A3142]">Week in Review</h2>
        <p className="text-sm text-[#6B8D86] mt-1">How did this week go?</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-white/90 border border-[#D6EBE1] rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86] mb-2">Completed</p>
          <p className="text-2xl font-serif italic text-[#1D3441]">{completedThisWeek.length}</p>
          <p className="text-[10px] text-[#9AB8AF] mt-1">of {thisWeekTasks.length} tasks</p>
        </div>

        <div className="bg-white/90 border border-[#D6EBE1] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86]">Rate</p>
            {rateDelta !== 0 && (
              rateDelta > 0
                ? <TrendingUp className="w-3.5 h-3.5 text-[#13B96D]" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <p className="text-2xl font-serif italic text-[#1D3441]">{completionRate}%</p>
          <p className={cn("text-[10px] mt-1",
            rateDelta > 0 ? "text-[#13B96D]" : rateDelta < 0 ? "text-red-400" : "text-[#9AB8AF]"
          )}>
            {rateDelta === 0 ? 'same as last week' : `${rateDelta > 0 ? '+' : ''}${rateDelta}% vs last week`}
          </p>
        </div>

        <div className={cn(
          "border rounded-2xl p-4 shadow-sm",
          missedThisWeek.length > 0 ? "bg-amber-50/70 border-amber-200/50" : "bg-white/90 border-[#D6EBE1]"
        )}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86] mb-2">Missed</p>
          <p className="text-2xl font-serif italic text-[#1D3441]">{missedThisWeek.length}</p>
          <p className="text-[10px] text-[#9AB8AF] mt-1">
            {missedThisWeek.length === 0 ? 'perfect streak' : 'tasks overdue'}
          </p>
        </div>
      </motion.div>

      {/* Day-by-day bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white/90 border border-[#D6EBE1] rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-4 h-4 text-[#6B8D86]" />
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">Daily Breakdown</h3>
        </div>
        <div className="flex items-end gap-2 h-24">
          {dayStats.map((day, i) => (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                {day.total > 0 ? (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.total / maxDayTotal) * 72}px` }}
                    transition={{ delay: 0.2 + i * 0.04, duration: 0.5 }}
                    className={cn(
                      "w-full rounded-t-lg relative overflow-hidden",
                      day.isFuture ? "bg-[#E8F5EF]" : "bg-[#D0EDE0]"
                    )}
                  >
                    {!day.isFuture && day.done > 0 && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.done / day.total) * 100}%` }}
                        transition={{ delay: 0.35 + i * 0.04, duration: 0.5 }}
                        className="absolute bottom-0 left-0 right-0 bg-[#13B96D] rounded-t-lg"
                      />
                    )}
                  </motion.div>
                ) : (
                  <div className="w-full" style={{ height: '4px' }} />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-mono uppercase tracking-widest",
                day.isToday ? "text-[#12935A] font-bold" : "text-[#9AB8AF]"
              )}>
                {day.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E8F5EF]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#13B96D]" />
            <span className="text-[10px] text-[#6B8D86]">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#D0EDE0]" />
            <span className="text-[10px] text-[#6B8D86]">Planned</span>
          </div>
        </div>
      </motion.div>

      {/* Best day + Tag insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bestDay && bestDay.done > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#ECF9F2] border border-[#CBE7D9] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-[#13B96D]" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">Best Day</h3>
            </div>
            <p className="text-xl font-serif italic text-[#1A3142]">{bestDay.label}</p>
            <p className="text-xs text-[#5B7A75] mt-1">{bestDay.done} tasks completed</p>
          </motion.div>
        )}

        {topTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/90 border border-[#D6EBE1] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-[#6B8D86]" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">Focus Areas</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count]) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] font-mono text-[#12935A] bg-[#E8F5EF] px-2.5 py-1 rounded-lg uppercase tracking-widest">
                  #{tag} <span className="text-[#6B8D86]">×{count}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Missed tasks */}
      {missedThisWeek.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">
            Didn't Make It
          </h3>
          {missedThisWeek.slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center gap-3 p-3.5 bg-white/70 border border-[#D6EBE1] rounded-xl opacity-70">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-sm text-[#4A6B65] line-through">{task.text}</p>
              <span className="ml-auto text-[10px] font-mono text-[#9AB8AF]">
                {format(parseISO(task.date), 'EEE')}
              </span>
            </div>
          ))}
          {missedThisWeek.length > 5 && (
            <p className="text-[10px] text-[#9AB8AF] text-center font-mono">
              +{missedThisWeek.length - 5} more
            </p>
          )}
        </motion.div>
      )}

      {/* Plan next week */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#6B8D86]" />
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">
            Plan Next Week
          </h3>
        </div>
        <p className="text-xs text-[#8AA89C]">
          Add tasks for next week. Try: <em>"submit report next Monday"</em> or <em>"team meeting every Tuesday 10am"</em>
        </p>
        <InputBox onAddTask={onAddTask} selectedDate={addDays(weekStart, 7)} />
      </motion.div>

      {/* Empty state */}
      {thisWeekTasks.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-lg font-serif italic text-[#8AA89C]">No tasks logged this week yet.</p>
        </div>
      )}
    </div>
  );
};
