import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, BarChart3, Bell, BellOff, Brain, Coffee,
  Flame, Minimize2, Maximize2, Pause, Play, RotateCcw,
  Sparkles, Target, X, Wind, Zap, Clock3,
} from "lucide-react";
import { cn } from "../App";
import { useLocalStorage } from "../lib/useLocalStorage";
import { getFocusInsight } from "../services/focusInsight";
import { BrandLogo } from "./BrandLogo";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode = "pomodoro" | "shortBreak" | "longBreak";
type TimerActionType = "start" | "pause" | "reset" | "mode_switch" | "session_complete";

interface PomodoroTimerProps {
  isDeepWorkMode?: boolean;
  onExit: () => void;
  mode: TimerMode;
  setMode: (mode: TimerMode) => void;
  timeLeft: number;
  setTimeLeft: (time: number) => void;
  endAt: number | null;
  setEndAt: (value: number | null) => void;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  keepAwake: boolean;
  setKeepAwake: (enabled: boolean) => void;
  isZenMode: boolean;
  setIsZenMode: (zen: boolean) => void;
}

interface DailyTimerStats {
  focusMinutes: number;
  breakMinutes: number;
  focusSessions: number;
  completions: number;
  starts: number;
  pauses: number;
  resets: number;
  modeSwitches: number;
}

interface TimerAction {
  id: string;
  type: TimerActionType;
  mode: TimerMode;
  at: string;
  note?: string;
}

