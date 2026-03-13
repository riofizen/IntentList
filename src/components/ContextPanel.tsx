import React from 'react';
import { Task } from '../types';
import { format, isToday, parseISO, startOfToday } from 'date-fns';
import { TrendingUp, CheckCircle2, AlertCircle, Calendar, Clock, Tag, X } from 'lucide-react';
import { cn } from './Sidebar';

interface ContextPanelProps {
  tasks: Task[];
  selectedDate: Date;
  selectedTask?: Task | null;
  onUpgrade: () => void;
  className?: string;
  onClose?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ tasks, selectedDate, selectedTask, onUpgrade, className, onClose }) => {
  const completedToday = tasks.filter(t => t.completed && isToday(parseISO(t.createdAt))).length;
  const overdueCount = tasks.filter(t => !t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date))).length;
  
  const dayTasks = tasks.filter(t => isToday(parseISO(t.date)));
  const completionRate = dayTasks.length > 0 
    ? Math.round((dayTasks.filter(t => t.completed).length / dayTasks.length) * 100)
    : 0;

  const allCompletedToday = dayTasks.length > 0 && dayTasks.every(t => t.completed);

  return (
    <div className={cn("w-80 border-l border-[#D7ECE2] h-full bg-[#F2FBF6]/80 p-8 space-y-10 overflow-y-auto custom-scrollbar", className)}>
      {onClose && (
        <div className="-mt-1 mb-2 flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">
            {selectedTask ? 'Task details' : 'Insights'}
          </p>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D5EADF] bg-white/90 text-[#5E7B76] transition hover:text-[#1A3142]"
            aria-label="Close insights"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {selectedTask ? (
        <section className="space-y-8">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86]">
            Task Details
          </h3>
          <div className="space-y-6">
            <div className="bg-white/90 p-6 rounded-3xl border border-[#D6ECE1] shadow-sm">
              <p className="text-lg font-serif italic text-[#1D3441] mb-4">{selectedTask.text}</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-[#5E7B76]">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(selectedTask.date), 'MMMM d, yyyy')}
                </div>
                {selectedTask.time && (
                  <div className="flex items-center gap-3 text-xs text-[#5E7B76]">
                    <Clock className="w-4 h-4" />
                    {selectedTask.time}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-[#5E7B76]">
                  <Tag className="w-4 h-4" />
                  Priority: <span className="capitalize font-medium text-[#1D3441]">{selectedTask.priority}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section>
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86] mb-6">
              Daily Overview
            </h3>
            <div className="space-y-4">
              {allCompletedToday ? (
                <div className="bg-[#ECF9F2] p-6 rounded-3xl border border-[#CBE7D9] text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#139C5E] mx-auto mb-3" />
                  <p className="text-sm font-serif italic text-[#1F5643]">You're done for today.</p>
                </div>
              ) : (
                <div className="bg-white/90 p-4 rounded-2xl border border-[#D6ECE1] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#5E7B76]">Completion Rate</span>
                    <TrendingUp className="w-3 h-3 text-[#139C5E]" />
                  </div>
                  <div className="text-2xl font-serif italic text-[#1D3441]">{completionRate}%</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/90 p-4 rounded-2xl border border-[#D6ECE1] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#5E7B76]">Done</span>
                    <CheckCircle2 className="w-3 h-3 text-[#139C5E]" />
                  </div>
                  <div className="text-xl font-serif italic text-[#1D3441]">{completedToday}</div>
                </div>
                <div className="bg-white/90 p-4 rounded-2xl border border-[#D6ECE1] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#5E7B76]">Overdue</span>
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                  </div>
                  <div className="text-xl font-serif italic text-[#1D3441]">{overdueCount}</div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#6B8D86] mb-6">
              Summary for {format(selectedDate, 'MMM d')}
            </h3>
            <div className="space-y-1">
              <div className="text-sm font-medium text-[#1D3441]">
                {format(selectedDate, 'EEEE')}
              </div>
              <div className="text-xs text-[#6B8D86]">
                {tasks.filter(t => t.date === format(selectedDate, 'yyyy-MM-dd')).length} tasks planned
              </div>
            </div>
          </section>
        </>
      )}

      <div className="pt-10 border-t border-[#D7ECE2]">
        <div className="p-6 bg-[#173D35] rounded-3xl text-white relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-sm font-medium mb-2">Go Pro</h4>
            <p className="text-[10px] text-[#B8D8CC] mb-4 leading-relaxed">
              Unlimited tasks, advanced parsing, and life history search.
            </p>
            <button 
              onClick={onUpgrade}
              className="w-full py-2 bg-white text-[#173D35] text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#E2F3EA] transition-colors"
            >
              Upgrade Now
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#1F4D43] rounded-full blur-2xl group-hover:bg-[#266050] transition-all" />
        </div>
      </div>
    </div>
  );
};
