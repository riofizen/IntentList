import React, { useState, useRef, useEffect } from 'react';
import { Task, Priority } from '../types';
import { cn } from './Sidebar';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Check, Trash2, Clock, CalendarPlus, Wand2, Repeat2, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseIntent } from '../lib/parser';

interface TaskListProps {
  tasks: Task[];
  allTasks?: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: Priority) => void;
  onEdit?: (id: string, updates: Partial<Task>) => void;
  onSelect?: (id: string) => void;
  onMoveToToday?: (id: string) => void;
  onBreakdown?: (id: string) => void;
  selectedTaskId?: string | null;
  title?: string;
  isBreakingDown?: string | null;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  allTasks = [],
  onToggle,
  onDelete,
  onUpdatePriority,
  onEdit,
  onSelect,
  onMoveToToday,
  onBreakdown,
  selectedTaskId,
  title,
  isBreakingDown,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onEdit) return;
    setEditingId(task.id);
    setEditValue(task.raw ?? task.text);
  };

  const commitEdit = (task: Task) => {
    if (!onEdit || !editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === (task.raw ?? task.text)) {
      cancelEdit();
      return;
    }
    // Re-parse the edited text so dates/tags/priority update
    const parsed = parseIntent(trimmed, parseISO(task.date));
    onEdit(task.id, {
      text: parsed.text,
      date: format(parsed.date, 'yyyy-MM-dd'),
      time: parsed.time,
      priority: parsed.priority,
      tags: parsed.tags,
    });
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(task); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'low':  return 'bg-[#46C488]';
      default:     return 'bg-[#9FC1B4]';
    }
  };

  const toggleSubtasks = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubtasks(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const getSubtasks = (parentId: string) => allTasks.filter(t => t.parentId === parentId);

  const recurrenceLabel = (r: NonNullable<Task['recurrence']>) => {
    if (r.interval === 1) {
      if (r.type === 'daily') return 'Daily';
      if (r.type === 'weekly') {
        if (r.daysOfWeek?.length) {
          const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          return 'Every ' + r.daysOfWeek.map(d => names[d]).join(', ');
        }
        return 'Weekly';
      }
      if (r.type === 'monthly') return 'Monthly';
      if (r.type === 'yearly')  return 'Yearly';
    }
    return `Every ${r.interval} ${r.type === 'daily' ? 'd' : r.type === 'weekly' ? 'w' : 'm'}`;
  };

  return (
    <div className="space-y-8">
      {title && (
        <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86] px-2">{title}</h2>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {tasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <p className="text-[#8AA89C] italic font-serif text-lg">Your mind is clear.</p>
            </motion.div>
          ) : (
            tasks.map(task => {
              const subtasks    = getSubtasks(task.id);
              const subtasksDone = subtasks.filter(t => t.completed).length;
              const hasSubtasks = subtasks.length > 0;
              const isExpanded  = expandedSubtasks.has(task.id);
              const isEditing   = editingId === task.id;

              return (
                <motion.div
                  layout
                  key={task.id}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className={cn(
                    'rounded-[1.5rem] border transition-all duration-300 overflow-hidden',
                    task.completed
                      ? 'bg-[#F2FBF6] border-[#DDEFE6] opacity-60'
                      : 'bg-white/90 border-[#D6EBE1] hover:border-[#B7DDCC] hover:shadow-[0_8px_30px_rgb(29,73,58,0.08)]',
                    selectedTaskId === task.id && !isEditing && 'ring-2 ring-[#13B96D]/12 border-[#13B96D]/35 bg-[#EAF7F1]/80',
                    isEditing && 'ring-2 ring-[#13B96D]/30 border-[#13B96D]/50 bg-[#EAF7F1]/60'
                  )}
                >
                  {/* Main task row */}
                  <div
                    onClick={() => !isEditing && onSelect?.(task.id)}
                    onDoubleClick={e => !task.completed && startEdit(task, e)}
                    className="group flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5 cursor-default"
                    title={onEdit && !task.completed ? "Double-click to edit" : undefined}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={e => { e.stopPropagation(); onToggle(task.id); }}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0',
                        task.completed
                          ? 'bg-[#13B96D] border-[#13B96D] text-white'
                          : 'border-[#BCD8CC] hover:border-[#13B96D]/60'
                      )}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1 self-stretch">
                      {isEditing ? (
                        /* ── Inline editor ── */
                        <div className="flex items-center gap-2">
                          <input
                            ref={editInputRef}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => handleEditKeyDown(e, task)}
                            onBlur={() => commitEdit(task)}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 min-w-0 bg-transparent text-base font-medium text-[#1D3441] tracking-tight focus:outline-none border-b-2 border-[#13B96D]/50 pb-0.5"
                            placeholder="Edit task…"
                          />
                          <button
                            onMouseDown={e => { e.preventDefault(); commitEdit(task); }}
                            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-[#13B96D] text-white transition-all hover:bg-[#0FAA64]"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <button
                            onMouseDown={e => { e.preventDefault(); cancelEdit(); }}
                            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border border-[#CDE4D8] text-[#7D9A90] transition-all hover:text-red-500 hover:border-red-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* ── Normal view ── */
                        <>
                          <div className="flex items-start gap-3 sm:items-center">
                            <div className={cn('w-2 h-2 rounded-full shrink-0 shadow-sm mt-1.5 sm:mt-0', getPriorityColor(task.priority))} />
                            <p className={cn(
                              'text-base text-[#1D3441] transition-all duration-500 tracking-tight font-medium break-words sm:truncate',
                              task.completed && 'line-through text-[#88A79B]'
                            )}>
                              {task.text}
                            </p>
                          </div>
                          <div className="mt-2 ml-5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span className="text-[10px] text-[#6B8D86] font-mono tracking-widest uppercase">
                              {formatDateLabel(task.date)}
                            </span>
                            {task.time && (
                              <span className="flex items-center gap-1.5 text-[10px] text-[#6B8D86] font-mono tracking-widest uppercase">
                                <Clock className="w-3 h-3" />{task.time}
                              </span>
                            )}
                            {task.recurrence && (
                              <span className="flex items-center gap-1 text-[10px] text-[#139C5E] font-mono tracking-widest uppercase">
                                <Repeat2 className="w-3 h-3" />{recurrenceLabel(task.recurrence)}
                              </span>
                            )}
                            {task.tags?.filter(t => t !== 'subtask' && t !== 'parent').map(tag => (
                              <span key={tag} className="text-[10px] font-mono text-[#139C5E] uppercase tracking-widest">
                                #{tag}
                              </span>
                            ))}
                            {hasSubtasks && (
                              <span className="text-[10px] text-[#6B8D86] font-mono">
                                {subtasksDone}/{subtasks.length} subtasks
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action buttons — only shown when not editing */}
                    {!isEditing && (
                      <div className="flex w-full flex-wrap items-center gap-2 pt-1 opacity-100 transition-all duration-500 sm:w-auto sm:justify-end sm:pt-0 md:opacity-0 md:group-hover:opacity-100">
                        {/* Edit button */}
                        {onEdit && !task.completed && (
                          <button
                            onClick={e => startEdit(task, e)}
                            title="Edit task"
                            className="p-2.5 text-[#7D9A90] hover:text-[#12935A] transition-all duration-300 rounded-xl hover:bg-[#F2FBF6]"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {hasSubtasks && (
                          <button onClick={e => toggleSubtasks(task.id, e)} title="Toggle subtasks"
                            className="p-2.5 text-[#7D9A90] hover:text-[#12935A] transition-all duration-300 rounded-xl hover:bg-[#F2FBF6]">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}

                        {onBreakdown && !task.completed && !task.parentId && (
                          <button
                            onClick={e => { e.stopPropagation(); onBreakdown(task.id); }}
                            title="Break into subtasks"
                            className={cn(
                              'p-2.5 text-[#7D9A90] hover:text-[#12935A] transition-all duration-300 rounded-xl hover:bg-[#F2FBF6]',
                              isBreakingDown === task.id && 'animate-pulse text-[#12935A]'
                            )}>
                            <Wand2 className="w-4 h-4" />
                          </button>
                        )}

                        {onMoveToToday && !isToday(parseISO(task.date)) && (
                          <button
                            onClick={e => { e.stopPropagation(); onMoveToToday(task.id); }}
                            title="Move to Today"
                            className="p-2.5 text-[#7D9A90] hover:text-[#12935A] transition-all duration-300 rounded-xl hover:bg-[#F2FBF6]">
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                        )}

                        <select
                          value={task.priority}
                          onChange={e => { e.stopPropagation(); onUpdatePriority(task.id, e.target.value as Priority); }}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] bg-[#F2FBF6] border border-[#CDE4D8] text-[#5C7B76] hover:text-[#173D35] focus:ring-0 cursor-pointer rounded-lg px-2 py-1 appearance-none font-mono tracking-widest uppercase"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                        </select>

                        <button
                          onClick={e => { e.stopPropagation(); onDelete(task.id); }}
                          className="p-2.5 text-[#7D9A90] hover:text-red-500 transition-all duration-300 rounded-xl hover:bg-[#F2FBF6]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Subtask progress bar */}
                  {hasSubtasks && subtasksDone < subtasks.length && !isEditing && (
                    <div className="mx-5 mb-3 h-1 bg-[#E4F0EB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#13B96D] rounded-full transition-all duration-500"
                        style={{ width: `${(subtasksDone / subtasks.length) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Expanded subtask list */}
                  <AnimatePresence>
                    {hasSubtasks && isExpanded && !isEditing && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        className="overflow-hidden">
                        <div className="px-5 pb-4 space-y-2 border-t border-[#E8F5EF] pt-3">
                          {subtasks.map(sub => (
                            <div key={sub.id} className="flex items-center gap-3">
                              <button
                                onClick={e => { e.stopPropagation(); onToggle(sub.id); }}
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0',
                                  sub.completed ? 'bg-[#13B96D] border-[#13B96D]' : 'border-[#BCD8CC] hover:border-[#13B96D]/60'
                                )}>
                                {sub.completed && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                              </button>
                              <p className={cn('text-sm text-[#4A6862] flex-1', sub.completed && 'line-through text-[#9AB8AF]')}>
                                {sub.text}
                              </p>
                              <button
                                onClick={e => { e.stopPropagation(); onDelete(sub.id); }}
                                className="p-1.5 text-[#9AB8AF] hover:text-red-400 transition-colors rounded-lg">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Edit hint */}
      {onEdit && tasks.some(t => !t.completed) && (
        <p className="text-[9px] font-mono uppercase tracking-[0.28em] text-[#9AB8AF] text-center pt-2">
          Double-click any task to edit
        </p>
      )}
    </div>
  );
};
