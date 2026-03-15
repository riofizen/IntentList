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
  X, Clock3, ShieldCheck, CheckCircle2, Menu,
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

const LandingPage: React.FC<{ onLogin: () => void; onSignup: () => void }> = ({ onLogin, onSignup }) => (
  <div className="min-h-screen relative overflow-hidden bg-[#EEF7F2] text-[#1E2F3A]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(76,185,136,0.16),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(112,188,165,0.14),transparent_42%)]" />
    <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(24,45,40,0.12)_1px,transparent_1px)] [background-size:14px_14px]" />

    {Array.from({ length: 3 }).map((_, i) => (
      <motion.div
        key={`shoot-${i}`}
        className="absolute left-[-180px] h-[1px] w-36 rotate-[-16deg] bg-gradient-to-r from-transparent via-[#1BB46B]/80 to-transparent"
        style={{ top: `${16 + i * 18}%` }}
        initial={{ x: -160, opacity: 0 }}
        animate={{ x: 1250, opacity: [0, 0.9, 0] }}
        transition={{ duration: 6.5 + i * 1.4, repeat: Infinity, ease: 'linear', delay: i * 1.3 }}
      />
    ))}

    <motion.div
      className="absolute -left-28 top-24 h-[320px] w-[320px] rounded-full bg-[#85E2BA]/20 blur-[88px]"
      animate={{ x: [0, 18, -10, 0], y: [0, 16, -6, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute right-[-80px] bottom-0 h-[360px] w-[360px] rounded-full bg-[#B5E8D2]/35 blur-[95px]"
      animate={{ x: [0, -18, 8, 0], y: [0, 12, -12, 0] }}
      transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
    />

    <div className="relative z-10 min-h-screen px-6 py-6 md:px-10 md:py-8 flex flex-col">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="h-10 w-10 rounded-2xl border border-[#CFE6DA] bg-white/85 p-1.5 shadow-sm" alt="IntentList logo" />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Focus Orbit</h1>
        </div>
        <div className="hidden md:flex items-center gap-10 text-sm text-[#1E2F3A]/75">
          <button className="hover:text-[#1E2F3A] transition-colors">Experience</button>
          <button className="hover:text-[#1E2F3A] transition-colors">Manifesto</button>
        </div>
        <button
          onClick={onLogin}
          className="px-5 py-2.5 rounded-full bg-[#13B96D]/15 border border-[#13B96D]/35 text-[#139C5E] text-sm font-semibold hover:bg-[#13B96D]/25 transition-colors"
        >
          Sign In
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <motion.h2
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(3.2rem,9vw,7rem)] font-serif italic tracking-tight leading-[0.95] text-[#16253A]"
        >
          Focus Orbit
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-3 text-lg text-[#4F6873]"
        >
          Your daily life, beautifully in focus.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.8 }}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          <button
            onClick={onSignup}
            className="px-10 py-3.5 rounded-full bg-[#13B96D] text-white font-semibold shadow-[0_10px_28px_rgba(19,185,109,0.35)] hover:bg-[#0FAA64] transition-all"
          >
            Start Session
          </button>
          <button
            onClick={onLogin}
            className="px-8 py-3.5 rounded-full border border-[#13B96D]/40 text-[#139C5E] font-semibold hover:bg-[#13B96D]/12 transition-colors"
          >
            Login
          </button>
        </motion.div>
      </main>

      <section className="rounded-3xl border border-[#D7EBE1] bg-white/55 backdrop-blur-md px-6 py-5 md:px-10 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-6 items-center">
          <div className="text-left">
            <BrandLogo className="h-7 w-7 rounded-full border border-[#13B96D]/25 bg-white/88 p-1" alt="IntentList logo" />
            <h3 className="mt-3 text-2xl font-semibold text-[#1D3340]">The Vibe</h3>
            <p className="mt-1 text-sm text-[#5A7481]">Organic motion inspired by the quiet pulses of nature.</p>
          </div>
          <div className="text-center md:border-l md:border-[#D7EBE1] md:pl-6">
            <Clock3 className="w-5 h-5 mx-auto text-[#139C5E]" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#6A8691]">Rhythmic Timers</p>
          </div>
          <div className="text-center md:border-l md:border-[#D7EBE1] md:pl-6">
            <ShieldCheck className="w-5 h-5 mx-auto text-[#139C5E]" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#6A8691]">Silent Spaces</p>
          </div>
          <div className="text-center md:border-l md:border-[#D7EBE1] md:pl-6">
            <CheckCircle2 className="w-5 h-5 mx-auto text-[#139C5E]" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#6A8691]">Natural Growth</p>
          </div>
        </div>
      </section>
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try { const s = localStorage.getItem('intentlist_user'); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
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
      setTasks(mergeTaskCollections(data, cached));
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
    onSelect: handleSelectTask,
    onMoveToToday: handleMoveToToday,
    onBreakdown: handleBreakdown,
    selectedTaskId,
    isBreakingDown,
  };

  return (
    <div className={cn(
      'flex h-screen bg-[#EDF8F2] text-[#1D3441] overflow-hidden relative transition-all duration-1000',
      isPomodoroView && 'bg-[#EDF8F2] text-[#1D3441]',
      isDeepWorkMode && 'bg-[#F2FBF6]',
      isZenMode && 'bg-[#14382F] text-[#E6F7EF]'
    )}>
      {!isPomodoroView && (
        <div className={cn('atmosphere transition-all duration-1000', isDeepWorkMode && 'opacity-40 scale-110 blur-3xl', isZenMode && 'opacity-10 scale-150 blur-[100px]')} />
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
            <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#CFE6DA] bg-white/85 text-[#42635C] shadow-sm transition hover:border-[#13B96D]/45 hover:text-[#12935A]"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex flex-1 items-center justify-center gap-3">
                <BrandLogo className="h-10 w-10 rounded-2xl border border-[#CFE6DA] bg-white/85 p-1.5 shadow-sm" alt="IntentList logo" />
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold tracking-tight text-[#1A3142]">
                    {activeView === 'digest' || activeView === 'today'
                      ? `Hello, ${user.email.split('@')[0]}`
                      : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">Focus Orbit</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileContextOpen(true)}
                className="rounded-2xl border border-[#CFE6DA] bg-white/85 px-3 py-3 text-[10px] font-mono uppercase tracking-[0.24em] text-[#42635C] shadow-sm transition hover:border-[#13B96D]/45 hover:text-[#12935A]"
              >
                {selectedTask ? 'Task' : 'Insights'}
              </button>
            </div>
          )}

          {/* Header with input box — shown for most views */}
          {!isPomodoroView && activeView !== 'weekly' && activeView !== 'templates' && !(isDeepWorkMode || isZenMode) && (
            <header className="mb-10 flex flex-col gap-6 transition-all duration-700 lg:mb-16">
              <div className="flex-1 lg:mr-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 lg:mb-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-serif italic text-[#1A3142] sm:text-3xl">
                      {(activeView === 'today' || activeView === 'digest')
                        ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user.email.split('@')[0]}`
                        : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                    </h2>
                    <button
                      onClick={() => setIsDeepWorkMode(!isDeepWorkMode)}
                      className="flex items-center gap-2 self-start px-4 py-2 rounded-full bg-white/90 border border-[#CFE6DA] text-[10px] font-mono tracking-widest uppercase text-[#5B7A75] hover:text-[#128D57] hover:border-[#13B96D]/40 transition-all shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" /> Deep Work
                    </button>
                  </div>
                  {(activeView === 'today' || activeView === 'digest') && (
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex-1 h-1 bg-[#DDEFE6] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} className="h-full bg-[#13B96D]" />
                      </div>
                      <span className="text-[10px] font-mono text-[#6B8D86] tracking-widest uppercase">{completionRate}% DONE</span>
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
                    <PomodoroTimer
                      isDeepWorkMode={isDeepWorkMode}
                      onExit={() => setActiveView('today')}
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
                    />
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
