import React, { useState } from 'react';
import { Task } from '../types';
import { format, isToday, parseISO, startOfToday } from 'date-fns';
import {
  TrendingUp, CheckCircle2, AlertCircle, Calendar, Clock,
  Tag, X, Crown, Repeat2, Timer, Sparkles, LayoutList,
} from 'lucide-react';
import { cn } from './Sidebar';
import { InsightsPanel } from './InsightsPanel';

interface ContextPanelProps {
  tasks: Task[];
  selectedDate: Date;
  selectedTask?: Task | null;
  onUpgrade: () => void;
  className?: string;
  onClose?: () => void;
  isPro?: boolean;
}

function recurrenceLabel(r: NonNullable<Task['recurrence']>): string {
  if (r.interval === 1) {
    if (r.type === 'daily') return 'Every day';
    if (r.type === 'weekly') {
      if (r.daysOfWeek?.length) return 'Every ' + r.daysOfWeek.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ');
      return 'Every week';
    }
    if (r.type === 'monthly') return 'Every month';
    if (r.type === 'yearly')  return 'Every year';
  }
  return `Every ${r.interval} ${r.type === 'daily' ? 'days' : r.type === 'weekly' ? 'weeks' : r.type === 'monthly' ? 'months' : 'years'}`;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  tasks, selectedDate, selectedTask, onUpgrade, className, onClose, isPro,
}) => {
  const [tab, setTab] = useState<'overview' | 'insights'>('overview');

  const completedToday = tasks.filter(t => t.completed && isToday(parseISO(t.date))).length;
  const overdueCount   = tasks.filter(t => !t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date))).length;
  const dayTasks       = tasks.filter(t => isToday(parseISO(t.date)));
  const completionRate = dayTasks.length > 0 ? Math.round((dayTasks.filter(t => t.completed).length / dayTasks.length) * 100) : 0;
  const allDoneToday   = dayTasks.length > 0 && dayTasks.every(t => t.completed);
  const subtasks       = selectedTask ? tasks.filter(t => t.parentId === selectedTask.id) : [];
  const subtasksDone   = subtasks.filter(t => t.completed).length;
  const card           = 'bg-white/90 border-[#D6ECE1]';

  return (
    <div className={cn('w-80 border-l h-full flex flex-col overflow-hidden border-[#D7ECE2] bg-[#F2FBF6]/80', className)}>

      {/* Header */}
      <div className="flex-none px-6 pt-6 pb-3 space-y-3">
        {onClose && (
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">
              {selectedTask ? 'Task details' : 'Panel'}
            </p>
            <button onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#D5EADF] bg-white/90 text-[#5E7B76] hover:text-[#1A3142] transition-all">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab strip — only when no task selected */}
        {!selectedTask && (
          <div className="flex items-center gap-1 p-1 rounded-2xl border border-[#D5EADF] bg-white/60">
            {([
              { id: 'overview' as const,  label: 'Overview', icon: <LayoutList className="w-3.5 h-3.5" /> },
              { id: 'insights' as const,  label: 'Insights', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
                  tab === t.id ? 'bg-white text-[#12935A] shadow-sm border border-[#D5EADF]' : 'text-[#84ADA4] hover:text-[#1A3142]'
                )}>
                {t.icon}{t.label}
                {t.id === 'insights' && !isPro && (
                  <span className="ml-0.5 text-[8px] font-black px-1 py-0.5 rounded-full"
                    style={{ background: 'rgba(19,185,109,0.15)', color: '#0D8A4E' }}>PRO</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-4">

        {/* ── TASK SELECTED ── */}
        {selectedTask ? (
          <div className="space-y-4 pt-1">
            <div className={cn('p-5 rounded-2xl border', card)}>
              <p className="text-base font-serif italic text-[#1D3441] mb-4 leading-snug">{selectedTask.text}</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-xs text-[#6B8D86]"><Calendar className="w-4 h-4 flex-shrink-0" />{format(parseISO(selectedTask.date), 'MMMM d, yyyy')}</div>
                {selectedTask.time && <div className="flex items-center gap-3 text-xs text-[#6B8D86]"><Clock className="w-4 h-4 flex-shrink-0" />{selectedTask.time}</div>}
                <div className="flex items-center gap-3 text-xs text-[#6B8D86]"><Tag className="w-4 h-4 flex-shrink-0" />Priority: <span className="capitalize font-medium text-[#1D3441]">{selectedTask.priority}</span></div>
                {selectedTask.duration && <div className="flex items-center gap-3 text-xs text-[#6B8D86]"><Timer className="w-4 h-4 flex-shrink-0" />Est. {selectedTask.duration < 60 ? `${selectedTask.duration}m` : `${Math.round(selectedTask.duration/60*10)/10}h`}</div>}
                {selectedTask.recurrence && <div className="flex items-center gap-3 text-xs text-[#6B8D86]"><Repeat2 className="w-4 h-4 flex-shrink-0" />{recurrenceLabel(selectedTask.recurrence)}</div>}
              </div>
            </div>

            {(selectedTask as any).notes && (
              <div className={cn('p-4 rounded-2xl border', card)}>
                <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#84ADA4] mb-2">Notes</p>
                <p className="text-sm text-[#4A6862] leading-relaxed whitespace-pre-wrap">{(selectedTask as any).notes}</p>
              </div>
            )}

            {subtasks.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86]">Subtasks</p>
                  <span className="text-[10px] font-mono text-[#6B8D86]">{subtasksDone}/{subtasks.length}</span>
                </div>
                <div className="h-1.5 bg-[#E4F0EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#13B96D] rounded-full transition-all duration-500" style={{ width: `${(subtasksDone/subtasks.length)*100}%` }} />
                </div>
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2.5 text-xs text-[#6B8D86]">
                    <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', s.completed ? 'bg-[#13B96D] border-[#13B96D]' : 'border-[#BCD8CC]')}>
                      {s.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={cn(s.completed && 'line-through text-[#9AB8AF]')}>{s.text}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedTask.tags.filter(t => t !== 'subtask' && t !== 'parent').length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTask.tags.filter(t => t !== 'subtask' && t !== 'parent').map(tag => (
                  <span key={tag} className="text-[10px] font-mono text-[#139C5E] bg-[#E8F5EF] px-2.5 py-1 rounded-lg uppercase tracking-widest">#{tag}</span>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-[#D7ECE2]">
              {isPro
                ? <div className="p-3.5 rounded-2xl border bg-[#ECF9F2] border-[#CBE7D9] flex items-center gap-3"><Crown className="w-4 h-4 text-[#13B96D] shrink-0" /><p className="text-sm font-semibold text-[#1D3441]">Pro Member</p></div>
                : <button onClick={onUpgrade} className="w-full py-3 rounded-2xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#13B96D,#0D8A4E)' }}>Upgrade to Pro →</button>
              }
            </div>
          </div>

        ) : tab === 'insights' ? (
          /* ── INSIGHTS TAB ── */
          <div className="pt-1">
            <InsightsPanel tasks={tasks} isPro={!!isPro} onUpgrade={onUpgrade} compact />
          </div>

        ) : (
          /* ── OVERVIEW TAB ── */
          <div className="space-y-4 pt-1">
            {allDoneToday ? (
              <div className="p-5 rounded-2xl border bg-[#ECF9F2] border-[#CBE7D9] text-center">
                <CheckCircle2 className="w-7 h-7 text-[#139C5E] mx-auto mb-2" />
                <p className="text-sm font-serif italic text-[#1F5643]">You're done for today.</p>
              </div>
            ) : (
              <div className={cn('p-4 rounded-2xl border', card)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#6B8D86]">Today's rate</span>
                  <TrendingUp className="w-3.5 h-3.5 text-[#139C5E]" />
                </div>
                <div className="text-2xl font-serif italic text-[#1D3441]">{completionRate}%</div>
                <div className="mt-2 h-1.5 bg-[#E4F0EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#13B96D] rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className={cn('p-4 rounded-2xl border', card)}>
                <div className="flex items-center justify-between mb-1.5"><span className="text-[10px] text-[#6B8D86]">Done today</span><CheckCircle2 className="w-3.5 h-3.5 text-[#139C5E]" /></div>
                <div className="text-xl font-serif italic text-[#1D3441]">{completedToday}</div>
              </div>
              <div className={cn('p-4 rounded-2xl border', card)}>
                <div className="flex items-center justify-between mb-1.5"><span className="text-[10px] text-[#6B8D86]">Overdue</span><AlertCircle className="w-3.5 h-3.5 text-amber-500" /></div>
                <div className="text-xl font-serif italic text-[#1D3441]">{overdueCount}</div>
              </div>
            </div>

            <div className={cn('p-4 rounded-2xl border', card)}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86] mb-1.5">{format(selectedDate, 'MMM d · EEEE')}</p>
              <p className="text-sm font-medium text-[#1D3441]">{tasks.filter(t => t.date === format(selectedDate, 'yyyy-MM-dd')).length} tasks planned</p>
            </div>

            {/* Insights teaser */}
            <div className="relative overflow-hidden rounded-2xl border border-[#D5EADF]" style={{ background: 'rgba(19,185,109,0.04)' }}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#13B96D]" />
                  <span className="text-xs font-bold text-[#1A3240]">Productivity Insights</span>
                  {!isPro && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(19,185,109,0.15)', color: '#0D8A4E' }}>PRO</span>}
                </div>
                {isPro ? (
                  <button onClick={() => setTab('insights')} className="w-full text-left text-xs text-[#4A7568] hover:text-[#13B96D] transition-colors">
                    View your full productivity report →
                  </button>
                ) : (
                  <>
                    <p className="text-xs text-[#4A7568] mb-3 leading-relaxed">Peak day, ghost tasks, tag analysis and your personal productivity score — from your own data.</p>
                    <button onClick={onUpgrade} className="w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#13B96D', boxShadow: '0 0 16px rgba(19,185,109,0.3)' }}>
                      Unlock Insights → Pro
                    </button>
                  </>
                )}
              </div>
            </div>

            {isPro && (
              <div className="p-4 rounded-2xl border bg-[#ECF9F2] border-[#CBE7D9] flex items-center gap-3">
                <Crown className="w-4 h-4 text-[#13B96D] shrink-0" /><div><p className="text-sm font-semibold text-[#1D3441]">Pro Member</p><p className="text-[10px] text-[#6B8D86]">All features unlocked</p></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
