import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, parseISO, isToday } from 'date-fns';
import {
  Plus, X, Flame, Check, Trophy, Zap, ChevronRight,
  Sun, Dumbbell, BookOpen, Heart, Droplets, Brain,
  Pencil, MoreHorizontal,
} from 'lucide-react';
import { cn } from '../App';
import { useLocalStorage } from '../lib/useLocalStorage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** ISO date strings of completed days */
  completedDates: string[];
  createdAt: string;
  /** Target — how many times per week (1-7) */
  frequency: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ICONS = [
  { id: 'sun',       emoji: '☀️', icon: Sun       },
  { id: 'dumbbell',  emoji: '💪', icon: Dumbbell  },
  { id: 'book',      emoji: '📚', icon: BookOpen  },
  { id: 'heart',     emoji: '❤️', icon: Heart     },
  { id: 'water',     emoji: '💧', icon: Droplets  },
  { id: 'brain',     emoji: '🧠', icon: Brain     },
  { id: 'zap',       emoji: '⚡', icon: Zap       },
  { id: 'trophy',    emoji: '🏆', icon: Trophy    },
];

const COLORS = [
  { id: 'green',   hex: '#13B96D', track: 'rgba(19,185,109,0.15)'  },
  { id: 'blue',    hex: '#3B82F6', track: 'rgba(59,130,246,0.15)'  },
  { id: 'purple',  hex: '#8B5CF6', track: 'rgba(139,92,246,0.15)'  },
  { id: 'orange',  hex: '#F59E0B', track: 'rgba(245,158,11,0.15)'  },
  { id: 'red',     hex: '#EF4444', track: 'rgba(239,68,68,0.15)'   },
  { id: 'pink',    hex: '#EC4899', track: 'rgba(236,72,153,0.15)'  },
  { id: 'teal',    hex: '#14B8A6', track: 'rgba(20,184,166,0.15)'  },
  { id: 'amber',   hex: '#D97706', track: 'rgba(217,119,6,0.15)'   },
];

const SUGGESTIONS = [
  { name: 'Morning workout',      icon: 'dumbbell', color: 'green',  frequency: 5 },
  { name: 'Read 20 minutes',      icon: 'book',     color: 'blue',   frequency: 7 },
  { name: 'Drink 2L water',       icon: 'water',    color: 'teal',   frequency: 7 },
  { name: 'Meditate',             icon: 'brain',    color: 'purple', frequency: 7 },
  { name: 'No phone before 9am',  icon: 'sun',      color: 'orange', frequency: 7 },
  { name: 'Journal entry',        icon: 'book',     color: 'pink',   frequency: 7 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => format(new Date(), 'yyyy-MM-dd');

function getStreak(habit: Habit): number {
  let streak = 0;
  let d = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = format(d, 'yyyy-MM-dd');
    if (habit.completedDates.includes(key)) {
      streak++;
      d = subDays(d, 1);
    } else if (key === today() && !habit.completedDates.includes(key)) {
      // Today not yet done — streak is from yesterday
      d = subDays(d, 1);
      const yest = format(d, 'yyyy-MM-dd');
      if (!habit.completedDates.includes(yest)) break;
      d = subDays(d, 1);
    } else {
      break;
    }
  }
  return streak;
}

function getLast7(habit: Habit): boolean[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    return habit.completedDates.includes(d);
  });
}

function getWeeklyRate(habit: Habit): number {
  const last7 = getLast7(habit);
  return Math.round((last7.filter(Boolean).length / 7) * 100);
}

// ─── SVG completion ring ──────────────────────────────────────────────────────

const HabitRing: React.FC<{ done: boolean; color: string; track: string; size?: number }> = ({
  done, color, track, size = 48,
}) => {
  const r  = size / 2 - 4;
  const c  = size / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth="3.5" />
      <motion.circle
        cx={c} cy={c} r={r} fill="none"
        stroke={done ? color : 'transparent'}
        strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={circ}
        initial={false}
        animate={{ strokeDashoffset: done ? 0 : circ }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        transform={`rotate(-90 ${c} ${c})`}
        filter={done ? `drop-shadow(0 0 4px ${color}88)` : undefined}
      />
      {done && (
        <motion.circle
          cx={c} cy={c} r={r - 2}
          fill={`${color}18`}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.3, ease: 'backOut' }}
        />
      )}
    </svg>
  );
};

// ─── Add Habit Modal ──────────────────────────────────────────────────────────

