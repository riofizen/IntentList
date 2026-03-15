import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Task, User, ViewType, Priority } from './types';
import { Sidebar } from './components/Sidebar';
import { EntranceAnimatic } from './components/EntranceAnimatic';
import { PomodoroTimer } from './components/PomodoroTimer';
import { InputBox } from './components/InputBox';
import { TaskList } from './components/TaskList';
import { Calendar } from './components/Calendar';
import { ContextPanel } from './components/ContextPanel';
import { ProModal } from './components/ProModal';
import { BrandLogo } from './components/BrandLogo';
import { DailyDigest } from './components/DailyDigest';
import { WeeklyReview } from './components/WeeklyReview';
import { Templates } from './components/Templates';
import { taskService, authService } from './services/api';
import { type ParsedIntent } from './lib/parser';
import { parseWithAI } from './services/aiParser';
import { suggestSubtasks } from './services/taskBreakdown';
import {
  isToday, isTomorrow, parseISO, startOfToday, isYesterday,
  isSameWeek, isSameMonth, subWeeks, subMonths, format, addDays,
  startOfMonth,
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import {
  Undo2, AlertCircle, ChevronRight, ChevronLeft, Sparkles,
  X, Clock3, ShieldCheck, CheckCircle2, Menu, Moon, Sun, Command,
  Timer, BarChart3, Calendar as CalendarIcon, LayoutTemplate, Wand2,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLocalStorage } from './lib/useLocalStorage';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FREE_TASK_LIMIT = 50;
const POMODORO_DURATIONS = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
} as const;

const getTaskCacheKey = (userId: string) => `intentlist_tasks_cache_${userId}`;

const readTaskCache = (userId: string): Task[] => {
  try {
    const raw = localStorage.getItem(getTaskCacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Task[] : [];
  } catch { return []; }
};

const writeTaskCache = (userId: string, tasks: Task[]) => {
  try {
    localStorage.setItem(getTaskCacheKey(userId), JSON.stringify(tasks));
  } catch { /* silent */ }
};

const mergeTaskCollections = (primary: Task[], fallback: Task[]) => {
  const merged = new Map<string, Task>();
  fallback.forEach(t => merged.set(t.id, t));
  primary.forEach(t => merged.set(t.id, t));
  return Array.from(merged.values()).sort((l, r) => {
    const byDate = l.date.localeCompare(r.date);
    if (byDate !== 0) return byDate;
    const lt = l.time ?? '99:99', rt = r.time ?? '99:99';
    const byTime = lt.localeCompare(rt);
    if (byTime !== 0) return byTime;
    return l.createdAt.localeCompare(r.createdAt);
  });
};

const getTimerCompletionMessage = (mode: keyof typeof POMODORO_DURATIONS) => {
  if (mode === 'pomodoro') {
    return { title: 'Focus session complete', body: 'Time for a short break.', nextMode: 'shortBreak' as const };
  }
  return {
    title: `${mode === 'longBreak' ? 'Long break' : 'Short break'} complete`,
    body: 'Break is over. Ready to focus again?',
    nextMode: 'pomodoro' as const,
  };
};

type AuthMode = 'login' | 'signup';

// ─── Auth Component ──────────────────────────────────────────────────────────

const Auth: React.FC<{ onLogin: (user: User) => void; initialMode: AuthMode; onBack: () => void }> = ({ onLogin, initialMode, onBack }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setIsLogin(initialMode === 'login'); setError(''); }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const user = isLogin
        ? await authService.login(email, password)
        : await authService.signup(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isLogin ? 'Invalid email or password' : 'User already exists'));
    }
  };

  return (
    <div className="min-h-screen bg-[#EDF8F2] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="atmosphere" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass p-10 rounded-[2.5rem] relative z-10"
      >
        <button
          onClick={onBack}
          className="absolute left-5 top-5 w-10 h-10 rounded-xl border border-[#D2E7DC] bg-white/80 flex items-center justify-center text-[#5E7B76] hover:text-[#274A40] transition-colors"
          aria-label="Back to landing"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center gap-4 mb-10">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            className="w-16 h-16 rounded-3xl border border-[#CDE6DB] bg-white/88 p-3.5 shadow-xl shadow-[#13B96D]/15"
          >
            <BrandLogo />
          </motion.div>
          <div className="text-center">
            <h1 className="text-4xl font-serif italic text-[#1A3142] tracking-tight">IntentList</h1>
            <p className="text-[#5E7B76] text-sm mt-1">Your digital brain dump.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#6B8D86] ml-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-[#F5FCF8] border border-[#CFE7DC] focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all text-[#1C3340] placeholder:text-[#9AB8B0]"
              placeholder="name@example.com" required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#6B8D86] ml-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-[#F5FCF8] border border-[#CFE7DC] focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all text-[#1C3340] placeholder:text-[#9AB8B0]"
              placeholder="••••••••" required
            />
          </div>
          {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
          <button className="w-full py-4 bg-[#13B96D] text-white rounded-2xl font-semibold hover:bg-[#10A763] transition-all shadow-xl shadow-[#13B96D]/20 active:scale-[0.98]">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-8 text-sm text-[#6B8D86] hover:text-[#274A40] transition-colors font-medium"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </motion.div>
    </div>
  );
};

// ─── Landing Page ─────────────────────────────────────────────────────────────

// ─── Typed Demo ───────────────────────────────────────────────────────────────
const DEMO_PHRASES = [
  'team meeting tomorrow 10am @work',
  'buy groceries this evening @errands',
  'finish report by friday high priority',
  'call mom on sunday afternoon',
  'gym every monday 7am #health',
];

const TypedDemo: React.FC = () => {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const phrase = DEMO_PHRASES[phraseIdx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && text.length < phrase.length) {
      timeout = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 55);
    } else if (!deleting && text.length === phrase.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => setText(text.slice(0, -1)), 28);
    } else if (deleting && text.length === 0) {
      setDeleting(false);
      setPhraseIdx(i => (i + 1) % DEMO_PHRASES.length);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, phraseIdx]);

  const highlight = (t: string) => {
    return t.split(/(\s)/).map((w, i) => {
      if (w.startsWith('@') || w.startsWith('#')) return <span key={i} style={{ color: '#13B96D' }}>{w}</span>;
      if (/\b(tomorrow|today|monday|friday|sunday|evening|morning|afternoon)\b/i.test(w)) return <span key={i} style={{ color: '#5FD4A0' }}>{w}</span>;
      if (/\b(high priority|urgent)\b/i.test(w)) return <span key={i} style={{ color: '#F87171' }}>{w}</span>;
      if (/\b(10am|7am)\b/i.test(w)) return <span key={i} style={{ color: '#A78BFA' }}>{w}</span>;
      return <span key={i}>{w}</span>;
    });
  };

  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border"
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#13B96D' }} />
      <span className="font-mono text-sm sm:text-base" style={{ color: '#E2F4EC', minHeight: '1.5em' }}>
        {highlight(text)}
        <span className="animate-pulse" style={{ color: '#13B96D' }}>|</span>
      </span>
    </div>
  );
};

