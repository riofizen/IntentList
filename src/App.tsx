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
import { HabitTracker } from './components/HabitTracker';
import { CommandPalette } from './components/CommandPalette';
import { LandingPage } from './components/LandingPage';
import { Onboarding, type OnboardingResult } from './components/Onboarding';
import { ShareRecap } from './components/ShareRecap';
import { InsightsPanel } from './components/InsightsPanel';
import { MobileBottomNav } from './components/MobileBottomNav';
import { syncNotifications, clearAllNotifications } from './lib/notifications';
import { taskService, authService } from './services/api';
import { type ParsedIntent } from './lib/parser';
import { parseWithAI } from './services/aiParser';
import { suggestSubtasks } from './services/taskBreakdown';
import { generateRecurringTasks } from './lib/recurrence';
import {
  isToday, isTomorrow, parseISO, startOfToday, isYesterday,
  isSameWeek, isSameMonth, subWeeks, subMonths, format, addDays,
  startOfMonth,
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import {
  Undo2, AlertCircle, ChevronRight, ChevronLeft, Sparkles,
  X, Clock3, ShieldCheck, CheckCircle2, Menu, Moon, Sun,
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
  try { localStorage.setItem(getTaskCacheKey(userId), JSON.stringify(tasks)); }
  catch { /* silent */ }
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
  if (mode === 'pomodoro') return { title: 'Focus session complete', body: 'Time for a short break.', nextMode: 'shortBreak' as const };
  return { title: `${mode === 'longBreak' ? 'Long break' : 'Short break'} complete`, body: 'Ready to focus again?', nextMode: 'pomodoro' as const };
};

type AuthMode = 'login' | 'signup';

// ─── Auth ─────────────────────────────────────────────────────────────────────

const Auth: React.FC<{ onLogin: (user: User) => void; initialMode: AuthMode; onBack: () => void }> = ({ onLogin, initialMode, onBack }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setIsLogin(initialMode === 'login'); setError(''); }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const user = isLogin ? await authService.login(email, password) : await authService.signup(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isLogin ? 'Invalid email or password' : 'User already exists'));
    }
  };

  return (
    <div className="min-h-screen bg-[#EDF8F2] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="atmosphere" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass p-10 rounded-[2.5rem] relative z-10">
        <button onClick={onBack} className="absolute left-5 top-5 w-10 h-10 rounded-xl border border-[#D2E7DC] bg-white/80 flex items-center justify-center text-[#5E7B76] hover:text-[#274A40] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center gap-4 mb-10">
          <motion.div initial={{ rotate: -10, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }}
            className="w-16 h-16 rounded-3xl border border-[#CDE6DB] bg-white/88 p-3.5 shadow-xl shadow-[#13B96D]/15">
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
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-[#F5FCF8] border border-[#CFE7DC] focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all text-[#1C3340] placeholder:text-[#9AB8B0]"
              placeholder="name@example.com" required />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#6B8D86] ml-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-[#F5FCF8] border border-[#CFE7DC] focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all text-[#1C3340] placeholder:text-[#9AB8B0]"
              placeholder="••••••••" required />
          </div>
          {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
          <button className="w-full py-4 bg-[#13B96D] text-white rounded-2xl font-semibold hover:bg-[#10A763] transition-all shadow-xl shadow-[#13B96D]/20 active:scale-[0.98]">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-8 text-sm text-[#6B8D86] hover:text-[#274A40] transition-colors font-medium">
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </motion.div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try { const s = localStorage.getItem('intentlist_user'); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
  const [authScreen, setAuthScreen]   = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode]       = useState<AuthMode>('login');
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [activeView, setActiveView]   = useState<ViewType>('digest');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isDeepWorkMode, setIsDeepWorkMode] = useState(false);
  const [isZenMode, setIsZenMode]     = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState<string | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [showProWelcome, setShowProWelcome] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const [deletedTask, setDeletedTask] = useState<{ task: Task; timeout: ReturnType<typeof setTimeout> } | null>(null);
  const [cmdOpen, setCmdOpen]               = useState(false);
  const [isDark, setIsDark]                 = useLocalStorage<boolean>('intentlist_dark_mode', false);
  const [showOnboarding, setShowOnboarding] = useLocalStorage<boolean>('intentlist_onboarding_done', false);
  const [showShareRecap, setShowShareRecap] = useState(false);

  const [pomodoroMode, setPomodoroMode]     = useLocalStorage<'pomodoro' | 'shortBreak' | 'longBreak'>('pomodoro_mode', 'pomodoro');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useLocalStorage<number>('pomodoro_time', 25 * 60);
  const [pomodoroIsActive, setPomodoroIsActive] = useLocalStorage<boolean>('pomodoro_active', false);
  const [pomodoroIsMuted, setPomodoroIsMuted]   = useLocalStorage<boolean>('pomodoro_muted', false);
  const [pomodoroEndAt, setPomodoroEndAt]       = useLocalStorage<number | null>('pomodoro_end_at', null);
  const [pomodoroNotificationsEnabled, setPomodoroNotificationsEnabled] = useLocalStorage<boolean>('pomodoro_notifications', true);
  const [pomodoroKeepAwake, setPomodoroKeepAwake] = useLocalStorage<boolean>('pomodoro_keep_awake', true);

  const [isMobileLayout, setIsMobileLayout]     = useState(() => window.innerWidth < 1024);
  const [isMobileNavOpen, setIsMobileNavOpen]   = useState(false);
  const [isMobileContextOpen, setIsMobileContextOpen] = useState(false);
  const [hasHydratedTasks, setHasHydratedTasks] = useState(false);
  const wakeLockRef        = useRef<{ release: () => Promise<void> } | null>(null);
  const timerCompletionRef = useRef<string | null>(null);

  const isPro = user?.plan === 'pro';

  // ── Dark mode ─────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // ── Notification sync ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || tasks.length === 0) return;
    syncNotifications(tasks);
  }, [tasks, user]);

  useEffect(() => {
    let mounted = true;
    authService.getCurrentUser().then(u => { if (mounted) setUser(u); }).catch(console.error);
    const unsub = authService.onAuthStateChange(u => setUser(u));
    return () => { mounted = false; unsub(); };
  }, []);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setCmdOpen(o => !o); return;
      }
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const navMap: Partial<Record<string, ViewType>> = {
        'd':'digest','t':'today','o':'overdue','u':'upcoming','a':'all','w':'weekly',
      };
      if (navMap[e.key]) {
        e.preventDefault();
        setActiveView(navMap[e.key]!); setSelectedTaskId(null); setSelectedTag(null); setIsMobileNavOpen(false);
      } else if (e.key === 'Escape') {
        if (cmdOpen) { setCmdOpen(false); return; }
        setSelectedTaskId(null); setIsProModalOpen(false); setIsMobileNavOpen(false); setIsMobileContextOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen]);

  // ── Pomodoro ──────────────────────────────────────────────────────────────
  const notifyPomodoroCompletion = useCallback((mode: keyof typeof POMODORO_DURATIONS) => {
    if (!pomodoroNotificationsEnabled || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const { title, body } = getTimerCompletionMessage(mode);
    new Notification(title, { body, icon: '/logo.png', badge: '/logo.png', tag: 'intentlist-pomodoro' });
  }, [pomodoroNotificationsEnabled]);

  const completePomodoroTimer = useCallback((mode: keyof typeof POMODORO_DURATIONS) => {
    const key = `${mode}-${pomodoroEndAt ?? Date.now()}`;
    if (timerCompletionRef.current === key) return;
    timerCompletionRef.current = key;
    setPomodoroIsActive(false); setPomodoroEndAt(null);
    if (!pomodoroIsMuted) { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); }
    notifyPomodoroCompletion(mode);
    const { nextMode } = getTimerCompletionMessage(mode);
    setPomodoroMode(nextMode); setPomodoroTimeLeft(POMODORO_DURATIONS[nextMode]);
  }, [notifyPomodoroCompletion, pomodoroEndAt, pomodoroIsMuted, setPomodoroEndAt, setPomodoroIsActive, setPomodoroMode, setPomodoroTimeLeft]);

  useEffect(() => {
    if (!pomodoroIsActive) return;
    if (pomodoroEndAt === null) { setPomodoroEndAt(Date.now() + pomodoroTimeLeft * 1000); return; }
    const sync = () => {
      const remaining = Math.max(0, Math.ceil((pomodoroEndAt - Date.now()) / 1000));
      setPomodoroTimeLeft(prev => prev === remaining ? prev : remaining);
      if (remaining === 0) completePomodoroTimer(pomodoroMode);
    };
    sync();
    const iv = setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', sync); window.removeEventListener('focus', sync); };
  }, [completePomodoroTimer, pomodoroEndAt, pomodoroIsActive, pomodoroMode, pomodoroTimeLeft, setPomodoroEndAt, setPomodoroTimeLeft]);

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
    if (pomodoroIsActive && pomodoroKeepAwake) requestWakeLock(); else releaseWakeLock();
    const onVis = () => { if (document.visibilityState === 'visible' && pomodoroIsActive && pomodoroKeepAwake) requestWakeLock(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); if (!pomodoroIsActive) releaseWakeLock(); };
  }, [pomodoroIsActive, pomodoroKeepAwake, releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    const onResize = () => setIsMobileLayout(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('intentlist_user', JSON.stringify(user));
      setHasHydratedTasks(false);
      loadTasks();
    } else {
      localStorage.removeItem('intentlist_user'); setTasks([]); setHasHydratedTasks(false);
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
    setTasks(cached); setHasHydratedTasks(true);
    try {
      const data = await taskService.getTasks(user.id);
      const merged = mergeTaskCollections(data, cached);

      // Generate next occurrences for recurring tasks
      const newRecurring = generateRecurringTasks(merged, user.id);
      if (newRecurring.length > 0) {
        const withRecurring = mergeTaskCollections([...merged, ...newRecurring], []);
        setTasks(withRecurring);
        for (const t of newRecurring) { try { await taskService.createTask(t); } catch { /* silent */ } }
      } else {
        setTasks(merged);
      }
    } catch { /* use cache */ }
  };

  useEffect(() => {
    if (!user || !hasHydratedTasks) return;
    writeTaskCache(user.id, tasks);
  }, [hasHydratedTasks, tasks, user]);

  // ── Task handlers ─────────────────────────────────────────────────────────

  const handleAddTask = async (parsed: ParsedIntent) => {
    if (!user) return;
    if (user.plan === 'free' && (tasks.length >= FREE_TASK_LIMIT || parsed.isAdvanced)) { setIsProModalOpen(true); return; }
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9), userId: user.id,
      text: parsed.text, date: format(parsed.date, 'yyyy-MM-dd'), time: parsed.time,
      completed: false, priority: parsed.priority, tags: parsed.tags,
      createdAt: new Date().toISOString(), recurrence: parsed.recurrence ?? null,
      duration: parsed.duration ?? null, raw: parsed.raw,
    };
    setTasks(prev => [...prev, newTask]);
    (async () => {
      let finalTask = { ...newTask };
      if (user.plan === 'pro') {
        try {
          const aiResult = await parseWithAI(parsed.raw, selectedDate);
          if (aiResult) {
            finalTask = { ...finalTask, text: aiResult.text, date: aiResult.date, time: aiResult.time, priority: aiResult.priority, tags: [...new Set([...parsed.tags, ...aiResult.tags])] };
            setTasks(prev => prev.map(t => t.id === newTask.id ? finalTask : t));
          }
        } catch { /* silent */ }
      }
      try { await taskService.createTask(finalTask); } catch { /* silent */ }
    })();
  };

  const handleApplyTemplate = async (batch: Omit<Task, 'id' | 'userId' | 'createdAt' | 'completed'>[]) => {
    if (!user) return;
    const newTasks: Task[] = batch.map(t => ({
      ...t, id: Math.random().toString(36).substr(2, 9), userId: user.id,
      completed: false, createdAt: new Date().toISOString(), parentId: null, recurrence: null, duration: null,
    }));
    setTasks(prev => [...prev, ...newTasks]);
    setActiveView('today');
    for (const t of newTasks) { try { await taskService.createTask(t); } catch { /* silent */ } }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id); if (!task) return;
    const updated = { ...task, completed: !task.completed };
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    await taskService.updateTask(id, { completed: updated.completed });
    setSelectedTaskId(id);
  };

  const handleUpdatePriority = async (id: string, priority: Priority) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
    await taskService.updateTask(id, { priority });
  };

  const handleEditTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try { await taskService.updateTask(id, updates); } catch { /* silent */ }
  };

  const handleOnboardingComplete = async (result: OnboardingResult) => {
    setShowOnboarding(true); // mark done
    // Add first task if provided
    if (result.firstTask && user) {
      await handleAddTask(result.firstTask);
    }
    // Add habit if selected
    if (result.habit) {
      const stored = localStorage.getItem('intentlist_habits');
      const habits = stored ? JSON.parse(stored) : [];
      habits.push({
        id: Math.random().toString(36).substr(2, 9),
        name: result.habit.name,
        icon: result.habit.icon,
        color: result.habit.color,
        frequency: 7,
        completedDates: [],
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('intentlist_habits', JSON.stringify(habits));
    }
    // Navigate to digest if they added a task
    if (result.firstTask) setActiveView('digest');
    else if (result.habit) setActiveView('habits');
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id); if (!task) return;
    setTasks(prev => prev.filter(t => t.id !== id && t.parentId !== id));
    if (deletedTask) clearTimeout(deletedTask.timeout);
    const timeout = setTimeout(async () => { await taskService.deleteTask(id); setDeletedTask(null); }, 5000);
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
    const task = tasks.find(t => t.id === id); if (!task) return;
    setIsBreakingDown(id);
    try {
      const subtasks = await suggestSubtasks(task.text);
      if (subtasks.length > 0) {
        for (const sub of subtasks) {
          const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9), userId: user.id, text: sub,
            date: task.date, time: null, completed: false, priority: 'normal',
            tags: [...task.tags.filter(t => t !== 'parent'), 'subtask'],
            createdAt: new Date().toISOString(), parentId: id, recurrence: null, duration: null,
          };
          setTasks(prev => [...prev, newTask]);
          try { await taskService.createTask(newTask); } catch { /* silent */ }
        }
        setTasks(prev => prev.map(t => t.id === id ? { ...t, tags: [...new Set([...t.tags, 'parent'])] } : t));
        await taskService.updateTask(id, { tags: [...new Set([...task.tags, 'parent'])] });
      }
    } catch { /* silent */ } finally { setIsBreakingDown(null); }
  };

  const handleCarryForwardAll = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const overdue = tasks.filter(t => !t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date)));
    setTasks(prev => prev.map(t => (!t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date))) ? { ...t, date: today } : t));
    for (const t of overdue) { try { await taskService.updateTask(t.id, { date: today }); } catch { /* silent */ } }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

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
    const s = new Set<string>(); tasks.forEach(t => t.tags.forEach(tag => s.add(tag)));
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
    pomodoro:  0, weekly: 0, templates: 0, habits: 0, insights: 0,
  };

  const selectedTask     = tasks.find(t => t.id === selectedTaskId);
  const overdueYesterday = tasks.filter(t => !t.completed && isYesterday(parseISO(t.date)));
  const completionRate   = useMemo(() => {
    const td = tasks.filter(t => isToday(parseISO(t.date)) && !t.parentId);
    return td.length === 0 ? 0 : Math.round((td.filter(t => t.completed).length / td.length) * 100);
  }, [tasks]);

  const isPomodoroView = activeView === 'pomodoro';

  // Grab streak from pomodoro analytics for share recap
  const analytics = (() => {
    try { const r = localStorage.getItem('pomodoro_data_center'); return r ? JSON.parse(r) : null; } catch { return null; }
  })();

  const handleSelectTask = (id: string) => {
    setSelectedTaskId(id);
    if (isMobileLayout) setIsMobileContextOpen(true);
  };

  const handleViewChange = (view: ViewType) => {
    setActiveView(view); setSelectedTaskId(null); setSelectedTag(null); setIsMobileNavOpen(false);
    if (view === 'pomodoro') setIsMobileContextOpen(false);
  };

  const taskListProps = {
    allTasks: tasks, onToggle: handleToggleTask, onDelete: handleDeleteTask,
    onUpdatePriority: handleUpdatePriority, onEdit: handleEditTask,
    onSelect: handleSelectTask, onMoveToToday: handleMoveToToday,
    onBreakdown: handleBreakdown, selectedTaskId, isBreakingDown,
  };

  // ── Render guards ─────────────────────────────────────────────────────────

  if (showEntrance) return <EntranceAnimatic onComplete={() => setShowEntrance(false)} />;

  if (!user) {
    if (authScreen === 'landing') return <LandingPage onLogin={() => { setAuthMode('login'); setAuthScreen('auth'); }} onSignup={() => { setAuthMode('signup'); setAuthScreen('auth'); }} />;
    return <Auth onLogin={setUser} initialMode={authMode} onBack={() => setAuthScreen('landing')} />;
  }

  return (
    <div className={cn(
      'flex h-screen bg-[#EDF8F2] text-[#1D3441] overflow-hidden relative transition-all duration-1000',
      isDeepWorkMode && 'bg-[#F2FBF6]',
      isZenMode && 'bg-[#14382F] text-[#E6F7EF]'
    )}>
      {!isPomodoroView && (
        <div className={cn('atmosphere transition-all duration-1000', isDeepWorkMode && 'opacity-40 scale-110 blur-3xl', isZenMode && 'opacity-10 scale-150 blur-[100px]')} />
      )}

      {/* ── Onboarding — first-run only ── */}
      <AnimatePresence>
        {user && !showOnboarding && (
          <Onboarding
            userEmail={user.email}
            onComplete={handleOnboardingComplete}
            onSkip={() => setShowOnboarding(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Share Recap ── */}
      <AnimatePresence>
        {showShareRecap && (
          <ShareRecap
            tasks={tasks}
            userEmail={user.email}
            streak={analytics?.currentStreak ?? 0}
            onClose={() => setShowShareRecap(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Command Palette ── */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        tasks={tasks}
        onViewChange={handleViewChange}
        onSelectTask={handleSelectTask}
        onToggleTask={handleToggleTask}
      />

      {/* ── Pomodoro — fixed fullscreen overlay ── */}
      {isPomodoroView && (
        <div className="fixed inset-0 z-[60]">
          <PomodoroTimer
            isDeepWorkMode={isDeepWorkMode}
            onExit={() => setActiveView('digest')}
            mode={pomodoroMode}       setMode={setPomodoroMode}
            timeLeft={pomodoroTimeLeft} setTimeLeft={setPomodoroTimeLeft}
            endAt={pomodoroEndAt}     setEndAt={setPomodoroEndAt}
            isActive={pomodoroIsActive} setIsActive={setPomodoroIsActive}
            isMuted={pomodoroIsMuted} setIsMuted={setPomodoroIsMuted}
            notificationsEnabled={pomodoroNotificationsEnabled} setNotificationsEnabled={setPomodoroNotificationsEnabled}
            keepAwake={pomodoroKeepAwake} setKeepAwake={setPomodoroKeepAwake}
            isZenMode={isZenMode}     setIsZenMode={setIsZenMode}
            tasks={tasks.filter(t => isToday(parseISO(t.date)) && !t.completed && !t.parentId)}
          />
        </div>
      )}

      {/* Sidebar — desktop */}
      {!isPomodoroView && !isMobileLayout && (
        <Sidebar
          activeView={activeView} onViewChange={handleViewChange} counts={counts}
          onLogout={async () => { await authService.logout(); clearAllNotifications(); setUser(null); setAuthMode('login'); setAuthScreen('landing'); }}
          tags={allTags} selectedTag={selectedTag} onTagSelect={setSelectedTag}
          isPro={isPro} onUpgrade={() => setIsProModalOpen(true)}
          onOpenSearch={() => setCmdOpen(true)}
          className={cn('transition-all duration-500', isZenMode && 'opacity-0 -translate-x-full pointer-events-none')}
        />
      )}

      {/* Main */}
      <main className={cn('flex-1 flex flex-col min-w-0 relative', isPomodoroView && 'overflow-y-auto overflow-x-hidden custom-scrollbar')}
        onClick={e => { if (e.target === e.currentTarget) setSelectedTaskId(null); }}>
        <div className={cn(
          'max-w-4xl w-full mx-auto px-4 pt-6 pb-6 flex-1 flex flex-col overflow-hidden transition-all duration-700 sm:px-6 sm:pt-8 lg:px-8 lg:pt-16 lg:pb-8',
          isPomodoroView && 'max-w-full px-0 pt-0 pb-0 overflow-visible',
          isDeepWorkMode && 'max-w-2xl pt-32',
          isZenMode && 'max-w-full px-0 pt-0'
        )}>

          {/* Mobile top bar */}
          {!isPomodoroView && !(isDeepWorkMode || isZenMode) && (
            <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
              <button onClick={() => setIsMobileNavOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#CFE6DA] bg-white/85 text-[#42635C] shadow-sm">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex flex-1 items-center justify-center gap-3">
                <BrandLogo className="h-10 w-10 rounded-2xl border border-[#CFE6DA] bg-white/85 p-1.5 shadow-sm" alt="IntentList logo" />
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold tracking-tight text-[#1A3142]">
                    {activeView === 'digest' || activeView === 'today' ? `Hello, ${user.email.split('@')[0]}` : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">IntentList</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setIsDark(d => !d)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#CFE6DA] bg-white/85 text-[#42635C] shadow-sm transition-all"
                  title={isDark ? 'Light mode' : 'Dark mode'}>
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button onClick={() => setIsMobileContextOpen(true)}
                  className="rounded-2xl border border-[#CFE6DA] bg-white/85 px-3 py-3 text-[10px] font-mono uppercase tracking-[0.24em] text-[#42635C] shadow-sm">
                  {selectedTask ? 'Task' : 'Info'}
                </button>
              </div>
            </div>
          )}

          {!isPomodoroView && activeView === 'weekly' && !isDeepWorkMode && !isZenMode && (
            <div className="mb-4 flex items-center justify-end">
              <button onClick={() => setShowShareRecap(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#13B96D] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#0FAA64] transition-all shadow-lg shadow-[#13B96D]/20 active:scale-95">
                Share this week ↗
              </button>
            </div>
          )}
          {!isPomodoroView && activeView !== 'weekly' && activeView !== 'templates' && activeView !== 'habits' && activeView !== 'insights' && !(isDeepWorkMode || isZenMode) && (
            <header className="mb-10 flex flex-col gap-6 transition-all duration-700 lg:mb-16">
              <div className="flex-1 lg:mr-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 lg:mb-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-serif italic text-[#1A3142] sm:text-3xl">
                      {(activeView === 'today' || activeView === 'digest')
                        ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user.email.split('@')[0]}`
                        : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setIsDeepWorkMode(!isDeepWorkMode)}
                        className="flex items-center gap-2 self-start px-4 py-2 rounded-full bg-white/90 border border-[#CFE6DA] text-[10px] font-mono tracking-widest uppercase text-[#5B7A75] hover:text-[#128D57] hover:border-[#13B96D]/40 transition-all shadow-sm">
                        <Sparkles className="w-3 h-3" /> Deep Work
                      </button>
                      <button onClick={() => setIsDark(d => !d)}
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 border border-[#CFE6DA] text-[#5B7A75] hover:text-[#128D57] hover:border-[#13B96D]/40 transition-all shadow-sm">
                        {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      </button>
                    </div>
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

          {/* Scrollable content */}
          <div className={cn(
            'flex-1 flex flex-col transition-all duration-1000',
            isZenMode ? 'overflow-hidden' : isPomodoroView ? 'overflow-visible' : 'overflow-y-auto pr-0 custom-scrollbar sm:pr-2'
          )}>
            <AnimatePresence mode="wait">
              {isDeepWorkMode ? (
                <motion.div key="deep-work" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="h-full flex flex-col items-center justify-center text-center">
                  {filteredTasks.filter(t => !t.completed).length > 0 ? (
                    <div className="space-y-12 max-w-lg w-full">
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono tracking-[0.4em] uppercase text-[#139C5E] font-bold">Current Focus</span>
                        <h3 className="text-5xl font-serif italic text-[#1A3142] leading-tight">{filteredTasks.filter(t => !t.completed)[0].text}</h3>
                      </div>
                      <div className="flex items-center justify-center gap-6">
                        <button onClick={() => handleToggleTask(filteredTasks.filter(t => !t.completed)[0].id)}
                          className="px-10 py-5 bg-[#13B96D] text-white rounded-[2rem] font-semibold shadow-2xl shadow-[#13B96D]/20 hover:bg-[#0FAA64] transition-all active:scale-95">
                          Complete Task
                        </button>
                        <button onClick={() => setIsDeepWorkMode(false)}
                          className="px-10 py-5 bg-white border border-[#CEE6DB] text-[#5D7A74] rounded-[2rem] font-semibold hover:bg-[#F3FAF6] transition-all">
                          Exit Focus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-3xl font-serif italic text-[#85A59A]">All caught up.</p>
                      <button onClick={() => setIsDeepWorkMode(false)} className="text-sm font-mono tracking-widest uppercase text-[#139C5E] font-bold">Return to Dashboard</button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={activeView + (activeView === 'calendar' ? selectedDate.toISOString() : '') + (selectedTag || '')}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className={cn(!isPomodoroView && 'pb-24 lg:pb-24')}>

                  {selectedTag && (
                    <div className="mb-10 flex items-center gap-4">
                      <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#6B8D86]">Filtering by</span>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#EAF7F1] text-[#12935A] rounded-full text-xs font-bold uppercase tracking-widest border border-[#CAE6D8]">
                        #{selectedTag}
                        <button onClick={() => setSelectedTag(null)}><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  )}

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
                      <button onClick={handleCarryForward} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#12935A] hover:text-[#0F7D4D] transition-colors">
                        Carry Forward <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {activeView === 'digest' ? (
                    <DailyDigest tasks={tasks} user={user} onCarryForward={handleCarryForward} onViewChange={handleViewChange} onUpgrade={() => setIsProModalOpen(true)} />
                  ) : activeView === 'weekly' ? (
                    <div>
                      <div className="flex items-center justify-end mb-4 lg:hidden">
                        <button onClick={() => setShowShareRecap(true)}
                          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#13B96D] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#0FAA64] transition-all shadow-lg shadow-[#13B96D]/20">
                          Share recap ↗
                        </button>
                      </div>
                      <WeeklyReview tasks={tasks} onAddTask={handleAddTask} />
                    </div>
                  ) : activeView === 'templates' ? (
                    <Templates onApply={handleApplyTemplate} />
                  ) : activeView === 'habits' ? (
                    <HabitTracker />
                  ) : activeView === 'insights' ? (
                    <div className="space-y-6 pb-24">
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#6B8D86] mb-2">
                          {new Date().toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}
                        </p>
                        <h2 className="text-3xl font-serif italic text-[#1A3142] mb-1">Your productivity profile.</h2>
                        <p className="text-sm text-[#6B8D86]">Calculated from your task history. Updates daily.</p>
                      </motion.div>
                      <InsightsPanel tasks={tasks} isPro={isPro} onUpgrade={() => setIsProModalOpen(true)} />
                    </div>
                  ) : activeView === 'calendar' ? (
                    <div className="space-y-12">
                      <div className="glass p-8 rounded-[2rem]">
                        <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} tasks={tasks} />
                      </div>
                      <TaskList title={`Tasks for ${selectedDate.toLocaleDateString()}`} tasks={filteredTasks} {...taskListProps} />
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
                          <button onClick={handleCarryForwardAll} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#12935A] hover:text-[#0F7D4D] transition-colors">
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
                    <div />
                  ) : (
                    <TaskList title={activeView.charAt(0).toUpperCase() + activeView.slice(1)} tasks={filteredTasks} {...taskListProps} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Undo toast */}
        <AnimatePresence>
          {deletedTask && (
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#173D35] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40">
              <span className="text-sm font-medium text-white">Task deleted</span>
              <div className="h-4 w-px bg-white/10" />
              <button onClick={handleUndoDelete} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#85E2BA] hover:text-[#B4F2D5] transition-colors">
                <Undo2 className="w-4 h-4" /> Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Context panel — desktop */}
      {!isPomodoroView && !isMobileLayout && (
        <ContextPanel tasks={tasks} selectedDate={selectedDate} selectedTask={selectedTask}
          onUpgrade={() => setIsProModalOpen(true)} isPro={isPro} />
      )}

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {!isPomodoroView && isMobileLayout && isMobileNavOpen && (
          <>
            <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-[#173D35]/18 backdrop-blur-sm lg:hidden" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden">
              <div className="relative h-full">
                <Sidebar activeView={activeView} onViewChange={handleViewChange} counts={counts}
                  onLogout={async () => { await authService.logout(); clearAllNotifications(); setUser(null); setAuthMode('login'); setAuthScreen('landing'); }}
                  tags={allTags} selectedTag={selectedTag}
                  onTagSelect={tag => { setSelectedTag(tag); setIsMobileNavOpen(false); }}
                  isPro={isPro} onUpgrade={() => { setIsProModalOpen(true); setIsMobileNavOpen(false); }}
                  onOpenSearch={() => { setCmdOpen(true); setIsMobileNavOpen(false); }}
                  className="h-full w-[84vw] max-w-[320px] shadow-[0_24px_64px_rgba(23,61,53,0.18)]" />
                <button onClick={() => setIsMobileNavOpen(false)}
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D7ECE2] bg-white/90 text-[#5E7B76] shadow-sm">
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
            <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileContextOpen(false)}
              className="fixed inset-0 z-40 bg-[#173D35]/12 backdrop-blur-sm lg:hidden" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
              <ContextPanel tasks={tasks} selectedDate={selectedDate} selectedTask={selectedTask}
                onUpgrade={() => setIsProModalOpen(true)} onClose={() => setIsMobileContextOpen(false)} isPro={isPro}
                className="h-[min(78vh,720px)] w-full rounded-t-[2rem] border-x-0 border-b-0 px-5 pb-8 pt-5 shadow-[0_-20px_60px_rgba(23,61,53,0.16)]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav — shown instead of hamburger for primary navigation */}
      {!isPomodoroView && !isZenMode && !isDeepWorkMode && isMobileLayout && (
        <MobileBottomNav
          activeView={activeView}
          onViewChange={handleViewChange}
          overdueCount={counts.overdue}
          isPro={isPro}
          onAddTask={() => {
            // Scroll to top so InputBox is visible
            document.querySelector('input[placeholder]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      {/* Pro modal */}
      <ProModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)}
        tasks={tasks}
        onUpgrade={() => { setUser(prev => prev ? { ...prev, plan: 'pro' } : null); setIsProModalOpen(false); setShowProWelcome(true); }} />

      {/* Pro welcome */}
      <AnimatePresence>
        {showProWelcome && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
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