interface TimerAnalytics {
  totalSessions: number;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastFocusDate: string | null;
  daily: Record<string, DailyTimerStats>;
  actions: TimerAction[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POMODORO_CYCLE = 4; // sessions before a long break

const MODES: Record<TimerMode, { label: string; short: string; duration: number; icon: React.ComponentType<{className?: string}> }> = {
  pomodoro:   { label: "Focus",       short: "FOCUS",  duration: 25 * 60, icon: Brain  },
  shortBreak: { label: "Short Break", short: "BREATHE",duration:  5 * 60, icon: Coffee },
  longBreak:  { label: "Long Break",  short: "RESTORE",duration: 15 * 60, icon: Wind   },
};

// Mode color themes — focus is dark/immersive, breaks are light/airy
const THEMES = {
  pomodoro: {
    bg:           "bg-[#071912]",
    bgGrad:       "from-[#050F0C] via-[#0A1F16] to-[#071912]",
    accent:       "#13B96D",
    accentDim:    "#0D7A49",
    accentGlow:   "rgba(19,185,109,0.55)",
    ringA:        "#13B96D",
    ringB:        "#62D6A2",
    ringTrack:    "rgba(19,185,109,0.12)",
    text:         "text-[#E4F5EE]",
    subtext:      "text-[#5FA882]",
    muted:        "text-[#2E6650]",
    cardBg:       "bg-white/5 border-white/10",
    cardText:     "text-[#E4F5EE]",
    cardSub:      "text-[#5FA882]",
    orb1:         "#1A5E3A",
    orb2:         "#0F3D28",
    orb3:         "#07231A",
    btnBg:        "bg-white/8 border-white/12 text-[#A8D9BF] hover:bg-white/15 hover:text-[#E4F5EE]",
    playBg:       "bg-[#13B96D] shadow-[0_0_40px_rgba(19,185,109,0.5)]",
    pauseBg:      "bg-[#13B96D] shadow-[0_0_40px_rgba(19,185,109,0.5)]",
    modeBtnActive:"bg-[#13B96D]/20 border-[#13B96D]/60 text-[#13B96D]",
    modeBtnInactive:"border-white/10 text-[#5FA882] hover:border-white/25 hover:text-[#A8D9BF]",
    panelBg:      "bg-[#071912]/98 border-white/10",
    insightColor: "text-[#5FA882]",
  },
  shortBreak: {
    bg:           "bg-[#EDF8F2]",
    bgGrad:       "from-[#E4F4EC] via-[#EDF8F2] to-[#E8F5F0]",
    accent:       "#0E9E58",
    accentDim:    "#0C7A46",
    accentGlow:   "rgba(14,158,88,0.4)",
    ringA:        "#13B96D",
    ringB:        "#4ECFA0",
    ringTrack:    "rgba(19,185,109,0.15)",
    text:         "text-[#1A3142]",
    subtext:      "text-[#4A7A6E]",
    muted:        "text-[#7AAAA0]",
    cardBg:       "bg-white/80 border-[#D0EAE0]",
    cardText:     "text-[#1A3142]",
    cardSub:      "text-[#4A7A6E]",
    orb1:         "#9EE5C5",
    orb2:         "#C8F0E0",
    orb3:         "#B5EDD6",
    btnBg:        "bg-white/80 border-[#C8E6D8] text-[#4A7A6E] hover:bg-white hover:text-[#1A3142]",
    playBg:       "bg-[#0E9E58] shadow-[0_0_30px_rgba(14,158,88,0.4)]",
    pauseBg:      "bg-[#0E9E58] shadow-[0_0_30px_rgba(14,158,88,0.4)]",
    modeBtnActive:"bg-[#0E9E58]/15 border-[#0E9E58]/50 text-[#0B7A44]",
    modeBtnInactive:"border-[#C8E6D8] text-[#4A7A6E] hover:border-[#A8D4C4] hover:text-[#1A3142]",
    panelBg:      "bg-[#EDF8F2]/98 border-[#C8E6D8]",
    insightColor: "text-[#4A7A6E]",
  },
  longBreak: {
    bg:           "bg-[#EDF8F2]",
    bgGrad:       "from-[#E0F2EA] via-[#EAF7F2] to-[#E5F4EE]",
    accent:       "#0B8A4E",
    accentDim:    "#086B3D",
    accentGlow:   "rgba(11,138,78,0.4)",
    ringA:        "#0E9E58",
    ringB:        "#6FD5A8",
    ringTrack:    "rgba(11,138,78,0.12)",
    text:         "text-[#1A3142]",
    subtext:      "text-[#3A6E62]",
    muted:        "text-[#7AAAA0]",
    cardBg:       "bg-white/80 border-[#C0E4D4]",
    cardText:     "text-[#1A3142]",
    cardSub:      "text-[#3A6E62]",
    orb1:         "#8ADEC0",
    orb2:         "#BEF0DE",
    orb3:         "#A5E8CE",
    btnBg:        "bg-white/80 border-[#C0E4D4] text-[#3A6E62] hover:bg-white hover:text-[#1A3142]",
    playBg:       "bg-[#0B8A4E] shadow-[0_0_30px_rgba(11,138,78,0.4)]",
    pauseBg:      "bg-[#0B8A4E] shadow-[0_0_30px_rgba(11,138,78,0.4)]",
    modeBtnActive:"bg-[#0B8A4E]/15 border-[#0B8A4E]/50 text-[#086B3D]",
    modeBtnInactive:"border-[#C0E4D4] text-[#3A6E62] hover:border-[#9DCFBE] hover:text-[#1A3142]",
    panelBg:      "bg-[#EAF7F2]/98 border-[#C0E4D4]",
    insightColor: "text-[#3A6E62]",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createDailyStats = (): DailyTimerStats => ({
  focusMinutes: 0, breakMinutes: 0, focusSessions: 0,
  completions: 0, starts: 0, pauses: 0, resets: 0, modeSwitches: 0,
});

const createInitialAnalytics = (): TimerAnalytics => ({
  totalSessions: 0, totalFocusMinutes: 0, totalBreakMinutes: 0,
  currentStreak: 0, longestStreak: 0, lastFocusDate: null,
  daily: {}, actions: [],
});

const getDateKey = (date: Date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

const getRecentDateKeys = (days: number) =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return getDateKey(d);
  });

const shortDayLabel = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString([], { weekday: "short" });

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

const createAction = (type: TimerActionType, mode: TimerMode, note?: string): TimerAction => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
  type, mode, note, at: new Date().toISOString(),
});

// ─── Ring SVG Component ───────────────────────────────────────────────────────

interface RingProps {
  progress: number;           // 0–100
  mode: TimerMode;
  isActive: boolean;
  isBreak: boolean;
  size: number;
}

const RING_STROKE = 10;

const TimerRing: React.FC<RingProps> = ({ progress, mode, isActive, isBreak, size }) => {
  const theme = THEMES[mode];
  const cx = size / 2;
  const r = cx - RING_STROKE * 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(progress, 100) / 100);
  const gradId = `ring-${mode}`;
  const filterId = `glow-${mode}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={theme.ringA} />
          <stop offset="100%" stopColor={theme.ringB} />
        </linearGradient>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={isActive ? "6" : "3"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${filterId}-hard`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={theme.ringTrack}
        strokeWidth={RING_STROKE}
      />

      {/* Thin decorative outer ring */}
      <circle
        cx={cx} cy={cx} r={r + RING_STROKE * 1.6}
        fill="none"
        stroke={mode === "pomodoro" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}
        strokeWidth="1"
        strokeDasharray="4 8"
        strokeLinecap="round"
      />

      {/* Main progress arc */}
      <motion.circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={false}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        transform={`rotate(-90 ${cx} ${cx})`}
        filter={isActive ? `url(#${filterId})` : `url(#${filterId}-hard)`}
      />

      {/* Leading dot */}
      {progress > 1 && progress < 99.5 && (() => {
        const angle = ((progress / 100) * 360 - 90) * (Math.PI / 180);
        const dotX = cx + r * Math.cos(angle);
        const dotY = cx + r * Math.sin(angle);
        return (
          <motion.circle
            cx={dotX} cy={dotY} r={RING_STROKE / 2 + 1}
            fill={theme.ringB}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            filter={`url(#${filterId})`}
          />
        );
      })()}
    </svg>
  );
};

