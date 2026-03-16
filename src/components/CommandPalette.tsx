import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, ViewType } from '../types';
import { parseISO, isToday, isTomorrow, format } from 'date-fns';
import {
  Search, Clock, CheckCircle2, Calendar, List, History,
  Timer, Sunrise, BarChart3, LayoutTemplate, ArrowRight,
  Check, X, Flame, CalendarDays, Dumbbell,
} from 'lucide-react';
import { cn } from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  type: 'task' | 'view' | 'template' | 'action';
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  keywords: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onViewChange: (view: ViewType) => void;
  onSelectTask: (id: string) => void;
  onToggleTask: (id: string) => void;
}

// ─── View definitions ─────────────────────────────────────────────────────────

const VIEWS: Array<{ id: ViewType; label: string; icon: React.ReactNode; shortcut?: string }> = [
  { id: 'digest',    label: 'Daily Digest',   icon: <Sunrise className="w-4 h-4" />,   shortcut: 'd' },
  { id: 'today',     label: 'Today',           icon: <Clock className="w-4 h-4" />,     shortcut: 't' },
  { id: 'overdue',   label: 'Overdue',         icon: <CheckCircle2 className="w-4 h-4" />, shortcut: 'o' },
  { id: 'upcoming',  label: 'Upcoming',        icon: <CalendarDays className="w-4 h-4" />, shortcut: 'u' },
  { id: 'all',       label: 'All Tasks',       icon: <List className="w-4 h-4" />,      shortcut: 'a' },
  { id: 'calendar',  label: 'Calendar',        icon: <Calendar className="w-4 h-4" /> },
  { id: 'timeline',  label: 'Timeline',        icon: <History className="w-4 h-4" /> },
  { id: 'weekly',    label: 'Weekly Review',   icon: <BarChart3 className="w-4 h-4" />, shortcut: 'w' },
  { id: 'habits',    label: 'Habit Tracker',   icon: <Dumbbell className="w-4 h-4" /> },
  { id: 'pomodoro',  label: 'Focus Timer',     icon: <Timer className="w-4 h-4" /> },
  { id: 'templates', label: 'Templates',       icon: <LayoutTemplate className="w-4 h-4" /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fuzzy(query: string, target: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const t = target.toLowerCase();
  // Exact substring first
  if (t.includes(q)) return true;
  // Fuzzy: all chars of query appear in order in target
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function taskDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d))    return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d');
}