const AddHabitModal: React.FC<{
  onAdd: (habit: Omit<Habit, 'id' | 'completedDates' | 'createdAt'>) => void;
  onClose: () => void;
}> = ({ onAdd, onClose }) => {
  const [name, setName]         = useState('');
  const [icon, setIcon]         = useState('sun');
  const [color, setColor]       = useState('green');
  const [frequency, setFreq]    = useState(7);
  const [showSugg, setShowSugg] = useState(true);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), icon, color, frequency });
    onClose();
  };

  const pickSuggestion = (s: typeof SUGGESTIONS[0]) => {
    setName(s.name); setIcon(s.icon); setColor(s.color); setFreq(s.frequency);
    setShowSugg(false);
  };

  return (
    <>
      <motion.div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border overflow-hidden shadow-2xl"
        style={{ background: 'rgba(237,248,242,0.98)', borderColor: '#C8E6D8' }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-black text-[#1A3240]">New Habit</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-xl border border-[#C8E6D8] flex items-center justify-center text-[#4A7568] hover:text-[#1A3240] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {showSugg && (
              <motion.div initial={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="mb-5 overflow-hidden">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#4A7568] mb-2">Quick picks</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s.name} onClick={() => pickSuggestion(s)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C8E6D8] bg-white/80 text-xs font-medium text-[#2A5A4A] hover:border-[#13B96D]/50 hover:bg-[#E8F5EF] transition-all">
                      <span>{ICONS.find(i => i.id === s.icon)?.emoji}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name */}
          <div className="mb-4">
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
              placeholder="Habit name…"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#C8E6D8] text-[#1A3240] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all placeholder:text-[#9AB8B0]"
              autoFocus
            />
          </div>

          {/* Icon picker */}
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#4A7568] mb-2">Icon</p>
            <div className="flex gap-2">
              {ICONS.map(i => (
                <button key={i.id} onClick={() => setIcon(i.id)}
                  className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-all',
                    icon === i.id ? 'border-[#13B96D] bg-[#E8F5EF]' : 'border-[#C8E6D8] bg-white/70 hover:border-[#13B96D]/40')}>
                  {i.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="mb-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#4A7568] mb-2">Color</p>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c.id} onClick={() => setColor(c.id)}
                  className={cn('w-7 h-7 rounded-full border-2 transition-all', color === c.id ? 'border-[#1A3240] scale-110' : 'border-transparent hover:scale-105')}
                  style={{ background: c.hex }} />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#4A7568]">Frequency</p>
              <span className="text-xs font-bold text-[#1A3240]">
                {frequency === 7 ? 'Every day' : `${frequency}×/week`}
              </span>
            </div>
            <input type="range" min={1} max={7} step={1} value={frequency}
              onChange={e => setFreq(Number(e.target.value))}
              className="w-full" style={{ accentColor: COLORS.find(c => c.id === color)?.hex ?? '#13B96D' }} />
            <div className="flex justify-between mt-1">
              {['1×', '2×', '3×', '4×', '5×', '6×', '7×'].map(l => (
                <span key={l} className="text-[9px] font-mono text-[#84ADA4]">{l}</span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-[#C8E6D8] text-sm font-semibold text-[#4A7568] hover:bg-[#E8F5EF] transition-all">Cancel</button>
            <button onClick={handleSubmit} disabled={!name.trim()}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: COLORS.find(c => c.id === color)?.hex ?? '#13B96D', boxShadow: `0 0 20px ${COLORS.find(c => c.id === color)?.hex ?? '#13B96D'}44` }}>
              Add Habit
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ─── Habit Card ───────────────────────────────────────────────────────────────

const HabitCard: React.FC<{
  habit: Habit;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ habit, onToggle, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const todayKey  = today();
  const isDone    = habit.completedDates.includes(todayKey);
  const streak    = getStreak(habit);
  const last7     = getLast7(habit);
  const weeklyRate= getWeeklyRate(habit);
  const color     = COLORS.find(c => c.id === habit.color) ?? COLORS[0];
  const iconObj   = ICONS.find(i => i.id === habit.icon) ?? ICONS[0];

  return (
    <motion.div layout
      className={cn(
        'relative rounded-3xl border p-5 transition-all duration-300',
        isDone ? 'bg-white/90' : 'bg-white/75',
      )}
      style={{ borderColor: isDone ? color.hex + '55' : '#D4EAE0', boxShadow: isDone ? `0 4px 24px ${color.hex}18` : undefined }}
    >
      <div className="flex items-center gap-4">
        {/* Ring + icon */}
        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => onToggle(habit.id)}>
          <HabitRing done={isDone} color={color.hex} track={color.track} size={52} />
          <div className="absolute inset-0 flex items-center justify-center text-xl select-none">
            {iconObj.emoji}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={cn('text-sm font-bold truncate', isDone ? 'text-[#1A3240]' : 'text-[#1A3240]')}>
              {habit.name}
            </p>
            {streak >= 3 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${color.hex}18`, color: color.hex }}>
                <Flame className="w-3 h-3" />{streak}
              </span>
            )}
          </div>

          {/* 7-day dots */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {last7.map((done, i) => (
              <div key={i}
                className={cn('w-2.5 h-2.5 rounded-full transition-all duration-300', i === 6 ? 'ring-2 ring-offset-1' : '')}
                style={{
                  background: done ? color.hex : '#E4EEE9',
                  ringColor: color.hex,
                  boxShadow: done && i === 6 ? `0 0 6px ${color.hex}88` : undefined,
                } as React.CSSProperties}
              />
            ))}
            <span className="text-[9px] font-mono ml-1" style={{ color: '#84ADA4' }}>
              {weeklyRate}%
            </span>
          </div>
        </div>

        {/* Complete button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button
            onClick={() => onToggle(habit.id)}
            whileTap={{ scale: 0.88 }}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-2xl border-2 transition-all duration-300',
            )}
            style={isDone ? { background: color.hex, borderColor: color.hex } : { background: 'transparent', borderColor: color.hex + '60' }}
          >
            <AnimatePresence mode="wait">
              {isDone ? (
                <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check className="w-5 h-5 stroke-[3] text-white" />
                </motion.div>
              ) : (
                <motion.div key="undone" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Plus className="w-5 h-5" style={{ color: color.hex }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Menu */}
          <div className="relative">
            <button onClick={() => setShowMenu(o => !o)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#84ADA4] hover:text-[#1A3240] hover:bg-[#E8F5EF] transition-all">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  className="absolute right-0 top-full mt-1 z-20 rounded-xl border bg-white shadow-lg overflow-hidden min-w-[120px]"
                  style={{ borderColor: '#D4EAE0' }}>
                  <button onClick={() => { onDelete(habit.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                    <X className="w-3.5 h-3.5" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const HabitTracker: React.FC = () => {
  const [habits, setHabits] = useLocalStorage<Habit[]>('intentlist_habits', []);
  const [showAdd, setShowAdd] = useState(false);

  const todayKey = today();
  const completedToday = habits.filter(h => h.completedDates.includes(todayKey)).length;
  const totalHabits    = habits.length;
  const allDoneToday   = totalHabits > 0 && completedToday === totalHabits;
  const bestStreak     = habits.reduce((max, h) => Math.max(max, getStreak(h)), 0);

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const already = h.completedDates.includes(todayKey);
      return {
        ...h,
        completedDates: already
          ? h.completedDates.filter(d => d !== todayKey)
          : [...h.completedDates, todayKey],
      };
    }));
  };

  const addHabit = (data: Omit<Habit, 'id' | 'completedDates' | 'createdAt'>) => {
    const newHabit: Habit = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      completedDates: [],
      createdAt: new Date().toISOString(),
    };
    setHabits(prev => [...prev, newHabit]);
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#6B8D86] mb-2">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-serif italic text-[#1A3142]">Daily Habits</h2>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#13B96D] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#0FAA64] transition-all shadow-lg shadow-[#13B96D]/20 active:scale-95">
            <Plus className="w-3.5 h-3.5" /> New Habit
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      {habits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3">
          <div className="bg-white/90 border border-[#D6EBE1] rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#6B8D86] mb-1">Today</p>
            <p className="text-2xl font-black text-[#1A3240]">{completedToday}<span className="text-sm font-normal text-[#84ADA4]">/{totalHabits}</span></p>
          </div>
          <div className="bg-white/90 border border-[#D6EBE1] rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#6B8D86] mb-1">Best Streak</p>
            <p className="text-2xl font-black text-[#1A3240] flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 text-orange-400" />{bestStreak}
            </p>
          </div>
          <div className={cn('rounded-2xl p-4 text-center border shadow-sm', allDoneToday ? 'bg-[#ECF9F2] border-[#B8E6CC]' : 'bg-white/90 border-[#D6EBE1]')}>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#6B8D86] mb-1">Status</p>
            {allDoneToday ? (
              <p className="text-sm font-bold text-[#13B96D] flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4" /> Done!
              </p>
            ) : (
              <p className="text-2xl font-black text-[#1A3240]">
                {totalHabits - completedToday}<span className="text-sm font-normal text-[#84ADA4]"> left</span>
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* All done celebration */}
      <AnimatePresence>
        {allDoneToday && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
            className="p-6 bg-[#ECF9F2] border border-[#B8E6CC] rounded-3xl text-center">
            <p className="text-2xl mb-1">🏆</p>
            <p className="text-lg font-serif italic text-[#1A3240]">All habits done today.</p>
            <p className="text-sm text-[#4A7568] mt-1">That's how streaks are built.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habits list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {habits.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-20 text-center">
              <p className="text-4xl mb-4">🌱</p>
              <p className="text-lg font-serif italic text-[#8AA89C] mb-2">No habits yet.</p>
              <p className="text-sm text-[#84ADA4] mb-6">Small daily actions compound into big results.</p>
              <button onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#13B96D] text-white text-sm font-semibold hover:bg-[#0FAA64] transition-all shadow-lg shadow-[#13B96D]/20">
                <Plus className="w-4 h-4" /> Add your first habit
              </button>
            </motion.div>
          ) : (
            habits.map(habit => (
              <motion.div key={habit.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <HabitCard habit={habit} onToggle={toggleHabit} onDelete={deleteHabit} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Tip */}
      {habits.length > 0 && habits.length < 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="p-4 rounded-2xl border border-dashed border-[#C8E6D8] bg-transparent flex items-center gap-3">
          <ChevronRight className="w-4 h-4 text-[#84ADA4] flex-shrink-0" />
          <p className="text-xs text-[#84ADA4]">Start with 3–5 habits. Research shows fewer habits leads to higher consistency.</p>
        </motion.div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && <AddHabitModal onAdd={addHabit} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
};