// ─── Breathing Orbs for Break Mode ────────────────────────────────────────────

const BreathingOrb: React.FC<{ delay?: number; size: string; color: string; position: string }> = ({
  delay = 0, size, color, position
}) => (
  <motion.div
    className={cn("absolute rounded-full blur-3xl pointer-events-none", size, position)}
    style={{ background: color }}
    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.55, 0.3] }}
    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

// ─── Phase Dots ───────────────────────────────────────────────────────────────

const PhaseDots: React.FC<{
  completedInCycle: number;
  total: number;
  mode: TimerMode;
  isActive: boolean;
}> = ({ completedInCycle, total, mode, isActive }) => {
  const theme = THEMES[mode];
  return (
    <div className="flex items-center gap-2.5">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < completedInCycle;
        const current = i === completedInCycle && isActive;
        return (
          <motion.div
            key={i}
            animate={current ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "rounded-full transition-all duration-500",
              done    ? "w-4 h-4" : current ? "w-3 h-3" : "w-2.5 h-2.5",
            )}
            style={{
              background: done || current ? theme.accent : "transparent",
              border: `2px solid ${done || current ? theme.accent : (mode === "pomodoro" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)")}`,
              boxShadow: (done || current) && isActive ? `0 0 10px ${theme.accentGlow}` : "none",
            }}
          />
        );
      })}
    </div>
  );
};

// ─── Flow State Badge ─────────────────────────────────────────────────────────

