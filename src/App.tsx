import React, { useState, useEffect, useMemo } from 'react';
import { Task, User, ViewType, Priority } from './types';
import { Sidebar } from './components/Sidebar';
import { EntranceAnimatic } from './components/EntranceAnimatic';
import { PomodoroTimer } from './components/PomodoroTimer';
import { InputBox } from './components/InputBox';
import { TaskList } from './components/TaskList';
import { Calendar } from './components/Calendar';
import { ContextPanel } from './components/ContextPanel';
import { ProModal } from './components/ProModal';
import { taskService, authService } from './services/api';
import { parseIntent } from './lib/parser';
import { parseWithAI } from './services/aiParser';
import { suggestSubtasks } from './services/taskBreakdown';
import { isToday, isTomorrow, parseISO, startOfToday, isYesterday, isSameWeek, isSameMonth, subWeeks, subMonths, format, addDays, startOfMonth } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Undo2, AlertCircle, ChevronRight, ChevronLeft, Sparkles, X, Clock3, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLocalStorage } from './lib/useLocalStorage';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FREE_TASK_LIMIT = 50;

type AuthMode = 'login' | 'signup';

const Auth: React.FC<{ onLogin: (user: User) => void; initialMode: AuthMode; onBack: () => void }> = ({ onLogin, initialMode, onBack }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLogin(initialMode === 'login');
    setError('');
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const user = isLogin 
        ? await authService.login(email, password)
        : await authService.signup(email, password);
      onLogin(user);
    } catch (err) {
      setError(isLogin ? 'Invalid email or password' : 'User already exists');
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
            className="w-16 h-16 bg-[#13B96D] rounded-3xl flex items-center justify-center text-white shadow-xl shadow-[#13B96D]/30"
          >
            <Sparkles className="w-8 h-8" />
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
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-[#F5FCF8] border border-[#CFE7DC] focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all text-[#1C3340] placeholder:text-[#9AB8B0]"
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#6B8D86] ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-[#F5FCF8] border border-[#CFE7DC] focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all text-[#1C3340] placeholder:text-[#9AB8B0]"
              placeholder="********"
              required
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

const LandingPage: React.FC<{ onLogin: () => void; onSignup: () => void }> = ({ onLogin, onSignup }) => {
  return (
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
            <div className="w-8 h-8 rounded-full bg-[#13B96D] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Focus Orbit</h1>
            </div>
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(3.2rem,9vw,7rem)] font-serif italic tracking-tight leading-[0.95] text-[#16253A]"
          >
            Focus Orbit
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-3 text-lg text-[#4F6873]"
          >
            Your daily life, beautifully in focus.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
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
              <div className="w-7 h-7 rounded-full bg-[#13B96D]/15 border border-[#13B96D]/25 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#139C5E]" />
              </div>
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
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('intentlist_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authScreen, setAuthScreen] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('today');
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

  // Pomodoro Global State (Persisted)
  const [pomodoroMode, setPomodoroMode] = useLocalStorage<'pomodoro' | 'shortBreak' | 'longBreak'>('pomodoro_mode', 'pomodoro');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useLocalStorage<number>('pomodoro_time', 25 * 60);
  const [pomodoroIsActive, setPomodoroIsActive] = useState(false); // Don't persist active state for safety
  const [pomodoroIsMuted, setPomodoroIsMuted] = useLocalStorage<boolean>('pomodoro_muted', false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomodoroIsActive && pomodoroTimeLeft > 0) {
      interval = setInterval(() => {
        setPomodoroTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (pomodoroTimeLeft === 0 && pomodoroIsActive) {
      setPomodoroIsActive(false);
      if (!pomodoroIsMuted) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      }
      // Auto switch
      if (pomodoroMode === 'pomodoro') {
        setPomodoroMode('shortBreak');
        setPomodoroTimeLeft(5 * 60);
      } else {
        setPomodoroMode('pomodoro');
        setPomodoroTimeLeft(25 * 60);
      }
    }
    return () => { if (interval) clearInterval(interval); };
  }, [pomodoroIsActive, pomodoroTimeLeft, pomodoroMode, pomodoroIsMuted]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('intentlist_user', JSON.stringify(user));
      loadTasks();
    } else {
      localStorage.removeItem('intentlist_user');
    }
  }, [user]);

  useEffect(() => {
    if (showProWelcome) {
      const timer = setTimeout(() => setShowProWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showProWelcome]);

  const loadTasks = async () => {
    if (!user) return;
    const data = await taskService.getTasks(user.id);
    setTasks(data);
  };

  const handleAddTask = async (text: string, date: string, time: string | null, isAdvanced: boolean) => {
    if (!user) return;
    
    if (user.plan === 'free') {
      if (tasks.length >= FREE_TASK_LIMIT || isAdvanced) {
        setIsProModalOpen(true);
        return;
      }
    }

    // 1. Create initial task object with rule-based results
    const parsed = parseIntent(text);
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      text: parsed.text,
      date: date,
      time: time,
      completed: false,
      priority: parsed.priority,
      tags: parsed.tags,
      createdAt: new Date().toISOString(),
    };

    // 2. Optimistic UI update
    setTasks(prev => [...prev, newTask]);

    // 3. Background processing
    (async () => {
      let finalTask = { ...newTask };
      
      // AI refinement for Pro users
      if (user.plan === 'pro') {
        try {
          const aiResult = await parseWithAI(text, selectedDate);
          if (aiResult) {
            finalTask = {
              ...finalTask,
              text: aiResult.text,
              date: aiResult.date,
              time: aiResult.time,
              priority: aiResult.priority,
              tags: [...new Set([...parsed.tags, ...aiResult.tags])],
            };
            // Update UI with refined results
            setTasks(prev => prev.map(t => t.id === newTask.id ? finalTask : t));
          }
        } catch (error) {
          console.error('AI Parsing failed:', error);
        }
      }
      
      // Persist the final task
      try {
        await taskService.createTask(finalTask);
      } catch (error) {
        console.error('Failed to persist task:', error);
        // Optional: handle persistence failure (e.g. show error toast)
      }
    })();
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
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated = { ...task, priority };
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    await taskService.updateTask(id, { priority });
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Visual removal
    setTasks(prev => prev.filter(t => t.id !== id));
    
    // Clear previous timeout if exists
    if (deletedTask) clearTimeout(deletedTask.timeout);

    const timeout = setTimeout(async () => {
      await taskService.deleteTask(id);
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
    
    // Optimistic Update
    setTasks(prev => prev.map(t => 
      (!t.completed && isYesterday(parseISO(t.date))) ? { ...t, date: today } : t
    ));

    // Background Persistence
    (async () => {
      for (const task of yesterdayTasks) {
        await taskService.updateTask(task.id, { date: today });
      }
    })();
  };

  const handleMoveToToday = async (id: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    setTasks(prev => prev.map(t => t.id === id ? { ...t, date: today } : t));
    await taskService.updateTask(id, { date: today });
  };

  const handleBreakdown = async (id: string) => {
    if (!user) return;
    if (user.plan === 'free') {
      setIsProModalOpen(true);
      return;
    }

    const task = tasks.find(t => t.id === id);
    if (!task) return;

    setIsBreakingDown(id);
    try {
      const subtasks = await suggestSubtasks(task.text);
      if (subtasks && subtasks.length > 0) {
        // Create subtasks as new tasks for the same date
        for (const sub of subtasks) {
          const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            text: sub,
            date: task.date,
            time: null,
            completed: false,
            priority: 'normal',
            tags: [...task.tags, 'subtask'],
            createdAt: new Date().toISOString(),
          };
          setTasks(prev => [...prev, newTask]);
          await taskService.createTask(newTask);
        }
        // Optionally mark original task as completed or add a tag
        await taskService.updateTask(id, { tags: [...task.tags, 'parent'] });
        setTasks(prev => prev.map(t => t.id === id ? { ...t, tags: [...t.tags, 'parent'] } : t));
      }
    } catch (error) {
      console.error('Breakdown failed:', error);
    } finally {
      setIsBreakingDown(null);
    }
  };

  const handleCarryForwardAll = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const overdueTasks = tasks.filter(t => !t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date)));
    
    // Optimistic Update
    setTasks(prev => prev.map(t => 
      (!t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date))) ? { ...t, date: today } : t
    ));

    // Background Persistence
    (async () => {
      for (const task of overdueTasks) {
        await taskService.updateTask(task.id, { date: today });
      }
    })();
  };

  const filteredTasks = useMemo(() => {
    const today = startOfToday();
    let filtered = tasks;

    if (selectedTag) {
      filtered = filtered.filter(t => t.tags.includes(selectedTag));
    }

    return filtered.filter(task => {
      const taskDate = parseISO(task.date);
      switch (activeView) {
        case 'today': return isToday(taskDate);
        case 'overdue': return !task.completed && taskDate < today && !isToday(taskDate);
        case 'upcoming': return taskDate > today;
        case 'calendar': return task.date === format(selectedDate, 'yyyy-MM-dd');
        case 'all': return true;
        case 'timeline': return true;
        default: return true;
      }
    });
  }, [tasks, activeView, selectedDate, selectedTag]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [tasks]);

  const timelineGroups = useMemo(() => {
    if (activeView !== 'timeline') return [];
    
    const today = startOfToday();
    const yesterday = addDays(today, -1);
    
    const groups = [
      { label: 'Today', tasks: tasks.filter(t => isToday(parseISO(t.date))) },
      { label: 'Yesterday', tasks: tasks.filter(t => isYesterday(parseISO(t.date))) },
      { label: 'This Week', tasks: tasks.filter(t => isSameWeek(parseISO(t.date), today) && !isToday(parseISO(t.date)) && !isYesterday(parseISO(t.date))) },
      { label: 'Last Week', tasks: tasks.filter(t => isSameWeek(parseISO(t.date), subWeeks(today, 1))) },
      { label: 'Last Month', tasks: tasks.filter(t => isSameMonth(parseISO(t.date), subMonths(today, 1))) },
      { label: 'Older', tasks: tasks.filter(t => parseISO(t.date) < startOfMonth(subMonths(today, 1))) },
    ];
    
    return groups.filter(g => g.tasks.length > 0);
  }, [tasks, activeView]);

  const counts: Record<ViewType, number> = {
    today: tasks.filter(t => isToday(parseISO(t.date))).length,
    overdue: tasks.filter(t => !t.completed && parseISO(t.date) < startOfToday() && !isToday(parseISO(t.date))).length,
    upcoming: tasks.filter(t => parseISO(t.date) > startOfToday()).length,
    all: tasks.length,
    calendar: tasks.filter(t => t.date === format(selectedDate, 'yyyy-MM-dd')).length,
    timeline: tasks.length,
    pomodoro: 0,
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const overdueYesterday = tasks.filter(t => !t.completed && isYesterday(parseISO(t.date)));

  const completionRate = useMemo(() => {
    const todayTasks = tasks.filter(t => isToday(parseISO(t.date)));
    if (todayTasks.length === 0) return 0;
    return Math.round((todayTasks.filter(t => t.completed).length / todayTasks.length) * 100);
  }, [tasks]);
  const isPomodoroView = activeView === 'pomodoro';

  if (showEntrance) {
    return (
      <EntranceAnimatic 
        onComplete={() => {
          setShowEntrance(false);
        }} 
      />
    );
  }

  if (!user) {
    if (authScreen === 'landing') {
      return (
        <LandingPage
          onLogin={() => {
            setAuthMode('login');
            setAuthScreen('auth');
          }}
          onSignup={() => {
            setAuthMode('signup');
            setAuthScreen('auth');
          }}
        />
      );
    }
    return <Auth onLogin={setUser} initialMode={authMode} onBack={() => setAuthScreen('landing')} />;
  }

  return (
    <div className={cn(
      "flex h-screen bg-[#EDF8F2] text-[#1D3441] overflow-hidden relative transition-all duration-1000", 
      isPomodoroView && "bg-[#EDF8F2] text-[#1D3441]",
      isDeepWorkMode && "bg-[#F2FBF6]",
      isZenMode && "bg-[#14382F] text-[#E6F7EF]"
    )}>
      {!isPomodoroView && (
        <div className={cn(
          "atmosphere transition-all duration-1000",
          isDeepWorkMode && "opacity-40 scale-110 blur-3xl",
          isZenMode && "opacity-10 scale-150 blur-[100px]"
        )} />
      )}
      {!isPomodoroView && (
        <Sidebar 
          activeView={activeView} 
          onViewChange={(view) => {
            setActiveView(view);
            setSelectedTaskId(null);
            setSelectedTag(null);
          }} 
          counts={counts}
          onLogout={() => {
            setUser(null);
            setAuthMode('login');
            setAuthScreen('landing');
          }}
          tags={allTags}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          className={cn("transition-all duration-500", isZenMode && "opacity-0 -translate-x-full pointer-events-none")}
        />
      )}
      
      <main 
        className={cn("flex-1 flex flex-col min-w-0 relative", isPomodoroView && "overflow-y-auto overflow-x-hidden custom-scrollbar")}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedTaskId(null);
        }}
      >
        <div className={cn(
          "max-w-4xl w-full mx-auto px-8 pt-16 pb-8 flex-1 flex flex-col overflow-hidden transition-all duration-700", 
          isPomodoroView && "max-w-full px-0 pt-0 pb-0",
          isDeepWorkMode && "max-w-2xl pt-32",
          isZenMode && "max-w-full px-0 pt-0"
        )}>
          <header className={cn(
            "mb-16 flex items-end justify-between transition-all duration-700", 
            (isDeepWorkMode || isZenMode || isPomodoroView) && "opacity-0 pointer-events-none mb-0 h-0"
          )}>
            <div className="flex-1 mr-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-serif italic text-[#1A3142]">
                    {activeView === 'today' ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user.email.split('@')[0]}` : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                  </h2>
                  <button 
                    onClick={() => setIsDeepWorkMode(!isDeepWorkMode)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-[#CFE6DA] text-[10px] font-mono tracking-widest uppercase text-[#5B7A75] hover:text-[#128D57] hover:border-[#13B96D]/40 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    Deep Work
                  </button>
                </div>
                {activeView === 'today' && (
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex-1 h-1 bg-[#DDEFE6] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${completionRate}%` }}
                        className="h-full bg-[#13B96D]"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#6B8D86] tracking-widest uppercase">{completionRate}% DONE</span>
                  </div>
                )}
              </motion.div>
              <InputBox 
                onAddTask={handleAddTask} 
                selectedDate={selectedDate} 
              />
            </div>
          </header>

          <div className={cn(
            "flex-1 flex flex-col transition-all duration-1000",
            isZenMode ? "overflow-hidden" : isPomodoroView ? "overflow-visible" : "overflow-y-auto pr-2 custom-scrollbar"
          )}>
            <AnimatePresence mode="wait">
              {isDeepWorkMode ? (
                <motion.div
                  key="deep-work"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
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
                      <button 
                        onClick={() => setIsDeepWorkMode(false)}
                        className="text-sm font-mono tracking-widest uppercase text-[#139C5E] font-bold"
                      >
                        Return to Dashboard
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={activeView + (activeView === 'calendar' ? selectedDate.toISOString() : '') + (selectedTag || '')}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className={cn(!isPomodoroView && "pb-24")}
                >
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

                  {activeView === 'calendar' ? (
                    <div className="space-y-12">
                      <div className="glass p-8 rounded-[2rem]">
                        <Calendar 
                          selectedDate={selectedDate} 
                          onDateSelect={setSelectedDate}
                          tasks={tasks}
                        />
                      </div>
                      <TaskList 
                        title={`Tasks for ${selectedDate.toLocaleDateString()}`}
                        tasks={filteredTasks}
                        onToggle={handleToggleTask}
                        onDelete={handleDeleteTask}
                        onUpdatePriority={handleUpdatePriority}
                        onSelect={setSelectedTaskId}
                        onMoveToToday={handleMoveToToday}
                        onBreakdown={handleBreakdown}
                        selectedTaskId={selectedTaskId}
                        isBreakingDown={isBreakingDown}
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
                      <TaskList 
                        title="Overdue Tasks"
                        tasks={filteredTasks}
                        onToggle={handleToggleTask}
                        onDelete={handleDeleteTask}
                        onUpdatePriority={handleUpdatePriority}
                        onSelect={setSelectedTaskId}
                        onMoveToToday={handleMoveToToday}
                        onBreakdown={handleBreakdown}
                        selectedTaskId={selectedTaskId}
                        isBreakingDown={isBreakingDown}
                      />
                    </div>
                  ) : activeView === 'timeline' ? (
                    <div className="space-y-16">
                      {timelineGroups.map(group => (
                        <TaskList 
                          key={group.label}
                          title={group.label}
                          tasks={group.tasks}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                          onUpdatePriority={handleUpdatePriority}
                          onSelect={setSelectedTaskId}
                          onMoveToToday={handleMoveToToday}
                          onBreakdown={handleBreakdown}
                          selectedTaskId={selectedTaskId}
                          isBreakingDown={isBreakingDown}
                        />
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
                      isActive={pomodoroIsActive}
                      setIsActive={setPomodoroIsActive}
                      isMuted={pomodoroIsMuted}
                      setIsMuted={setPomodoroIsMuted}
                      isZenMode={isZenMode}
                      setIsZenMode={setIsZenMode}
                    />
                  ) : (
                    <TaskList 
                      title={activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                      tasks={filteredTasks}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      onUpdatePriority={handleUpdatePriority}
                      onSelect={setSelectedTaskId}
                      onMoveToToday={handleMoveToToday}
                      onBreakdown={handleBreakdown}
                      selectedTaskId={selectedTaskId}
                      isBreakingDown={isBreakingDown}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Undo Toast */}
        <AnimatePresence>
          {deletedTask && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
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

      {!isPomodoroView && (
        <ContextPanel 
          tasks={tasks} 
          selectedDate={selectedDate} 
          selectedTask={selectedTask}
          onUpgrade={() => setIsProModalOpen(true)}
        />
      )}

      <ProModal 
        isOpen={isProModalOpen} 
        onClose={() => setIsProModalOpen(false)}
        onUpgrade={() => {
          setUser(prev => prev ? { ...prev, plan: 'pro' } : null);
          setIsProModalOpen(false);
          setShowProWelcome(true);
        }}
      />

      {/* Pro Welcome Overlay */}
      <AnimatePresence>
        {showProWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-[#13B96D] text-white px-8 py-6 rounded-3xl shadow-2xl shadow-[#13B96D]/30 flex flex-col items-center gap-4 pointer-events-auto">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
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