// ─── Parsed Result Card ───────────────────────────────────────────────────────
const ParsedCard: React.FC<{ emoji: string; label: string; value: string; color: string }> = ({ emoji, label, value, color }) => (
  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
    <span className="text-base">{emoji}</span>
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color }}>{value}</p>
    </div>
  </div>
);

// ─── Feature Card ─────────────────────────────────────────────────────────────
const FeatureCard: React.FC<{
  icon: React.ReactNode; title: string; desc: string; tag: string; delay?: number;
}> = ({ icon, title, desc, tag, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className="group relative p-7 rounded-3xl border overflow-hidden"
    style={{ background: 'rgba(255,255,255,0.55)', borderColor: '#D4EAE0' }}
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: 'radial-gradient(circle at 30% 30%, rgba(19,185,109,0.06), transparent 60%)' }} />
    <div className="relative">
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.28em] mb-5"
        style={{ background: 'rgba(19,185,109,0.1)', color: '#0D8A4E' }}>
        {tag}
      </div>
      <div className="mb-4 text-[#13B96D]">{icon}</div>
      <h3 className="text-xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Manrope', sans-serif", color: '#1A3240' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#4A7568' }}>{desc}</p>
    </div>
  </motion.div>
);

// ─── Landing Page ─────────────────────────────────────────────────────────────
const LandingPage: React.FC<{ onLogin: () => void; onSignup: () => void }> = ({ onLogin, onSignup }) => (
  <div className="min-h-screen overflow-x-hidden" style={{ background: '#EDF8F2' }}>

    {/* ══════════════════════════════════════════
        HERO — dark, full viewport, cinematic
    ══════════════════════════════════════════ */}
    <section className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #060F0B 0%, #0B1E14 55%, #0E2418 100%)' }}>

      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

      {/* Orbs */}
      <motion.div className="absolute rounded-full blur-[120px] pointer-events-none"
        style={{ width: 600, height: 600, top: '-15%', left: '-10%', background: 'rgba(19,185,109,0.09)' }}
        animate={{ x: [0, 30, -15, 0], y: [0, 20, 8, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute rounded-full blur-[100px] pointer-events-none"
        style={{ width: 500, height: 500, bottom: '-10%', right: '-8%', background: 'rgba(95,212,160,0.07)' }}
        animate={{ x: [0, -25, 12, 0], y: [0, 15, -18, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute rounded-full blur-[80px] pointer-events-none"
        style={{ width: 300, height: 300, top: '40%', left: '50%', background: 'rgba(19,185,109,0.05)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />

      {/* Shooting lines */}
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          className="absolute h-px w-32 pointer-events-none"
          style={{ top: `${22 + i * 20}%`, left: -140, background: 'linear-gradient(90deg, transparent, rgba(19,185,109,0.7), transparent)', transform: 'rotate(-12deg)' }}
          animate={{ x: [0, 1600], opacity: [0, 1, 0] }}
          transition={{ duration: 7 + i * 1.5, repeat: Infinity, ease: 'linear', delay: i * 2.2 }} />
      ))}

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10 md:py-6">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-2xl p-2 flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)' }} alt="IntentList" />
          <span className="text-xl font-black tracking-[-0.02em]" style={{ color: '#E2F4EC' }}>IntentList</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {['Features', 'How it works', 'Pricing'].map(l => (
            <button key={l} className="hover:text-white transition-colors duration-200">{l}</button>
          ))}
        </div>
        <button onClick={onLogin}
          className="px-5 py-2.5 rounded-full border text-sm font-semibold transition-all duration-300 hover:border-[#13B96D]/60"
          style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', color: '#9FD4BC' }}>
          Sign In
        </button>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-16 pt-8 text-center">

        {/* Eyebrow */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8"
          style={{ background: 'rgba(19,185,109,0.1)', borderColor: 'rgba(19,185,109,0.3)' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#13B96D' }} />
          <span className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: '#5FD4A0' }}>Now in alpha</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif italic leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(3rem, 9vw, 6.5rem)', color: '#E8F5EE' }}>
          Think it.<br />
          <span style={{ color: '#13B96D' }}>Capture it.</span><br />
          Do it.
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-6 text-base sm:text-lg max-w-xl leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.5)' }}>
          IntentList turns your messy brain dumps into structured tasks — with smart date parsing, focus timers, and weekly reviews built in.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button onClick={onSignup}
            className="px-8 py-3.5 rounded-full text-sm font-bold transition-all duration-300 active:scale-95"
            style={{ background: '#13B96D', color: '#fff', boxShadow: '0 0 40px rgba(19,185,109,0.45)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 60px rgba(19,185,109,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(19,185,109,0.45)')}>
            Start for free →
          </button>
          <button onClick={onLogin}
            className="px-7 py-3.5 rounded-full border text-sm font-semibold transition-all duration-300"
            style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.7)' }}>
            Sign in
          </button>
        </motion.div>

        {/* Live parser demo */}
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.65 }}
          className="mt-14 w-full max-w-xl">
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Try typing naturally →
          </p>
          <TypedDemo />
          {/* Parsed output strip */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ParsedCard emoji="📅" label="Date" value="Tomorrow" color="#5FD4A0" />
            <ParsedCard emoji="⏰" label="Time" value="10:00 AM" color="#A78BFA" />
            <ParsedCard emoji="🏷️" label="Tag" value="#work" color="#13B96D" />
            <ParsedCard emoji="⚡" label="Priority" value="Normal" color="#94A3B8" />
          </div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
        className="relative z-10 flex flex-col items-center pb-8 gap-1.5">
        <span className="text-[9px] font-mono uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.2)' }}>scroll</span>
        <motion.div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, rgba(19,185,109,0.4), transparent)' }}
          animate={{ scaleY: [0, 1, 0], originY: 0 }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.div>
    </section>

    {/* ══════════════════════════════════════════
        STAT BAR
    ══════════════════════════════════════════ */}
    <section className="relative py-10 border-y overflow-hidden" style={{ background: '#F5FBF8', borderColor: '#D4EAE0' }}>
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {[
          { n: '50+', label: 'Date formats parsed' },
          { n: '6',   label: 'Ambient soundscapes' },
          { n: '4',   label: 'Views & perspectives' },
          { n: '∞',   label: 'Brain dumps welcomed' },
        ].map(({ n, label }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6 }}>
            <p className="text-4xl font-black tracking-[-0.03em] font-serif italic" style={{ color: '#13B96D' }}>{n}</p>
            <p className="text-xs font-medium mt-1" style={{ color: '#4A7568' }}>{label}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* ══════════════════════════════════════════
        FEATURE GRID
    ══════════════════════════════════════════ */}
    <section className="py-24 px-6 md:px-10" style={{ background: '#EDF8F2' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="text-center mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] mb-4" style={{ color: '#13B96D' }}>What's inside</p>
          <h2 className="text-4xl sm:text-5xl font-serif italic tracking-tight leading-tight" style={{ color: '#1A3240' }}>
            Everything you need.<br />Nothing you don't.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard delay={0} tag="Smart Parsing"
            icon={<Sparkles className="w-6 h-6" />}
            title="Just type. It understands."
            desc="Write 'call mom Sunday 3pm @personal' and IntentList extracts the date, time, tag, and priority. No forms, no dropdowns." />
          <FeatureCard delay={0.1} tag="Focus Timer"
            icon={<Timer className="w-6 h-6" />}
            title="Pomodoro built the right way."
            desc="Dark cosmic focus mode, ambient sounds, flow state detection, phase dots. The most beautiful Pomodoro timer you've used." />
          <FeatureCard delay={0.2} tag="Weekly Review"
            icon={<BarChart3 className="w-6 h-6" />}
            title="Know how your week really went."
            desc="Day-by-day charts, completion rates, focus area breakdown. Plan next week in the same view with a single input." />
          <FeatureCard delay={0.3} tag="Smart Views"
            icon={<CalendarIcon className="w-6 h-6" />}
            title="Today. Overdue. Upcoming."
            desc="The Daily Digest shows you exactly what matters right now — overdue tasks, today's priorities, and your completion rate." />
          <FeatureCard delay={0.4} tag="Templates"
            icon={<LayoutTemplate className="w-6 h-6" />}
            title="One tap to load a full week."
            desc="Morning Routine, Deep Work Session, Project Kickoff — batch templates that drop 4–6 pre-scheduled tasks instantly." />
          <FeatureCard delay={0.5} tag="Task Breakdown"
            icon={<Wand2 className="w-6 h-6" />}
            title="Break big tasks into steps."
            desc="Hit the wand on any task and it splits into 3–5 actionable subtasks. Progress bar tracks completion automatically." />
        </div>
      </div>
    </section>

    {/* ══════════════════════════════════════════
        HOW IT WORKS
    ══════════════════════════════════════════ */}
    <section className="py-24 px-6 md:px-10 border-t" style={{ background: '#F5FBF8', borderColor: '#D4EAE0' }}>
      <div className="max-w-3xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] mb-4" style={{ color: '#13B96D' }}>How it works</p>
          <h2 className="text-4xl sm:text-5xl font-serif italic tracking-tight mb-16" style={{ color: '#1A3240' }}>
            Three steps. That's it.
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n: '01', title: 'Brain dump', desc: 'Type anything in the input bar. Natural language, tags, dates — raw thoughts welcome.' },
            { n: '02', title: 'It organises', desc: 'The parser extracts date, time, priority, and tags. No editing needed unless you want to.' },
            { n: '03', title: 'You execute', desc: 'Use the Focus Timer, Daily Digest, or Deep Work mode to actually get things done.' },
          ].map(({ n, title, desc }, i) => (
            <motion.div key={n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6 }}
              className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl font-black text-sm mb-5"
                style={{ background: 'rgba(19,185,109,0.12)', color: '#0D8A4E' }}>{n}</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#1A3240' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#4A7568' }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ══════════════════════════════════════════
        DARK CTA SECTION
    ══════════════════════════════════════════ */}
    <section className="relative py-32 px-6 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #060F0B 0%, #0B1E14 100%)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      <motion.div className="absolute rounded-full blur-[120px] pointer-events-none"
        style={{ width: 500, height: 500, top: '-20%', left: '30%', background: 'rgba(19,185,109,0.1)' }}
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <h2 className="font-serif italic tracking-tight leading-[0.95] mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5rem)', color: '#E8F5EE' }}>
            Your mind deserves<br />
            <span style={{ color: '#13B96D' }}>a better system.</span>
          </h2>
          <p className="text-base mb-10 max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Free to start. No credit card. No onboarding maze. Just open it and type.
          </p>
          <button onClick={onSignup}
            className="px-10 py-4 rounded-full text-base font-bold transition-all duration-300 active:scale-95"
            style={{ background: '#13B96D', color: '#fff', boxShadow: '0 0 50px rgba(19,185,109,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 70px rgba(19,185,109,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 50px rgba(19,185,109,0.5)')}>
            Get started free →
          </button>
        </motion.div>
      </div>
    </section>

    {/* ══════════════════════════════════════════
        FOOTER
    ══════════════════════════════════════════ */}
    <footer className="py-8 px-6 md:px-10 border-t" style={{ background: '#EDF8F2', borderColor: '#D4EAE0' }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="h-8 w-8 rounded-xl p-1.5 border"
            style={{ border: '1px solid #C8E6D8', background: 'rgba(255,255,255,0.8)' }} alt="IntentList" />
          <span className="font-black text-sm tracking-[-0.02em]" style={{ color: '#1A3240' }}>IntentList</span>
        </div>
        <p className="text-xs" style={{ color: '#84ADA4' }}>
          Built with intention. © {new Date().getFullYear()}
        </p>
        <div className="flex items-center gap-6 text-xs font-medium" style={{ color: '#4A7568' }}>
          <button onClick={onLogin} className="hover:text-[#13B96D] transition-colors">Sign in</button>
          <button onClick={onSignup} className="hover:text-[#13B96D] transition-colors">Sign up</button>
        </div>
      </div>
    </footer>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try { const s = localStorage.getItem('intentlist_user'); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
  const [isDark, setIsDark] = useLocalStorage<boolean>('intentlist_dark_mode', false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [authScreen, setAuthScreen] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('digest');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isDeepWorkMode, setIsDeepWorkMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState<string | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [showProWelcome, setShowProWelcome] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const [deletedTask, setDeletedTask] = useState<{ task: Task; timeout: NodeJS.Timeout } | null>(null);

  // Pomodoro (persisted)
  const [pomodoroMode, setPomodoroMode] = useLocalStorage<'pomodoro' | 'shortBreak' | 'longBreak'>('pomodoro_mode', 'pomodoro');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useLocalStorage<number>('pomodoro_time', 25 * 60);
  const [pomodoroIsActive, setPomodoroIsActive] = useLocalStorage<boolean>('pomodoro_active', false);
  const [pomodoroIsMuted, setPomodoroIsMuted] = useLocalStorage<boolean>('pomodoro_muted', false);
  const [pomodoroEndAt, setPomodoroEndAt] = useLocalStorage<number | null>('pomodoro_end_at', null);
  const [pomodoroNotificationsEnabled, setPomodoroNotificationsEnabled] = useLocalStorage<boolean>('pomodoro_notifications', true);
  const [pomodoroKeepAwake, setPomodoroKeepAwake] = useLocalStorage<boolean>('pomodoro_keep_awake', true);

  const [isMobileLayout, setIsMobileLayout] = useState(() => window.innerWidth < 1024);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileContextOpen, setIsMobileContextOpen] = useState(false);
  const [hasHydratedTasks, setHasHydratedTasks] = useState(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const timerCompletionRef = useRef<string | null>(null);

  const isPro = user?.plan === 'pro';

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    authService.getCurrentUser().then(u => { if (mounted) setUser(u); }).catch(console.error);
    const unsub = authService.onAuthStateChange(u => setUser(u));
    return () => { mounted = false; unsub(); };
  }, []);

  // ── Dark mode — apply/remove class on root element ──────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // ── Keyboard shortcuts (navigation + task actions) ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (isEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const navMap: Partial<Record<string, ViewType>> = {
        'd': 'digest', 't': 'today', 'o': 'overdue',
        'u': 'upcoming', 'a': 'all', 'w': 'weekly',
      };

      // Cmd+K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        return;
      }

      if (navMap[e.key]) {
        e.preventDefault();
        setActiveView(navMap[e.key]!);
        setSelectedTaskId(null);
        setSelectedTag(null);
        setIsMobileNavOpen(false);
      } else if (e.key === 'Escape') {
        setSelectedTaskId(null);
        setIsProModalOpen(false);
        setIsMobileNavOpen(false);
        setIsMobileContextOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // only stable setState calls — no deps needed

  // ── Pomodoro timer ────────────────────────────────────────────────────────
  const notifyPomodoroCompletion = useCallback((mode: keyof typeof POMODORO_DURATIONS) => {
    if (!pomodoroNotificationsEnabled || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const { title, body } = getTimerCompletionMessage(mode);
    new Notification(title, { body, icon: '/logo.png', badge: '/logo.png', tag: 'intentlist-pomodoro' });
  }, [pomodoroNotificationsEnabled]);

  const completePomodoroTimer = useCallback((mode: keyof typeof POMODORO_DURATIONS) => {
    const key = `${mode}-${pomodoroEndAt ?? Date.now()}`;
    if (timerCompletionRef.current === key) return;
    timerCompletionRef.current = key;
    setPomodoroIsActive(false);
    setPomodoroEndAt(null);
    if (!pomodoroIsMuted) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    }
    notifyPomodoroCompletion(mode);
    const { nextMode } = getTimerCompletionMessage(mode);
    setPomodoroMode(nextMode);
    setPomodoroTimeLeft(POMODORO_DURATIONS[nextMode]);
  }, [notifyPomodoroCompletion, pomodoroEndAt, pomodoroIsMuted, setPomodoroEndAt, setPomodoroIsActive, setPomodoroMode, setPomodoroTimeLeft]);

  useEffect(() => {
    if (!pomodoroIsActive) return;
    if (pomodoroEndAt === null) { setPomodoroEndAt(Date.now() + pomodoroTimeLeft * 1000); return; }
    const syncCountdown = () => {
      const remaining = Math.max(0, Math.ceil((pomodoroEndAt - Date.now()) / 1000));
      setPomodoroTimeLeft(prev => prev === remaining ? prev : remaining);
      if (remaining === 0) completePomodoroTimer(pomodoroMode);
    };
    syncCountdown();
    const interval = setInterval(syncCountdown, 1000);
    const onWake = () => syncCountdown();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onWake); window.removeEventListener('focus', onWake); };
  }, [completePomodoroTimer, pomodoroEndAt, pomodoroIsActive, pomodoroMode, pomodoroTimeLeft, setPomodoroEndAt, setPomodoroTimeLeft]);

  // ── Wake lock ─────────────────────────────────────────────────────────────
  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) return;
    try { await wakeLockRef.current.release(); } catch { /* silent */ } finally { wakeLockRef.current = null; }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!pomodoroKeepAwake || !pomodoroIsActive || document.visibilityState !== 'visible') return;
    const wl = (navigator as any).wakeLock;
    if (!wl || wakeLockRef.current) return;
    try { wakeLockRef.current = await wl.request('screen'); } catch { wakeLockRef.current = null; }
  }, [pomodoroIsActive, pomodoroKeepAwake]);

  useEffect(() => {
    if (pomodoroIsActive && pomodoroKeepAwake) requestWakeLock();
    else releaseWakeLock();
    const onVis = () => { if (document.visibilityState === 'visible' && pomodoroIsActive && pomodoroKeepAwake) requestWakeLock(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); if (!pomodoroIsActive) releaseWakeLock(); };
  }, [pomodoroIsActive, pomodoroKeepAwake, releaseWakeLock, requestWakeLock]);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setIsMobileLayout(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── User / task loading ───────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      localStorage.setItem('intentlist_user', JSON.stringify(user));
      setHasHydratedTasks(false);
      loadTasks();
    } else {
      localStorage.removeItem('intentlist_user');
      setTasks([]);
      setHasHydratedTasks(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { if (showProWelcome) { const t = setTimeout(() => setShowProWelcome(false), 5000); return () => clearTimeout(t); } }, [showProWelcome]);
  useEffect(() => { setIsMobileNavOpen(false); }, [activeView]);
  useEffect(() => {
    if (!isMobileLayout) { setIsMobileNavOpen(false); setIsMobileContextOpen(false); return; }
    if (selectedTaskId) setIsMobileContextOpen(true);
  }, [isMobileLayout, selectedTaskId]);

  const loadTasks = async () => {
    if (!user) return;
    const cached = readTaskCache(user.id);
    setTasks(cached);
    setHasHydratedTasks(true);
    try {
      const data = await taskService.getTasks(user.id);
      const merged = mergeTaskCollections(data, cached);

      setTasks(merged);
    } catch { /* use cache */ }
  };

  useEffect(() => {
    if (!user || !hasHydratedTasks) return;
    writeTaskCache(user.id, tasks);
  }, [hasHydratedTasks, tasks, user]);

  // ── Task handlers ─────────────────────────────────────────────────────────

  const handleAddTask = async (parsed: ParsedIntent) => {
    if (!user) return;
    if (user.plan === 'free' && (tasks.length >= FREE_TASK_LIMIT || parsed.isAdvanced)) {
      setIsProModalOpen(true);
      return;
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      text: parsed.text,
      date: format(parsed.date, 'yyyy-MM-dd'),
      time: parsed.time,
      completed: false,
      priority: parsed.priority,
      tags: parsed.tags,
      createdAt: new Date().toISOString(),
      recurrence: parsed.recurrence ?? null,
      duration: parsed.duration ?? null,
    };

    setTasks(prev => [...prev, newTask]);

    (async () => {
      let finalTask = { ...newTask };
      if (user.plan === 'pro') {
        try {
          const aiResult = await parseWithAI(parsed.raw, selectedDate);
          if (aiResult) {
            finalTask = {
              ...finalTask,
              text: aiResult.text,
              date: aiResult.date,
              time: aiResult.time,
              priority: aiResult.priority,
              tags: [...new Set([...parsed.tags, ...aiResult.tags])],
            };
            setTasks(prev => prev.map(t => t.id === newTask.id ? finalTask : t));
          }
        } catch { /* fail silently */ }
      }
      try { await taskService.createTask(finalTask); } catch { /* fail silently */ }
    })();
  };

  // Apply a template — creates a batch of tasks
  const handleApplyTemplate = async (batch: Omit<Task, 'id' | 'userId' | 'createdAt' | 'completed'>[]) => {
    if (!user) return;
    const newTasks: Task[] = batch.map(t => ({
      ...t,
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      completed: false,
      createdAt: new Date().toISOString(),
      parentId: null,
      recurrence: null,
      duration: null,
    }));
    setTasks(prev => [...prev, ...newTasks]);
    // Navigate to today so user sees the tasks
    setActiveView('today');
    // Persist in background
    for (const t of newTasks) {
      try { await taskService.createTask(t); } catch { /* silent */ }
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated = { ...task, completed: !task.completed };
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    await taskService.updateTask(id, { completed: updated.completed });
    setSelectedTaskId(id);
  };

  const handleUpdatePriority = async (id: string, priority: Priority) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
    await taskService.updateTask(id, { priority });
  };

  const handleEditTask = async (id: string, updates: Partial<Pick<Task, 'text' | 'date' | 'time' | 'priority'>>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, time: updates.time ?? null } : t));
    try {
      await taskService.updateTask(id, updates);
    } catch (err) {
      console.error('Failed to save edit:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    // Also remove its subtasks from the UI
    const subtaskIds = tasks.filter(t => t.parentId === id).map(t => t.id);
    setTasks(prev => prev.filter(t => t.id !== id && t.parentId !== id));
    if (deletedTask) clearTimeout(deletedTask.timeout);
    const timeout = setTimeout(async () => {
      await taskService.deleteTask(id);
      for (const sid of subtaskIds) { try { await taskService.deleteTask(sid); } catch { /* silent */ } }
      setDeletedTask(null);
    }, 5000);
    setDeletedTask({ task, timeout });
  };

  const handleUndoDelete = () => {
    if (!deletedTask) return;
    clearTimeout(deletedTask.timeout);
    setTasks(prev => [...prev, deletedTask.task]);
    setDeletedTask(null);
  };

  const handleCarryForward = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterdayTasks = tasks.filter(t => !t.completed && isYesterday(parseISO(t.date)));
    setTasks(prev => prev.map(t => (!t.completed && isYesterday(parseISO(t.date))) ? { ...t, date: today } : t));
    for (const t of yesterdayTasks) { try { await taskService.updateTask(t.id, { date: today }); } catch { /* silent */ } }
  };

  const handleMoveToToday = async (id: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setTasks(prev => prev.map(t => t.id === id ? { ...t, date: today } : t));
    await taskService.updateTask(id, { date: today });
  };

  const handleBreakdown = async (id: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setIsBreakingDown(id);
    try {
      const subtasks = await suggestSubtasks(task.text);
      if (subtasks.length > 0) {
        for (const sub of subtasks) {
          const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            text: sub,
            date: task.date,
            time: null,
            completed: false,
            priority: 'normal',
            tags: [...task.tags.filter(t => t !== 'parent'), 'subtask'],
            createdAt: new Date().toISOString(),
            parentId: id, // ← linked to parent
            recurrence: null,
            duration: null,
          };
          setTasks(prev => [...prev, newTask]);
          try { await taskService.createTask(newTask); } catch { /* silent */ }
        }
        // Tag parent task
        setTasks(prev => prev.map(t => t.id === id ? { ...t, tags: [...new Set([...t.tags, 'parent'])] } : t));
        await taskService.updateTask(id, { tags: [...new Set([...task.tags, 'parent'])] });
      }
    } catch { /* silent */ } finally { setIsBreakingDown(null); }
  };

  const handleCarryForwardAll = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const overdue = tasks.filter(t => !t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date)));
    setTasks(prev => prev.map(t =>
      (!t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date))) ? { ...t, date: today } : t
    ));
    for (const t of overdue) { try { await taskService.updateTask(t.id, { date: today }); } catch { /* silent */ } }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  // Top-level tasks only (no subtasks in main list)
  const topLevelTasks = useMemo(() => tasks.filter(t => !t.parentId), [tasks]);

  const filteredTasks = useMemo(() => {
    const today = startOfToday();
    let filtered = topLevelTasks;
    if (selectedTag) filtered = filtered.filter(t => t.tags.includes(selectedTag));
    return filtered.filter(task => {
      const d = parseISO(task.date);
      switch (activeView) {
        case 'today':    return isToday(d);
        case 'digest':   return isToday(d);
        case 'overdue':  return !task.completed && d < today && !isToday(d);
        case 'upcoming': return d > today;
        case 'calendar': return task.date === format(selectedDate, 'yyyy-MM-dd');
        default:         return true;
      }
    });
  }, [topLevelTasks, activeView, selectedDate, selectedTag]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => s.add(tag)));
    return Array.from(s).sort();
  }, [tasks]);

  const timelineGroups = useMemo(() => {
    if (activeView !== 'timeline') return [];
    const today = startOfToday();
    return [
      { label: 'Today',      tasks: topLevelTasks.filter(t => isToday(parseISO(t.date))) },
      { label: 'Yesterday',  tasks: topLevelTasks.filter(t => isYesterday(parseISO(t.date))) },
      { label: 'This Week',  tasks: topLevelTasks.filter(t => isSameWeek(parseISO(t.date), today) && !isToday(parseISO(t.date)) && !isYesterday(parseISO(t.date))) },
      { label: 'Last Week',  tasks: topLevelTasks.filter(t => isSameWeek(parseISO(t.date), subWeeks(today, 1))) },
      { label: 'Last Month', tasks: topLevelTasks.filter(t => isSameMonth(parseISO(t.date), subMonths(today, 1))) },
      { label: 'Older',      tasks: topLevelTasks.filter(t => parseISO(t.date) < startOfMonth(subMonths(today, 1))) },
    ].filter(g => g.tasks.length > 0);
  }, [topLevelTasks, activeView]);

  const counts: Record<ViewType, number> = {
    today:     tasks.filter(t => isToday(parseISO(t.date)) && !t.parentId).length,
    digest:    tasks.filter(t => isToday(parseISO(t.date)) && !t.parentId).length,
    overdue:   tasks.filter(t => !t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date)) && !t.parentId).length,
    upcoming:  tasks.filter(t => parseISO(t.date) > startOfToday() && !t.parentId).length,
    all:       topLevelTasks.length,
    calendar:  tasks.filter(t => t.date === format(selectedDate, 'yyyy-MM-dd') && !t.parentId).length,
    timeline:  topLevelTasks.length,
    pomodoro:  0,
    weekly:    0,
    templates: 0,
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const overdueYesterday = tasks.filter(t => !t.completed && isYesterday(parseISO(t.date)));

  const completionRate = useMemo(() => {
    const td = tasks.filter(t => isToday(parseISO(t.date)) && !t.parentId);
    return td.length === 0 ? 0 : Math.round((td.filter(t => t.completed).length / td.length) * 100);
  }, [tasks]);

  const isPomodoroView = activeView === 'pomodoro';

  const handleSelectTask = (id: string) => {
    setSelectedTaskId(id);
    if (isMobileLayout) setIsMobileContextOpen(true);
  };

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    setSelectedTaskId(null);
    setSelectedTag(null);
    setIsMobileNavOpen(false);
    if (view === 'pomodoro') setIsMobileContextOpen(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (showEntrance) return <EntranceAnimatic onComplete={() => setShowEntrance(false)} />;

  if (!user) {
    if (authScreen === 'landing') {
      return (
        <LandingPage
          onLogin={() => { setAuthMode('login'); setAuthScreen('auth'); }}
          onSignup={() => { setAuthMode('signup'); setAuthScreen('auth'); }}
        />
      );
    }
    return <Auth onLogin={setUser} initialMode={authMode} onBack={() => setAuthScreen('landing')} />;
  }

  // ── Shared TaskList props ─────────────────────────────────────────────────
  const taskListProps = {
    allTasks: tasks,
    onToggle: handleToggleTask,
    onDelete: handleDeleteTask,
    onUpdatePriority: handleUpdatePriority,
    onEdit: handleEditTask,
    onSelect: handleSelectTask,
    onMoveToToday: handleMoveToToday,
    onBreakdown: handleBreakdown,
    selectedTaskId,
    isBreakingDown,
  };

  return (
    <div className={cn(
      'flex h-screen overflow-hidden relative transition-all duration-500',
      isDark
        ? 'bg-[#0D1A14] text-[#D8F0E6]'
        : 'bg-[#EDF8F2] text-[#1D3441]',
      isDeepWorkMode && !isDark && 'bg-[#F2FBF6]',
      isZenMode && 'bg-[#14382F] text-[#E6F7EF]'
    )}>
      {/* ── Pomodoro Timer — fixed fullscreen overlay ── */}
      {isPomodoroView && (
        <div className="fixed inset-0 z-[60]">
          <PomodoroTimer
            isDeepWorkMode={isDeepWorkMode}
            onExit={() => setActiveView('digest')}
            mode={pomodoroMode}
            setMode={setPomodoroMode}
            timeLeft={pomodoroTimeLeft}
            setTimeLeft={setPomodoroTimeLeft}
            endAt={pomodoroEndAt}
            setEndAt={setPomodoroEndAt}
            isActive={pomodoroIsActive}
            setIsActive={setPomodoroIsActive}
            isMuted={pomodoroIsMuted}
            setIsMuted={setPomodoroIsMuted}
            notificationsEnabled={pomodoroNotificationsEnabled}
            setNotificationsEnabled={setPomodoroNotificationsEnabled}
            keepAwake={pomodoroKeepAwake}
            setKeepAwake={setPomodoroKeepAwake}
            isZenMode={isZenMode}
            setIsZenMode={setIsZenMode}
            tasks={tasks.filter(t => isToday(parseISO(t.date)) && !t.completed && !t.parentId)}
          />
        </div>
      )}
      {!isPomodoroView && (
        <div className={cn(
          'atmosphere transition-all duration-1000',
          isDeepWorkMode && 'opacity-40 scale-110 blur-3xl',
          isZenMode && 'opacity-10 scale-150 blur-[100px]'
        )} />
      )}

      {/* Sidebar — desktop */}
      {!isPomodoroView && !isMobileLayout && (
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          counts={counts}
          onLogout={async () => { await authService.logout(); setUser(null); setAuthMode('login'); setAuthScreen('landing'); }}
          tags={allTags}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          isPro={isPro}
          onUpgrade={() => setIsProModalOpen(true)}

          className={cn('transition-all duration-500', isZenMode && 'opacity-0 -translate-x-full pointer-events-none')}
        />
      )}

      {/* Main content */}
      <main
        className={cn('flex-1 flex flex-col min-w-0 relative', isPomodoroView && 'overflow-y-auto overflow-x-hidden custom-scrollbar')}
        onClick={e => { if (e.target === e.currentTarget) setSelectedTaskId(null); }}
      >
        <div className={cn(
          'max-w-4xl w-full mx-auto px-4 pt-6 pb-6 flex-1 flex flex-col overflow-hidden transition-all duration-700 sm:px-6 sm:pt-8 lg:px-8 lg:pt-16 lg:pb-8',
          isPomodoroView && 'max-w-full px-0 pt-0 pb-0 overflow-visible',
          isDeepWorkMode && 'max-w-2xl pt-32',
          isZenMode && 'max-w-full px-0 pt-0'
        )}>
          {/* Mobile top bar */}
          {!isPomodoroView && !(isDeepWorkMode || isZenMode) && (
            <div className="mb-5 flex items-center justify-between gap-2 lg:hidden">
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition flex-shrink-0",
                  isDark
                    ? 'border-white/12 bg-white/6 text-[#4E9972] hover:text-[#13B96D]'
                    : 'border-[#CFE6DA] bg-white/85 text-[#42635C] hover:border-[#13B96D]/45 hover:text-[#12935A]'
                )}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex flex-1 items-center justify-center gap-2">
                <BrandLogo
                  className={cn("h-10 w-10 rounded-2xl border p-1.5 shadow-sm flex-shrink-0", isDark ? 'border-white/12 bg-white/8' : 'border-[#CFE6DA] bg-white/85')}
                  alt="IntentList logo"
                />
                <div className="min-w-0 text-left">
                  <p className={cn("truncate text-sm font-semibold tracking-tight", isDark ? 'text-[#D8F0E6]' : 'text-[#1A3142]')}>
                    {activeView === 'digest' || activeView === 'today'
                      ? `Hello, ${user.email.split('@')[0]}`
                      : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                  </p>
                  <p className={cn("text-[10px] font-mono uppercase tracking-[0.3em]", isDark ? 'text-[#2A5C42]' : 'text-[#6B8D86]')}>Focus Orbit</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Cmd+K */}
                <button
                  onClick={() => setCmdOpen(true)}
                  className={cn("flex h-9 w-9 items-center justify-center rounded-xl border transition",
                    isDark ? 'border-white/12 bg-white/6 text-[#4E9972]' : 'border-[#CFE6DA] bg-white/85 text-[#42635C]')}
                  aria-label="Search"
                >
                  <Command className="h-4 w-4" />
                </button>
                {/* Dark mode */}
                <button
                  onClick={() => setIsDark(d => !d)}
                  className={cn("flex h-9 w-9 items-center justify-center rounded-xl border transition",
                    isDark ? 'border-white/12 bg-white/6 text-[#13B96D]' : 'border-[#CFE6DA] bg-white/85 text-[#5B7A75]')}
                  aria-label="Toggle dark mode"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                {/* Insights */}
                <button
                  onClick={() => setIsMobileContextOpen(true)}
                  className={cn("rounded-xl border px-2.5 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] shadow-sm transition",
                    isDark ? 'border-white/12 bg-white/6 text-[#4E9972]' : 'border-[#CFE6DA] bg-white/85 text-[#42635C] hover:border-[#13B96D]/45')}
                >
                  {selectedTask ? 'Task' : 'Info'}
                </button>
              </div>
            </div>
          )}

          {/* Header with input box — shown for most views */}
          {!isPomodoroView && activeView !== 'weekly' && activeView !== 'templates' && !(isDeepWorkMode || isZenMode) && (
            <header className="mb-10 flex flex-col gap-6 transition-all duration-700 lg:mb-16">
              <div className="flex-1 lg:mr-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 lg:mb-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className={cn("text-2xl font-serif italic sm:text-3xl", isDark ? 'text-[#D8F0E6]' : 'text-[#1A3142]')}>
                      {(activeView === 'today' || activeView === 'digest')
                        ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user.email.split('@')[0]}`
                        : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Cmd+K search */}
                      <button
                        onClick={() => setCmdOpen(true)}
                        className={cn(
                          "flex items-center gap-2 self-start px-4 py-2 rounded-full border text-[10px] font-mono tracking-widest uppercase transition-all shadow-sm",
                          isDark
                            ? 'bg-white/6 border-white/12 text-[#4E9972] hover:text-[#13B96D] hover:border-[#13B96D]/40'
                            : 'bg-white/90 border-[#CFE6DA] text-[#5B7A75] hover:text-[#128D57] hover:border-[#13B96D]/40'
                        )}
                      >
                        <Command className="w-3 h-3" />
                        <span className="hidden sm:inline">Search</span>
                        <kbd className={cn("hidden sm:inline-flex text-[9px] px-1 py-0.5 rounded border", isDark ? 'border-white/10 text-[#2A5C42]' : 'border-[#CCE4D8] text-[#9AB8B0]')}>⌘K</kbd>
                      </button>
                      {/* Deep Work */}
                      <button
                        onClick={() => setIsDeepWorkMode(!isDeepWorkMode)}
                        className={cn(
                          "flex items-center gap-2 self-start px-4 py-2 rounded-full border text-[10px] font-mono tracking-widest uppercase transition-all shadow-sm",
                          isDark
                            ? 'bg-white/6 border-white/12 text-[#4E9972] hover:text-[#13B96D] hover:border-[#13B96D]/40'
                            : 'bg-white/90 border-[#CFE6DA] text-[#5B7A75] hover:text-[#128D57] hover:border-[#13B96D]/40'
                        )}
                      >
                        <Sparkles className="w-3 h-3" /> Deep Work
                      </button>
                      {/* Dark mode toggle */}
                      <button
                        onClick={() => setIsDark(d => !d)}
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-full border transition-all shadow-sm",
                          isDark
                            ? 'bg-white/6 border-white/12 text-[#13B96D] hover:border-[#13B96D]/40'
                            : 'bg-white/90 border-[#CFE6DA] text-[#5B7A75] hover:text-[#128D57] hover:border-[#13B96D]/40'
                        )}
                      >
                        {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {(activeView === 'today' || activeView === 'digest') && (
                    <div className="mt-2 flex items-center gap-4">
                      <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isDark ? 'bg-[#13B96D]/15' : 'bg-[#DDEFE6]')}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} className="h-full bg-[#13B96D]" />
                      </div>
                      <span className={cn("text-[10px] font-mono tracking-widest uppercase", isDark ? 'text-[#4E9972]' : 'text-[#6B8D86]')}>{completionRate}% DONE</span>
                    </div>
                  )}
                </motion.div>
                <InputBox onAddTask={handleAddTask} selectedDate={selectedDate} />
              </div>
            </header>
          )}

          {/* Scrollable view area */}
          <div className={cn(
            'flex-1 flex flex-col transition-all duration-1000',
            isZenMode ? 'overflow-hidden' : isPomodoroView ? 'overflow-visible' : 'overflow-y-auto pr-0 custom-scrollbar sm:pr-2'
          )}>
            <AnimatePresence mode="wait">
              {isDeepWorkMode ? (
                <motion.div
                  key="deep-work"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="h-full flex flex-col items-center justify-center text-center"
                >
                  {filteredTasks.filter(t => !t.completed).length > 0 ? (
                    <div className="space-y-12 max-w-lg w-full">
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono tracking-[0.4em] uppercase text-[#139C5E] font-bold">Current Focus</span>
                        <h3 className="text-5xl font-serif italic text-[#1A3142] leading-tight">
                          {filteredTasks.filter(t => !t.completed)[0].text}
                        </h3>
                        <div className="flex items-center justify-center gap-3">
                          {filteredTasks.filter(t => !t.completed)[0].tags.map(tag => (
                            <span key={tag} className="text-[10px] font-mono text-[#6B8D86] uppercase tracking-widest">#{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-6">
                        <button
                          onClick={() => handleToggleTask(filteredTasks.filter(t => !t.completed)[0].id)}
                          className="px-10 py-5 bg-[#13B96D] text-white rounded-[2rem] font-semibold shadow-2xl shadow-[#13B96D]/20 hover:bg-[#0FAA64] transition-all active:scale-95"
                        >
                          Complete Task
                        </button>
                        <button
                          onClick={() => setIsDeepWorkMode(false)}
                          className="px-10 py-5 bg-white border border-[#CEE6DB] text-[#5D7A74] rounded-[2rem] font-semibold hover:bg-[#F3FAF6] transition-all"
                        >
                          Exit Focus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-3xl font-serif italic text-[#85A59A]">All caught up.</p>
                      <button onClick={() => setIsDeepWorkMode(false)} className="text-sm font-mono tracking-widest uppercase text-[#139C5E] font-bold">
                        Return to Dashboard
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={activeView + (activeView === 'calendar' ? selectedDate.toISOString() : '') + (selectedTag || '')}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className={cn(!isPomodoroView && 'pb-24')}
                >
                  {/* Tag filter badge */}
                  {selectedTag && (
                    <div className="mb-10 flex items-center gap-4">
                      <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#6B8D86]">Filtering by</span>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#EAF7F1] text-[#12935A] rounded-full text-xs font-bold uppercase tracking-widest border border-[#CAE6D8]">
                        #{selectedTag}
                        <button onClick={() => setSelectedTag(null)} className="hover:text-[#0E7145] transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Carry-forward banner */}
                  {activeView === 'today' && overdueYesterday.length > 0 && !selectedTag && (
                    <div className="mb-10 p-6 glass rounded-3xl flex items-center justify-between border-[#D5ECE1] bg-[#F4FBF8]/90">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-[#13B96D]/12 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-[#12935A]" />
                        </div>
                        <div>
                          <p className="text-sm text-[#1D3441] font-medium">Unfinished tasks from yesterday</p>
                          <p className="text-xs text-[#5F7D78]">You have {overdueYesterday.length} items to address.</p>
                        </div>
                      </div>
                      <button
                        onClick={handleCarryForward}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#12935A] hover:text-[#0F7D4D] transition-colors"
                      >
                        Carry Forward <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* ── View rendering ── */}
                  {activeView === 'digest' ? (
                    <DailyDigest
                      tasks={tasks}
                      user={user}
                      onCarryForward={handleCarryForward}
                      onViewChange={handleViewChange}
                    />
                  ) : activeView === 'weekly' ? (
                    <WeeklyReview tasks={tasks} onAddTask={handleAddTask} />
                  ) : activeView === 'templates' ? (
                    <Templates onApply={handleApplyTemplate} />
                  ) : activeView === 'calendar' ? (
                    <div className="space-y-12">
                      <div className="glass p-8 rounded-[2rem]">
                        <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} tasks={tasks} />
                      </div>
                      <TaskList
                        title={`Tasks for ${selectedDate.toLocaleDateString()}`}
                        tasks={filteredTasks}
                        {...taskListProps}
                      />
                    </div>
                  ) : activeView === 'overdue' ? (
                    <div className="space-y-10">
                      {filteredTasks.length > 0 && (
                        <div className="p-6 glass rounded-3xl flex items-center justify-between border-[#D5ECE1] bg-[#F4FBF8]/90">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-[#13B96D]/12 flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-[#12935A]" />
                            </div>
                            <div>
                              <p className="text-sm text-[#1D3441] font-medium">Overdue tasks</p>
                              <p className="text-xs text-[#5F7D78]">You have {filteredTasks.length} tasks that need attention.</p>
                            </div>
                          </div>
                          <button
                            onClick={handleCarryForwardAll}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#12935A] hover:text-[#0F7D4D] transition-colors"
                          >
                            Carry Forward All <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <TaskList title="Overdue Tasks" tasks={filteredTasks} {...taskListProps} />
                    </div>
                  ) : activeView === 'timeline' ? (
                    <div className="space-y-16">
                      {timelineGroups.map(group => (
                        <TaskList key={group.label} title={group.label} tasks={group.tasks} {...taskListProps} />
                      ))}
                    </div>
                  ) : activeView === 'pomodoro' ? (
                    // Rendered as fixed overlay above — nothing here
                    <div/>
                  ) : (
                    <TaskList
                      title={activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                      tasks={filteredTasks}
                      {...taskListProps}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Undo toast */}
        <AnimatePresence>
          {deletedTask && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#173D35] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40"
            >
              <span className="text-sm font-medium text-white">Task deleted</span>
              <div className="h-4 w-px bg-white/10" />
              <button
                onClick={handleUndoDelete}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#85E2BA] hover:text-[#B4F2D5] transition-colors"
              >
                <Undo2 className="w-4 h-4" /> Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Context panel — desktop */}
      {!isPomodoroView && !isMobileLayout && (
        <ContextPanel
          tasks={tasks}
          selectedDate={selectedDate}
          selectedTask={selectedTask}
          onUpgrade={() => setIsProModalOpen(true)}
          isPro={isPro}

        />
      )}

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {!isPomodoroView && isMobileLayout && isMobileNavOpen && (
          <>
            <motion.button
              type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-[#173D35]/18 backdrop-blur-sm lg:hidden"
              aria-label="Close navigation"
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <div className="relative h-full">
                <Sidebar
                  activeView={activeView}
                  onViewChange={handleViewChange}
                  counts={counts}
                  onLogout={async () => { await authService.logout(); setUser(null); setAuthMode('login'); setAuthScreen('landing'); }}
                  tags={allTags}
                  selectedTag={selectedTag}
                  onTagSelect={tag => { setSelectedTag(tag); setIsMobileNavOpen(false); }}
                  isPro={isPro}
                  onUpgrade={() => { setIsProModalOpen(true); setIsMobileNavOpen(false); }}

                  className="h-full w-[84vw] max-w-[320px] shadow-[0_24px_64px_rgba(23,61,53,0.18)]"
                />
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D7ECE2] bg-white/90 text-[#5E7B76] shadow-sm"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile context panel */}
      <AnimatePresence>
        {!isPomodoroView && isMobileLayout && isMobileContextOpen && (
          <>
            <motion.button
              type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileContextOpen(false)}
              className="fixed inset-0 z-40 bg-[#173D35]/12 backdrop-blur-sm lg:hidden"
              aria-label="Close insights"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
            >
              <ContextPanel
                tasks={tasks}
                selectedDate={selectedDate}
                selectedTask={selectedTask}
                onUpgrade={() => setIsProModalOpen(true)}
                onClose={() => setIsMobileContextOpen(false)}
                isPro={isPro}

                className="h-[min(78vh,720px)] w-full rounded-t-[2rem] border-x-0 border-b-0 px-5 pb-8 pt-5 shadow-[0_-20px_60px_rgba(23,61,53,0.16)]"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pro modal */}
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        onUpgrade={() => {
          setUser(prev => prev ? { ...prev, plan: 'pro' } : null);
          setIsProModalOpen(false);
          setShowProWelcome(true);
        }}
      />

      {/* Pro welcome overlay */}
      <AnimatePresence>
        {showProWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-[#13B96D] text-white px-8 py-6 rounded-3xl shadow-2xl shadow-[#13B96D]/30 flex flex-col items-center gap-4 pointer-events-auto">
              <BrandLogo className="h-16 w-16 rounded-2xl bg-white/88 p-3 shadow-sm" />
              <div className="text-center">
                <h2 className="text-2xl font-serif italic mb-1">Welcome to Pro Mode</h2>
                <p className="text-emerald-50 text-sm">Your digital brain just got an upgrade.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