const FlowBadge: React.FC<{ minutes: number; mode: TimerMode }> = ({ minutes, mode }) => {
  if (mode !== "pomodoro" || minutes < 12) return null;

  const label = minutes >= 20 ? "Deep flow" : "In the zone";
  const theme = THEMES[mode];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
      style={{
        background: "rgba(19,185,109,0.12)",
        borderColor: "rgba(19,185,109,0.3)",
      }}
    >
      <Zap className="w-3 h-3" style={{ color: theme.accent }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.accent }}>
        {label} · {minutes}m
      </span>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  onExit,
  mode, setMode,
  timeLeft, setTimeLeft,
  endAt, setEndAt,
  isActive, setIsActive,
  isMuted, setIsMuted,
  notificationsEnabled, setNotificationsEnabled,
  keepAwake, setKeepAwake,
  isZenMode, setIsZenMode,
}) => {
  const [insight, setInsight] = useState("A calm start makes everything easier.");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isDataCenterOpen, setIsDataCenterOpen] = useState(false);
  const [focusGoalMinutes, setFocusGoalMinutes] = useLocalStorage<number>("pomodoro_focus_goal", 90);
  const [completedSessions, setCompletedSessions] = useLocalStorage<number>("pomodoro_cycle_count", 0);
  const [analytics, setAnalytics] = useLocalStorage<TimerAnalytics>("pomodoro_data_center", createInitialAnalytics());
  const [flowSeconds, setFlowSeconds] = useState(0);
  const [showCompletionFlash, setShowCompletionFlash] = useState(false);

  const snapshotRef = useRef({ timeLeft, mode, isActive });
  const flowIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const theme = THEMES[mode];
  const isFocus = mode === "pomodoro";
  const isBreak = !isFocus;

  // Ring size responsive
  const [ringSize, setRingSize] = useState(340);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const max = Math.min(w * 0.62, h * 0.42, 380);
      setRingSize(Math.max(240, max));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalTime = MODES[mode].duration;
  const progress = Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100));
  const cycleCount = completedSessions % POMODORO_CYCLE;
  const flowMinutes = Math.floor(flowSeconds / 60);

  const completionLabel = useMemo(
    () => endAt ? new Date(endAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null,
    [endAt],
  );

  const todayKey = getDateKey();
  const todayStats = analytics.daily[todayKey] ?? createDailyStats();
  const goalProgress = Math.round(Math.min(100, (todayStats.focusMinutes / Math.max(1, focusGoalMinutes)) * 100));
  const momentumScore = Math.min(100, Math.round(goalProgress * 0.65 + Math.min(analytics.currentStreak * 8, 35)));

  const weeklySeries = useMemo(
    () => getRecentDateKeys(7).map(key => ({ key, focusMinutes: analytics.daily[key]?.focusMinutes ?? 0 })),
    [analytics.daily]
  );
  const weeklyPeak = Math.max(1, ...weeklySeries.map(d => d.focusMinutes));

  // Break-time suggestion
  const breakSuggestion = mode === "shortBreak"
    ? "Stand. Look at something 20 feet away. Breathe slowly."
    : "Walk outside. Let your mind wander freely for 15 minutes.";

  // Insight fetch
  const fetchInsight = useCallback(async () => {
    setIsInsightLoading(true);
    const h = new Date().getHours();
    const slot = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    const text = await getFocusInsight(mode, slot);
    setInsight(text);
    setIsInsightLoading(false);
  }, [mode]);

  useEffect(() => { fetchInsight(); }, [fetchInsight]);

  // Flow state tracking
  useEffect(() => {
    if (flowIntervalRef.current) clearInterval(flowIntervalRef.current);
    if (isActive && isFocus) {
      flowIntervalRef.current = setInterval(() => setFlowSeconds(s => s + 1), 1000);
    } else if (!isActive) {
      setFlowSeconds(0);
    }
    return () => { if (flowIntervalRef.current) clearInterval(flowIntervalRef.current); };
  }, [isActive, isFocus]);

  // Analytics tracking
  const trackAction = useCallback(
    (type: TimerActionType, actionMode: TimerMode, note?: string) => {
      setAnalytics(prev => {
        const key = getDateKey();
        const current = prev.daily[key] ?? createDailyStats();
        const updated = { ...current };
        if (type === "start") updated.starts += 1;
        if (type === "pause") updated.pauses += 1;
        if (type === "reset") updated.resets += 1;
        if (type === "mode_switch") updated.modeSwitches += 1;
        return {
          ...prev,
          daily: { ...prev.daily, [key]: updated },
          actions: [createAction(type, actionMode, note), ...prev.actions].slice(0, 120),
        };
      });
    },
    [setAnalytics],
  );

  const trackCompletion = useCallback(
    (completedMode: TimerMode) => {
      setAnalytics(prev => {
        const key = getDateKey();
        const current = prev.daily[key] ?? createDailyStats();
        const updated = { ...current, completions: current.completions + 1 };
        const mins = Math.round(MODES[completedMode].duration / 60);

        let totalSessions = prev.totalSessions;
        let totalFocusMinutes = prev.totalFocusMinutes;
        let totalBreakMinutes = prev.totalBreakMinutes;
        let currentStreak = prev.currentStreak;
        let longestStreak = prev.longestStreak;
        let lastFocusDate = prev.lastFocusDate;

        if (completedMode === "pomodoro") {
          updated.focusMinutes += mins;
          updated.focusSessions += 1;
          totalSessions += 1;
          totalFocusMinutes += mins;

          if (prev.lastFocusDate !== key) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yKey = getDateKey(yesterday);
            currentStreak = prev.lastFocusDate === yKey ? prev.currentStreak + 1 : 1;
            longestStreak = Math.max(longestStreak, currentStreak);
            lastFocusDate = key;
          }

          setCompletedSessions(n => n + 1);
        } else {
          updated.breakMinutes += mins;
          totalBreakMinutes += mins;
        }

        return {
          ...prev, totalSessions, totalFocusMinutes, totalBreakMinutes,
          currentStreak, longestStreak, lastFocusDate,
          daily: { ...prev.daily, [key]: updated },
          actions: [
            createAction("session_complete", completedMode, `${MODES[completedMode].label} finished`),
            ...prev.actions,
          ].slice(0, 120),
        };
      });
    },
    [setAnalytics, setCompletedSessions],
  );

  useEffect(() => {
    const prev = snapshotRef.current;
    if (prev.isActive && prev.timeLeft > 0 && timeLeft === 0) {
      trackCompletion(prev.mode);
      setShowCompletionFlash(true);
      setTimeout(() => setShowCompletionFlash(false), 1800);
    }
    snapshotRef.current = { timeLeft, mode, isActive };
  }, [isActive, mode, timeLeft, trackCompletion]);

  // Controls
  const switchMode = (newMode: TimerMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
    setIsActive(false);
    setEndAt(null);
    setFlowSeconds(0);
    trackAction("mode_switch", newMode, `Switched from ${MODES[mode].label}`);
  };

  const toggleTimer = async () => {
    const next = !isActive;
    if (next) {
      if (notificationsEnabled && "Notification" in window && Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") setNotificationsEnabled(false);
      }
      setEndAt(Date.now() + timeLeft * 1000);
    } else if (endAt !== null) {
      setTimeLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
      setEndAt(null);
    }
    setIsActive(next);
    trackAction(next ? "start" : "pause", mode);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].duration);
    setEndAt(null);
    setFlowSeconds(0);
    trackAction("reset", mode);
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled && "Notification" in window) {
      if (Notification.permission === "granted") { setNotificationsEnabled(true); return; }
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        setNotificationsEnabled(perm === "granted");
        return;
      }
    }
    setNotificationsEnabled(!notificationsEnabled);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const cardClass = cn(
    "rounded-2xl border backdrop-blur-xl transition-colors duration-700",
    theme.cardBg
  );
  const toolBtnClass = cn(
    "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300",
    theme.btnBg
  );

  return (
    <motion.div
      className={cn(
        "relative min-h-[100dvh] w-full overflow-hidden transition-colors duration-1000",
        `bg-gradient-to-br ${theme.bgGrad}`
      )}
      animate={{ backgroundColor: undefined }}
    >
      {/* ── Atmospheric background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {isFocus ? (
          // Dark cosmic orbs for focus
          <>
            <motion.div
              className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px]"
              style={{ background: "rgba(19,185,109,0.08)" }}
              animate={{ x: [0,40,-20,0], y: [0,20,10,0], scale: [1,1.08,1] }}
              transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-[-80px] right-[-100px] w-[420px] h-[420px] rounded-full blur-[100px]"
              style={{ background: "rgba(19,185,109,0.06)" }}
              animate={{ x: [0,-30,15,0], y: [0,15,-20,0] }}
              transition={{ duration: 29, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full blur-[90px]"
              style={{ background: "rgba(98,214,162,0.04)" }}
              animate={{ x: [0,20,-10,0], y: [0,-15,10,0], scale: [1,1.12,1] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Subtle grid */}
            <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:60px_60px]" />
          </>
        ) : (
          // Light airy orbs for breaks
          <>
            <BreathingOrb size="w-[400px] h-[400px]" color={`rgba(${isBreak ? "142,222,192" : "130,210,180"},0.35)`} position="-top-20 -left-20" delay={0} />
            <BreathingOrb size="w-[360px] h-[360px]" color="rgba(100,200,158,0.25)" position="-bottom-16 -right-16" delay={2.5} />
            <BreathingOrb size="w-[280px] h-[280px]" color="rgba(180,238,215,0.4)" position="top-1/3 left-1/4" delay={1.2} />
          </>
        )}
      </div>

      {/* Completion flash */}
      <AnimatePresence>
        {showCompletionFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.25, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, times: [0, 0.3, 1] }}
            className="absolute inset-0 z-50 pointer-events-none"
            style={{ background: `radial-gradient(circle at center, ${theme.accentGlow}, transparent 70%)` }}
          />
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className={cn(
        "relative z-10 flex min-h-[100dvh] flex-col",
        isZenMode ? "items-center justify-center" : "px-4 pt-5 pb-4 gap-3 md:px-8 md:pt-6 md:gap-4"
      )}>

        {/* ── Zen Mode — minimal overlay ── */}
        {isZenMode ? (
          <div className="flex flex-col items-center gap-8">
            {/* Ring */}
            <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
              <TimerRing progress={progress} mode={mode} isActive={isActive} isBreak={isBreak} size={ringSize} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span
                  className={cn("text-[10px] font-bold uppercase tracking-[0.45em]", theme.subtext)}
                >
                  {MODES[mode].short}
                </span>
                <span
                  className={cn(
                    "font-light leading-none tracking-[-0.04em] tabular-nums",
                    isFocus ? "text-[#E4F5EE]" : "text-[#1A3142]"
                  )}
                  style={{ fontSize: ringSize * 0.22 }}
                >
                  {formatTime(timeLeft)}
                </span>
                {completionLabel && (
                  <span className={cn("text-[10px] font-mono mt-1", theme.muted)}>
                    ends {completionLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Phase dots */}
            <PhaseDots completedInCycle={cycleCount} total={POMODORO_CYCLE} mode={mode} isActive={isActive} />

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button onClick={resetTimer} className={cn(toolBtnClass)} aria-label="Reset">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={toggleTimer}
                className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 active:scale-95",
                  isActive ? theme.pauseBg : theme.playBg
                )}
                aria-label={isActive ? "Pause" : "Start"}
              >
                {isActive
                  ? <Pause className="w-6 h-6 fill-white text-white" />
                  : <Play className="w-6 h-6 ml-0.5 fill-white text-white" />}
              </button>
              <button
                onClick={() => setIsZenMode(false)}
                className={cn(toolBtnClass)}
                aria-label="Exit zen mode"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Insight */}
            <p className={cn(
              "text-sm font-serif italic text-center max-w-xs leading-relaxed",
              isInsightLoading && "animate-pulse",
              theme.insightColor
            )}>
              "{insight}"
            </p>
          </div>
        ) : (
          <>
            {/* ── Full Layout ── */}

            {/* Top bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BrandLogo
                  className="h-11 w-11 shrink-0 rounded-[1.4rem] border p-2.5"
                  style={{ borderColor: isFocus ? "rgba(255,255,255,0.1)" : "#C8E6D8", background: isFocus ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)" }}
                  alt="IntentList"
                />
                <div>
                  <p className={cn("text-lg font-black tracking-[-0.03em]", theme.text)}>Focus Orbit</p>
                  <p className={cn("text-[9px] font-bold uppercase tracking-[0.35em]", theme.subtext)}>by IntentList</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Streak */}
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", theme.cardBg)}>
                  <Flame className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                  <span className={cn("text-xs font-bold", theme.cardText)}>{analytics.currentStreak}</span>
                  <span className={cn("text-[10px] uppercase tracking-widest hidden sm:inline", theme.cardSub)}>streak</span>
                </div>

                <button
                  onClick={onExit}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold uppercase tracking-[0.18em] transition-all",
                    theme.btnBg
                  )}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              </div>
            </div>

            {/* ── Center ring area ── */}
            <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 py-2">

              {/* Ring + time */}
              <div className="flex flex-col items-center gap-4">
                {/* Relative mode label */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={mode}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className={cn("text-[10px] font-bold uppercase tracking-[0.55em]", theme.subtext)}
                  >
                    {isActive
                      ? isFocus ? "— deep focus —" : "— rest & recover —"
                      : `${MODES[mode].label} mode`}
                  </motion.p>
                </AnimatePresence>

                {/* Ring + inner time */}
                <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
                  <TimerRing progress={progress} mode={mode} isActive={isActive} isBreak={isBreak} size={ringSize} />

                  {/* Inner content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={Math.floor(timeLeft / 10)}
                        initial={{ opacity: 0.7, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "font-light tabular-nums tracking-[-0.04em] leading-none select-none",
                          isFocus ? "text-[#E4F5EE]" : "text-[#1A3142]"
                        )}
                        style={{ fontFamily: "'Libre Baskerville', serif", fontSize: ringSize * 0.215 }}
                      >
                        {formatTime(timeLeft)}
                      </motion.span>
                    </AnimatePresence>

                    {completionLabel && isActive && (
                      <span className={cn("text-[10px] font-mono", theme.muted)}>
                        ends {completionLabel}
                      </span>
                    )}

                    {/* Breathing instruction during breaks */}
                    {isBreak && isActive && (
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className={cn("text-[11px] font-serif italic mt-1", theme.subtext)}
                      >
                        breathe
                      </motion.span>
                    )}
                  </div>

                  {/* Break breathing pulse ring */}
                  {isBreak && isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 pointer-events-none"
                      style={{ borderColor: `${theme.accent}30` }}
                      animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </div>

                {/* Phase dots + cycle label */}
                <div className="flex flex-col items-center gap-2">
                  <PhaseDots completedInCycle={cycleCount} total={POMODORO_CYCLE} mode={mode} isActive={isActive} />
                  <p className={cn("text-[10px] font-mono uppercase tracking-[0.3em]", theme.muted)}>
                    {cycleCount === 0 && completedSessions > 0
                      ? "cycle complete — long break earned"
                      : `session ${cycleCount + 1} of ${POMODORO_CYCLE}`}
                  </p>
                </div>

                {/* Flow state badge */}
                <AnimatePresence>
                  {isFocus && isActive && flowMinutes >= 12 && (
                    <FlowBadge minutes={flowMinutes} mode={mode} />
                  )}
                </AnimatePresence>
              </div>

              {/* ── Right panel: stats + insight ── */}
              <div className="flex flex-col gap-3 w-full max-w-xs">

                {/* Today stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className={cn(cardClass, "px-3 py-3 text-center")}>
                    <p className={cn("text-[9px] font-bold uppercase tracking-[0.25em]", theme.cardSub)}>Focus</p>
                    <p className={cn("text-xl font-black mt-1", theme.cardText)}>{todayStats.focusMinutes}<span className="text-xs font-normal ml-0.5">m</span></p>
                  </div>
                  <div className={cn(cardClass, "px-3 py-3 text-center")}>
                    <p className={cn("text-[9px] font-bold uppercase tracking-[0.25em]", theme.cardSub)}>Sessions</p>
                    <p className={cn("text-xl font-black mt-1", theme.cardText)}>{todayStats.focusSessions}</p>
                  </div>
                  <div className={cn(cardClass, "px-3 py-3 text-center")}>
                    <p className={cn("text-[9px] font-bold uppercase tracking-[0.25em]", theme.cardSub)}>Goal</p>
                    <p className={cn("text-xl font-black mt-1", theme.cardText)}>{goalProgress}<span className="text-xs font-normal">%</span></p>
                  </div>
                </div>

                {/* Goal progress bar */}
                <div className={cn(cardClass, "px-4 py-3")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-[9px] font-bold uppercase tracking-[0.25em]", theme.cardSub)}>Daily Goal</span>
                    <span className={cn("text-[10px] font-mono", theme.cardSub)}>{todayStats.focusMinutes}/{focusGoalMinutes}m</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: isFocus ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${theme.ringA}, ${theme.ringB})` }}
                      initial={false}
                      animate={{ width: `${Math.max(goalProgress, 2)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Insight */}
                <div className={cn(cardClass, "px-4 py-4")}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3 h-3" style={{ color: theme.accent }} />
                    <span className={cn("text-[9px] font-bold uppercase tracking-[0.3em]", theme.cardSub)}>
                      {isBreak ? "Break tip" : "Focus insight"}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm font-serif italic leading-relaxed",
                    isInsightLoading && "animate-pulse",
                    theme.insightColor
                  )}>
                    {isBreak ? breakSuggestion : `"${insight}"`}
                  </p>
                </div>

                {/* Weekly spark chart */}
                <div className={cn(cardClass, "px-4 py-3")}>
                  <p className={cn("text-[9px] font-bold uppercase tracking-[0.25em] mb-3", theme.cardSub)}>7-day focus</p>
                  <div className="flex items-end gap-1.5 h-10">
                    {weeklySeries.map(entry => (
                      <div key={entry.key} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm transition-all duration-500"
                          style={{
                            height: `${Math.max(3, (entry.focusMinutes / weeklyPeak) * 36)}px`,
                            background: entry.focusMinutes > 0
                              ? `linear-gradient(to top, ${theme.ringA}, ${theme.ringB})`
                              : isFocus ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                          }}
                        />
                        <span className={cn("text-[8px]", theme.muted)}>{shortDayLabel(entry.key)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bottom controls ── */}
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-auto">

              {/* Mode switcher */}
              <div className={cn("flex items-center gap-1.5 p-1.5 rounded-2xl border", theme.cardBg)}>
                {(Object.keys(MODES) as TimerMode[]).map(m => {
                  const Icon = MODES[m].icon;
                  return (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-300",
                        mode === m ? theme.modeBtnActive : theme.modeBtnInactive
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{MODES[m].label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right controls */}
              <div className={cn("flex items-center gap-2 p-1.5 rounded-2xl border sm:ml-auto", theme.cardBg)}>
                {/* Data center toggle */}
                <button
                  onClick={() => setIsDataCenterOpen(o => !o)}
                  className={cn(
                    "flex items-center gap-2 h-10 px-3 rounded-xl border text-xs font-semibold transition-all",
                    theme.btnBg
                  )}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden md:inline">Data Center</span>
                </button>

                <button onClick={() => setIsMuted(!isMuted)} className={toolBtnClass} aria-label="Toggle sound">
                  {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>

                <button onClick={resetTimer} className={toolBtnClass} aria-label="Reset timer">
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Play/Pause — hero button */}
                <motion.button
                  onClick={toggleTimer}
                  whileTap={{ scale: 0.93 }}
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300",
                    isActive ? theme.pauseBg : theme.playBg
                  )}
                  aria-label={isActive ? "Pause timer" : "Start timer"}
                >
                  {isActive
                    ? <Pause className="w-5 h-5 fill-white text-white" />
                    : <Play className="w-5 h-5 ml-0.5 fill-white text-white" />}
                </motion.button>

                <button
                  onClick={() => setIsZenMode(!isZenMode)}
                  className={toolBtnClass}
                  aria-label="Enter zen mode"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Data Center slide-up panel ── */}
      <AnimatePresence>
        {isDataCenterOpen && (
          <motion.section
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={cn(
              "absolute inset-x-3 bottom-3 z-30 max-h-[70vh] overflow-y-auto rounded-3xl border p-5 shadow-2xl backdrop-blur-2xl custom-scrollbar",
              theme.panelBg
            )}
          >
            {/* Header */}
            <div className={cn(
              "sticky top-0 -mx-5 -mt-5 mb-5 flex items-center justify-between px-5 py-4 border-b backdrop-blur-2xl",
              isFocus ? "border-white/10 bg-[#071912]/95" : "border-[#C8E6D8] bg-[#EDF8F2]/95"
            )}>
              <div>
                <p className={cn("text-[9px] uppercase tracking-[0.3em] font-bold", theme.subtext)}>Behavior Analytics</p>
                <h3 className={cn("text-xl font-black mt-0.5", theme.text)}>Data Center</h3>
              </div>
              <button
                onClick={() => setIsDataCenterOpen(false)}
                className={cn("flex h-8 w-8 items-center justify-center rounded-lg border transition-all", theme.btnBg)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lifetime stats */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Total Sessions", value: String(analytics.totalSessions) },
                { label: "Focus Time",     value: `${analytics.totalFocusMinutes}m` },
                { label: "Best Streak",    value: String(analytics.longestStreak) },
                { label: "Actions Today",  value: String(todayStats.starts + todayStats.pauses + todayStats.resets) },
              ].map(({ label, value }) => (
                <div key={label} className={cn(cardClass, "p-3 text-center")}>
                  <p className={cn("text-[9px] uppercase tracking-[0.22em]", theme.cardSub)}>{label}</p>
                  <p className={cn("text-2xl font-black mt-1", theme.cardText)}>{value}</p>
                </div>
              ))}
            </div>

            {/* Goal + chart */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className={cn(cardClass, "p-4")}>
                <div className={cn("flex items-center gap-2 text-sm font-bold mb-3", theme.cardText)}>
                  <Target className="w-4 h-4" style={{ color: theme.accent }} />
                  Daily Focus Goal
                </div>
                <input
                  type="range" min={25} max={240} step={5} value={focusGoalMinutes}
                  onChange={e => setFocusGoalMinutes(Number(e.target.value))}
                  className="w-full mt-1"
                  style={{ accentColor: theme.accent }}
                />
                <div className={cn("mt-2 flex items-center justify-between text-sm", theme.cardSub)}>
                  <span>{todayStats.focusMinutes}m done</span>
                  <span className="font-bold" style={{ color: theme.accent }}>{focusGoalMinutes}m target</span>
                </div>
              </div>

              <div className={cn(cardClass, "p-4")}>
                <div className={cn("flex items-center gap-2 text-sm font-bold mb-3", theme.cardText)}>
                  <Clock3 className="w-4 h-4" style={{ color: theme.accent }} />
                  Last 7 Days (min)
                </div>
                <div className="flex h-20 items-end gap-2">
                  {weeklySeries.map(entry => (
                    <div key={entry.key} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-md transition-all duration-500"
                        style={{
                          height: `${Math.max(4, (entry.focusMinutes / weeklyPeak) * 64)}px`,
                          background: entry.focusMinutes > 0
                            ? `linear-gradient(to top, ${theme.ringA}, ${theme.ringB})`
                            : isFocus ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                        }}
                      />
                      <span className={cn("text-[9px]", theme.muted)}>{shortDayLabel(entry.key)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                onClick={toggleNotifications}
                className={cn(cardClass, "p-4 text-left transition-all hover:opacity-90")}
              >
                <div className={cn("flex items-center gap-2 text-sm font-bold", theme.cardText)}>
                  {notificationsEnabled
                    ? <Bell className="w-4 h-4" style={{ color: theme.accent }} />
                    : <BellOff className="w-4 h-4" />}
                  Browser Alerts
                </div>
                <p className={cn("mt-2 text-xs leading-relaxed", theme.cardSub)}>
                  {notificationsEnabled ? "Enabled. You'll be notified when sessions end." : "Disabled. Tap to enable notifications."}
                </p>
              </button>

              <button
                onClick={() => setKeepAwake(!keepAwake)}
                className={cn(cardClass, "p-4 text-left transition-all hover:opacity-90")}
              >
                <div className={cn("flex items-center gap-2 text-sm font-bold", theme.cardText)}>
                  {keepAwake
                    ? <Maximize2 className="w-4 h-4" style={{ color: theme.accent }} />
                    : <Minimize2 className="w-4 h-4" />}
                  Keep Awake
                </div>
                <p className={cn("mt-2 text-xs leading-relaxed", theme.cardSub)}>
                  {keepAwake ? "Screen stays on while timer runs." : "Device can sleep normally."}
                </p>
              </button>

              <div className={cn(cardClass, "p-4")}>
                <div className={cn("flex items-center gap-2 text-sm font-bold", theme.cardText)}>
                  <Sparkles className="w-4 h-4" style={{ color: theme.accent }} />
                  Session Guard
                </div>
                <p className={cn("mt-2 text-xs leading-relaxed", theme.cardSub)}>
                  Timer resumes from saved end-time after tab switches, refreshes, or locks.
                </p>
              </div>
            </div>

            {/* Today breakdown */}
            <div className={cn(cardClass, "mt-4 p-4")}>
              <p className={cn("text-sm font-bold mb-3", theme.cardText)}>Today Breakdown</p>
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                {[
                  ["Starts", todayStats.starts],
                  ["Pauses", todayStats.pauses],
                  ["Resets", todayStats.resets],
                  ["Mode Shifts", todayStats.modeSwitches],
                ].map(([label, val]) => (
                  <div key={String(label)} className={cn("rounded-xl border p-2.5", theme.cardBg)}>
                    <span className={cn(theme.cardSub)}>{label}: </span>
                    <span className={cn("font-bold", theme.cardText)}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent actions */}
            <div className={cn(cardClass, "mt-4 p-4")}>
              <p className={cn("text-sm font-bold mb-3", theme.cardText)}>Recent Actions</p>
              {analytics.actions.length === 0 ? (
                <p className={cn("text-xs", theme.cardSub)}>No actions yet. Start the timer to begin tracking.</p>
              ) : (
                <div className="space-y-2">
                  {analytics.actions.slice(0, 8).map(action => (
                    <div
                      key={action.id}
                      className={cn("flex items-center justify-between rounded-xl border px-3 py-2 text-xs", theme.cardBg)}
                    >
                      <div>
                        <span className={cn("font-bold", theme.cardText)}>
                          {{start:"Started",pause:"Paused",reset:"Reset",mode_switch:"Mode Switch",session_complete:"Completed"}[action.type]}
                        </span>
                        <span className={cn("ml-1.5", theme.cardSub)}>({MODES[action.mode].label})</span>
                        {action.note && <p className={cn("mt-0.5 text-[10px]", theme.muted)}>{action.note}</p>}
                      </div>
                      <span className={cn("font-mono text-[10px]", theme.muted)}>
                        {new Date(action.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