const priorityDot: Record<string, string> = {
  high:   'bg-red-400',
  normal: 'bg-[#9FC1B4]',
  low:    'bg-[#46C488]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen, onClose, tasks, onViewChange, onSelectTask, onToggleTask,
}) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const itemRefs  = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build all command items
  const allItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Views
    VIEWS.forEach(v => {
      items.push({
        id: `view-${v.id}`,
        type: 'view',
        label: `Go to ${v.label}`,
        sublabel: v.shortcut ? `Press ${v.shortcut}` : undefined,
        icon: v.icon,
        keywords: `${v.label} ${v.id} ${v.shortcut ?? ''} navigate view`,
        onSelect: () => { onViewChange(v.id as ViewType); onClose(); },
      });
    });

    // Tasks
    tasks.slice(0, 80).forEach(task => {
      items.push({
        id: `task-${task.id}`,
        type: 'task',
        label: task.text,
        sublabel: `${taskDateLabel(task.date)}${task.time ? ' · ' + task.time : ''}${task.tags.length ? ' · ' + task.tags.map(t => '#' + t).join(' ') : ''}`,
        icon: (
          <div className={cn('w-3 h-3 rounded-full flex-shrink-0', task.completed ? 'bg-[#13B96D]' : priorityDot[task.priority] ?? 'bg-[#9FC1B4]')}>
            {task.completed && <Check className="w-2 h-2 text-white stroke-[3]" />}
          </div>
        ),
        keywords: `${task.text} ${task.tags.join(' ')} ${task.date} task`,
        onSelect: () => { onSelectTask(task.id); onClose(); },
      });
    });

    return items;
  }, [tasks, onViewChange, onSelectTask, onClose]);

  // Filtered results
  const results = useMemo(() => {
    if (!query.trim()) {
      // Default: show views first, then today's incomplete tasks
      return [
        ...allItems.filter(i => i.type === 'view').slice(0, 5),
        ...allItems.filter(i => i.type === 'task' && !tasks.find(t => t.id === i.id.replace('task-', ''))?.completed).slice(0, 6),
      ];
    }
    return allItems
      .filter(item => fuzzy(query, item.keywords))
      .slice(0, 12);
  }, [query, allItems, tasks]);

  // Group results
  const grouped = useMemo(() => {
    const views   = results.filter(r => r.type === 'view');
    const taskRes = results.filter(r => r.type === 'task');
    return [
      ...(views.length   ? [{ label: 'Navigate', items: views }]   : []),
      ...(taskRes.length ? [{ label: 'Tasks',    items: taskRes }]  : []),
    ];
  }, [results]);

  // Flat list for keyboard nav
  const flatItems = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { onClose(); return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor(c => Math.min(c + 1, flatItems.length - 1)); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); return; }
      if (e.key === 'Enter')      { e.preventDefault(); flatItems[cursor]?.onSelect(); return; }

      // Tab to cycle through items
      if (e.key === 'Tab') {
        e.preventDefault();
        setCursor(c => e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, flatItems.length - 1));
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, cursor, flatItems, onClose]);

  // Scroll active item into view
  useEffect(() => {
    itemRefs.current[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="fixed left-1/2 top-[15%] z-[201] w-full max-w-xl -translate-x-1/2 rounded-3xl border shadow-2xl overflow-hidden"
            style={{ background: 'rgba(5,15,10,0.97)', borderColor: 'rgba(19,185,109,0.2)' }}
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: '#4E9972' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(0); }}
                placeholder="Search tasks, navigate views…"
                className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:font-normal"
                style={{ color: '#E2F4EC', caretColor: '#13B96D' }}
              />
              {query && (
                <button onClick={() => setQuery('')} className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" style={{ color: '#E2F4EC' }} />
                </button>
              )}
              <kbd className="flex-shrink-0 text-[10px] px-2 py-1 rounded-lg font-mono"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto max-h-[380px] py-2 custom-scrollbar">
              {flatItems.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-serif italic" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    No results for "{query}"
                  </p>
                </div>
              ) : (
                grouped.map((group, gi) => {
                  let itemIndex = grouped.slice(0, gi).reduce((acc, g) => acc + g.items.length, 0);
                  return (
                    <div key={group.label}>
                      <p className="px-5 py-1.5 text-[9px] font-bold uppercase tracking-[0.35em]"
                        style={{ color: 'rgba(255,255,255,0.25)' }}>{group.label}</p>
                      {group.items.map(item => {
                        const idx = itemIndex++;
                        const isActive = cursor === idx;
                        const task = item.type === 'task' ? tasks.find(t => t.id === item.id.replace('task-', '')) : null;
                        return (
                          <button
                            key={item.id}
                            ref={el => { itemRefs.current[idx] = el; }}
                            onClick={() => item.onSelect()}
                            onMouseEnter={() => setCursor(idx)}
                            className={cn(
                              'w-full flex items-center gap-3.5 px-5 py-3 text-left transition-all duration-100',
                              isActive ? 'bg-[rgba(19,185,109,0.12)]' : 'hover:bg-[rgba(255,255,255,0.04)]'
                            )}
                          >
                            {/* Icon */}
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl"
                              style={{ background: isActive ? 'rgba(19,185,109,0.2)' : 'rgba(255,255,255,0.05)', color: isActive ? '#13B96D' : '#4E9972' }}>
                              {item.icon}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium truncate', task?.completed && 'line-through opacity-60')}
                                style={{ color: isActive ? '#E2F4EC' : 'rgba(255,255,255,0.8)' }}>
                                {item.label}
                              </p>
                              {item.sublabel && (
                                <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {item.sublabel}
                                </p>
                              )}
                            </div>

                            {/* Right side action */}
                            {task && !task.completed && (
                              <button
                                onClick={e => { e.stopPropagation(); onToggleTask(task.id); }}
                                className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border transition-all opacity-0 group-hover:opacity-100"
                                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)' }}
                                title="Complete task"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </button>
                            )}
                            {!task && isActive && (
                              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#13B96D' }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                {[
                  { key: '↑↓', label: 'navigate' },
                  { key: '↵',  label: 'select'   },
                  { key: 'esc',label: 'close'     },
                ].map(({ key, label }) => (
                  <span key={key} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>{key}</kbd>
                    {label}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {flatItems.length} result{flatItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
