import React, { useMemo } from 'react';
import { Task } from '../types';
import { format, isToday, parseISO, startOfToday, isYesterday } from 'date-fns';
import { CheckCircle2, AlertCircle, ChevronRight, Zap, Clock, Target, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../App';

interface DailyDigestProps {
  tasks: Task[];
  user: { email: string; plan: string };
  onCarryForward: () => void;
  onViewChange: (view: 'today' | 'overdue') => void;
}

function getGreeting(email: string): { greeting: string; sub: string } {
  const h = new Date().getHours();
  const name = email.split('@')[0];
  if (h < 12) return { greeting: `Good morning, ${name}.`, sub: 'Here\'s your day at a glance.' };
  if (h < 17) return { greeting: `Good afternoon, ${name}.`, sub: 'Here\'s where things stand.' };
  return { greeting: `Good evening, ${name}.`, sub: 'Here\'s your end-of-day summary.' };
}

function getMotivation(completionRate: number, totalToday: number): string {
  if (totalToday === 0) return 'A clean slate. What will you make of today?';
  if (completionRate === 100) return 'Everything done. That\'s a complete day.';
  if (completionRate >= 75) return 'Almost there. One task at a time.';
  if (completionRate >= 50) return 'Halfway through. The momentum is yours.';
  if (completionRate > 0) return 'You\'ve started. That\'s the hardest part.';
  return 'The work is waiting. Begin anywhere.';
}

const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };

export const DailyDigest: React.FC<DailyDigestProps> = ({
  tasks,
  user,
  onCarryForward,
  onViewChange,
}) => {
  const todayTasks = useMemo(() => tasks.filter(t => isToday(parseISO(t.date))), [tasks]);
  const overdueTasks = useMemo(
    () => tasks.filter(t => !t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date))),
    [tasks]
  );
  const yesterdayOverdue = useMemo(
    () => tasks.filter(t => !t.completed && isYesterday(parseISO(t.date))),
    [tasks]
  );

  const completed = todayTasks.filter(t => t.completed).length;
  const total = todayTasks.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const priorityTasks = useMemo(
    () =>
      todayTasks
        .filter(t => !t.completed && !t.parentId)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
        .slice(0, 4),
    [todayTasks]
  );

  const highCount = todayTasks.filter(t => t.priority === 'high' && !t.completed).length;

  const { greeting, sub } = getGreeting(user.email);
  const motivation = getMotivation(rate, total);

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#6B8D86] mb-2">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <h2 className="text-3xl font-serif italic text-[#1A3142]">{greeting}</h2>
        <p className="text-sm text-[#6B8D86] mt-1">{sub}</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-white/90 border border-[#D6EBE1] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86]">Today</span>
            <Target className="w-3.5 h-3.5 text-[#6B8D86]" />
          </div>
          <p className="text-2xl font-serif italic text-[#1D3441]">{total}</p>
          <p className="text-[10px] text-[#9AB8AF] mt-1">{completed} done</p>
        </div>

        <div className={cn(
          "border rounded-2xl p-4 shadow-sm",
          overdueTasks.length > 0 ? "bg-amber-50/80 border-amber-200/60" : "bg-white/90 border-[#D6EBE1]"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86]">Overdue</span>
            <AlertCircle className={cn("w-3.5 h-3.5", overdueTasks.length > 0 ? "text-amber-500" : "text-[#6B8D86]")} />
          </div>
          <p className="text-2xl font-serif italic text-[#1D3441]">{overdueTasks.length}</p>
          <p className="text-[10px] text-[#9AB8AF] mt-1">
            {overdueTasks.length === 0 ? 'all clear' : 'need attention'}
          </p>
        </div>

        <div className={cn(
          "border rounded-2xl p-4 shadow-sm",
          rate === 100 ? "bg-[#ECF9F2] border-[#CBE7D9]" : "bg-white/90 border-[#D6EBE1]"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86]">Done</span>
            <Flame className={cn("w-3.5 h-3.5", rate >= 50 ? "text-[#13B96D]" : "text-[#6B8D86]")} />
          </div>
          <p className="text-2xl font-serif italic text-[#1D3441]">{rate}%</p>
          <div className="mt-1 h-1 bg-[#E4F0EB] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rate}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-full bg-[#13B96D] rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Carry Forward Banner */}
      {yesterdayOverdue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-between p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-[#1D3441]">
              <span className="font-semibold">{yesterdayOverdue.length} tasks</span> left over from yesterday.
            </p>
          </div>
          <button
            onClick={onCarryForward}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors shrink-0"
          >
            Carry forward <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* High Priority Alert */}
      {highCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 p-4 bg-red-50/60 border border-red-200/50 rounded-2xl"
        >
          <Zap className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-[#1D3441]">
            <span className="font-semibold text-red-500">{highCount} high-priority</span> task{highCount > 1 ? 's' : ''} need your attention today.
          </p>
        </motion.div>
      )}

      {/* Today's Focus */}
      {priorityTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">
              Today's Focus
            </h3>
            <button
              onClick={() => onViewChange('today')}
              className="text-[10px] font-mono uppercase tracking-widest text-[#12935A] hover:text-[#0F7A48] transition-colors"
            >
              See all →
            </button>
          </div>

          <div className="space-y-2">
            {priorityTasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="flex items-center gap-3 p-4 bg-white/90 border border-[#D6EBE1] rounded-2xl group hover:border-[#B7DDCC] hover:shadow-sm transition-all"
              >
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  task.priority === 'high' ? 'bg-red-400' : task.priority === 'low' ? 'bg-[#46C488]' : 'bg-[#9FC1B4]'
                )} />
                <p className="flex-1 text-sm font-medium text-[#1D3441] truncate">{task.text}</p>
                {task.time && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-[#8AA89C] shrink-0">
                    <Clock className="w-3 h-3" />
                    {task.time}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="py-16 flex flex-col items-center gap-4 text-center"
        >
          <CheckCircle2 className="w-10 h-10 text-[#B4D9CA]" />
          <p className="text-lg font-serif italic text-[#8AA89C]">Nothing planned yet for today.</p>
          <p className="text-sm text-[#9AB8AF]">Use the input above to add your first task.</p>
        </motion.div>
      )}

      {/* All done state */}
      {total > 0 && rate === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-10 flex flex-col items-center gap-3 text-center bg-[#ECF9F2] border border-[#CBE7D9] rounded-3xl"
        >
          <CheckCircle2 className="w-10 h-10 text-[#13B96D]" />
          <p className="text-xl font-serif italic text-[#1A3142]">Day complete.</p>
          <p className="text-sm text-[#5B7A75]">Every task done. Take a moment to breathe.</p>
        </motion.div>
      )}

      {/* Motivational footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs font-serif italic text-[#9AB8AF] pt-4 border-t border-[#E4F0EB]"
      >
        {motivation}
      </motion.p>
    </div>
  );
};
