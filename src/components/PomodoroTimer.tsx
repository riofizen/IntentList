import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BellOff,
  Brain,
  ChevronDown,
  ChevronUp,
  Clock3,
  Coffee,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { cn } from "../App";
import { useLocalStorage } from "../lib/useLocalStorage";
import { getFocusInsight } from "../services/focusInsight";
import { MindfulBreathing } from "./MindfulBreathing";
import { BrandLogo } from "./BrandLogo";

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

const createDailyStats = (): DailyTimerStats => ({
  focusMinutes: 0,
  breakMinutes: 0,
  focusSessions: 0,
  completions: 0,
  starts: 0,
  pauses: 0,
  resets: 0,
  modeSwitches: 0,
});

const createInitialAnalytics = (): TimerAnalytics => ({
  totalSessions: 0,
  totalFocusMinutes: 0,
  totalBreakMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastFocusDate: null,
  daily: {},
  actions: [],
});

const getDateKey = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRecentDateKeys = (days: number) => {
  const keys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    keys.push(getDateKey(date));
  }
  return keys;
};

const formatActionTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const shortDayLabel = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString([], { weekday: "short" });

const ACTION_LABELS: Record<TimerActionType, string> = {
  start: "Started",
  pause: "Paused",
  reset: "Reset",
  mode_switch: "Mode switched",
  session_complete: "Session completed",
};

const MODES: Record<
  TimerMode,
  { label: string; duration: number; icon: React.ComponentType<{ className?: string }>; accentBar: string }
> = {
  pomodoro: {
    label: "Focus",
    duration: 25 * 60,
    icon: Brain,
    accentBar: "from-[#13B96D] via-[#22C67A] to-[#62D6A2]",
  },
  shortBreak: {
    label: "Short Break",
    duration: 5 * 60,
    icon: Coffee,
    accentBar: "from-[#4DBF90] via-[#72D2AC] to-[#97E3C4]",
  },
  longBreak: {
    label: "Long Break",
    duration: 15 * 60,
    icon: Coffee,
    accentBar: "from-[#3DB181] via-[#5FC99E] to-[#8ADEBB]",
  },
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const createAction = (type: TimerActionType, mode: TimerMode, note?: string): TimerAction => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  mode,
  note,
  at: new Date().toISOString(),
});

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  onExit,
  mode,
  setMode,
  timeLeft,
  setTimeLeft,
  endAt,
  setEndAt,
  isActive,
  setIsActive,
  isMuted,
  setIsMuted,
  notificationsEnabled,
  setNotificationsEnabled,
  keepAwake,
  setKeepAwake,
  isZenMode,
  setIsZenMode,
}) => {
  const [insight, setInsight] = useState("A calm start makes everything easier.");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isDataCenterOpen, setIsDataCenterOpen] = useState(false);
  const [focusGoalMinutes, setFocusGoalMinutes] = useLocalStorage<number>("pomodoro_focus_goal", 90);
  const [analytics, setAnalytics] = useLocalStorage<TimerAnalytics>(
    "pomodoro_data_center",
    createInitialAnalytics(),
  );
  const snapshotRef = useRef({ timeLeft, mode, isActive });
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  useEffect(() => {
    const updateLayoutDensity = () => {
      setIsCompactLayout(window.innerHeight < 940);
    };

    updateLayoutDensity();
    window.addEventListener("resize", updateLayoutDensity);
    return () => window.removeEventListener("resize", updateLayoutDensity);
  }, []);

  const totalTime = MODES[mode].duration;
  const timerProgress = Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100));
  const completionLabel = useMemo(
    () => (endAt ? new Date(endAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null),
    [endAt],
  );
  const dayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: "long" }),
    [],
  );

  const todayKey = getDateKey();
  const todayStats = analytics.daily[todayKey] ?? createDailyStats();
  const goalProgress = Math.round(Math.min(100, (todayStats.focusMinutes / Math.max(1, focusGoalMinutes)) * 100));
  const momentumScore = Math.min(
    100,
    Math.round(goalProgress * 0.65 + Math.min(analytics.currentStreak * 8, 35)),
  );

  const weeklySeries = useMemo(() => {
    return getRecentDateKeys(7).map((key) => ({
      key,
      focusMinutes: analytics.daily[key]?.focusMinutes ?? 0,
    }));
  }, [analytics.daily]);

  const weeklyPeak = Math.max(1, ...weeklySeries.map((item) => item.focusMinutes));

  const nudgeText = useMemo(() => {
    if (todayStats.focusSessions === 0) {
      return "Start tiny: even one short sprint creates momentum.";
    }
    if (goalProgress < 40) {
      return "Good start. Lock in another cycle before distractions return.";
    }
    if (goalProgress < 90) {
      return "You are in the consistency zone. Keep the streak alive.";
    }
    return "Excellent pacing today. Protect this rhythm and close strong.";
  }, [goalProgress, todayStats.focusSessions]);

  const trackAction = useCallback(
    (type: TimerActionType, actionMode: TimerMode, note?: string) => {
      setAnalytics((prev) => {
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
      setAnalytics((prev) => {
        const key = getDateKey();
        const current = prev.daily[key] ?? createDailyStats();
        const updated = { ...current, completions: current.completions + 1 };
        const completedMinutes = Math.round(MODES[completedMode].duration / 60);

        let totalSessions = prev.totalSessions;
        let totalFocusMinutes = prev.totalFocusMinutes;
        let totalBreakMinutes = prev.totalBreakMinutes;
        let currentStreak = prev.currentStreak;
        let longestStreak = prev.longestStreak;
        let lastFocusDate = prev.lastFocusDate;

        if (completedMode === "pomodoro") {
          updated.focusMinutes += completedMinutes;
          updated.focusSessions += 1;
          totalSessions += 1;
          totalFocusMinutes += completedMinutes;

          if (prev.lastFocusDate !== key) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = getDateKey(yesterday);
            currentStreak = prev.lastFocusDate === yesterdayKey ? prev.currentStreak + 1 : 1;
            longestStreak = Math.max(longestStreak, currentStreak);
            lastFocusDate = key;
          }
        } else {
          updated.breakMinutes += completedMinutes;
          totalBreakMinutes += completedMinutes;
        }

        return {
          ...prev,
          totalSessions,
          totalFocusMinutes,
          totalBreakMinutes,
          currentStreak,
          longestStreak,
          lastFocusDate,
          daily: { ...prev.daily, [key]: updated },
          actions: [
            createAction("session_complete", completedMode, `${MODES[completedMode].label} finished`),
            ...prev.actions,
          ].slice(0, 120),
        };
      });
    },
    [setAnalytics],
  );

  const fetchInsight = useCallback(async () => {
    setIsInsightLoading(true);
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    const newInsight = await getFocusInsight(mode, timeOfDay);
    setInsight(newInsight);
    setIsInsightLoading(false);
  }, [mode]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  useEffect(() => {
    const previous = snapshotRef.current;
    if (previous.isActive && previous.timeLeft > 0 && timeLeft === 0) {
      trackCompletion(previous.mode);
    }
    snapshotRef.current = { timeLeft, mode, isActive };
  }, [isActive, mode, timeLeft, trackCompletion]);

  const switchMode = (newMode: TimerMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
    setIsActive(false);
    setEndAt(null);
    trackAction("mode_switch", newMode, `Switched from ${MODES[mode].label}`);
  };

  const toggleTimer = async () => {
    const next = !isActive;

    if (next) {
      if (notificationsEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setNotificationsEnabled(false);
        }
      }
      setEndAt(Date.now() + timeLeft * 1000);
    } else if (endAt !== null) {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      setEndAt(null);
    }

    setIsActive(next);
    trackAction(next ? "start" : "pause", mode);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].duration);
    setEndAt(null);
    trackAction("reset", mode);
  };

  const toggleNotifications = async () => {
    const next = !notificationsEnabled;

    if (!next) {
      setNotificationsEnabled(false);
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationsEnabled(false);
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      return;
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
      return;
    }

    setNotificationsEnabled(false);
  };

  const segmentCount = 4;
  const activeSegments = Math.max(1, Math.ceil(timerProgress / (100 / segmentCount)));
  const panelClass = "rounded-2xl border border-[#CBE5D8] bg-white/72 backdrop-blur-xl";
  const surfaceClass = "rounded-2xl border border-[#CFE6DB] bg-[#F3FBF7]/85 backdrop-blur-xl";
  const toolButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-[#C4E1D2] bg-white/80 text-[#4F6D67] transition hover:border-[#13B96D]/60 hover:text-[#174039] hover:bg-[#F1FAF6]";

  return (
    <div
      className={cn(
        "pomodoro-gradient relative h-[100dvh] w-full overflow-hidden text-[#1D3441] md:rounded-[2rem]",
        isZenMode && "saturate-125",
      )}
    >
      <div className="pomodoro-vignette absolute inset-0" />
      <motion.div
        className="pomodoro-blob absolute -left-44 -top-28 h-[390px] w-[390px] rounded-full bg-[#6BD4A6]/24 blur-[95px]"
        animate={{ x: [0, 45, -15, 0], y: [0, 22, 5, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pomodoro-blob absolute right-[-140px] top-[14%] h-[420px] w-[420px] rounded-full bg-[#3BBE86]/18 blur-[95px]"
        animate={{ x: [0, -28, 14, 0], y: [0, 10, -20, 0], scale: [1.03, 0.98, 1.03] }}
        transition={{ duration: 29, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pomodoro-blob absolute bottom-[-190px] left-1/2 h-[520px] w-[640px] -translate-x-1/2 rounded-full bg-[#AEE8CD]/36 blur-[120px]"
        animate={{ y: [0, -22, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className={cn(
          "relative z-10 flex h-full flex-col px-4 pb-4 pt-5 md:px-8 md:pt-6",
          isCompactLayout ? "gap-3" : "gap-4 md:gap-5",
        )}
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[auto_1fr_auto] md:items-start">
          <div className="flex items-center gap-3">
            <BrandLogo
              className={cn(
                "shrink-0 rounded-[1.6rem] border border-[#CBE5D8] bg-white/84 shadow-lg shadow-[#2A5B4A]/10",
                isCompactLayout ? "h-12 w-12 p-2.5" : "h-14 w-14 p-3",
              )}
              alt="Focus Orbit logo"
            />
            <div>
              <h2
                className={cn(
                  "font-black tracking-[-0.03em] text-[#17323F]",
                  isCompactLayout ? "text-3xl md:text-5xl" : "text-4xl md:text-6xl",
                )}
              >
                Focus Orbit
              </h2>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-[#6C8F87]">
                by IntentList
              </p>
            </div>
          </div>

          <div className={cn(panelClass, isCompactLayout ? "px-4 py-2.5 md:mx-4" : "px-4 py-3 md:mx-5")}>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#12935A]">
              <Sparkles className="h-3.5 w-3.5 text-[#13B96D]" />
              Adaptive Nudge
            </div>
            <p className={cn("mt-1.5 font-medium leading-relaxed text-[#295249]", isCompactLayout ? "text-sm" : "text-sm md:text-base")}>
              {nudgeText}
            </p>
          </div>

          <div className="flex flex-col gap-2 md:min-w-[210px]">
            <button
              onClick={onExit}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#C7E3D5] bg-white/82 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#42635C] transition hover:border-[#13B96D]/60 hover:bg-[#F1FAF6]"
            >
              <ArrowLeft className="h-4 w-4 text-[#13B96D]" />
              Back to Workspace
            </button>
            <div className={cn(panelClass, "px-4 py-3")}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.26em] text-[#6C8F87]">Momentum</span>
                <span className="text-lg font-bold text-[#1D3441]">{momentumScore}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#D9EDE2]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#13B96D] via-[#26C77D] to-[#71D8AA]"
                  initial={false}
                  animate={{ width: `${Math.max(6, momentumScore)}%` }}
                  transition={{ duration: 0.45 }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center pb-24 text-center md:pb-20",
            isCompactLayout ? "gap-2" : "gap-3",
          )}
        >
          <div
            className={cn(
              "relative w-full max-w-[760px] rounded-[3rem] border border-[#C7E3D5]/90 bg-white/72 shadow-[0_20px_70px_rgba(43,94,75,0.16)] backdrop-blur-xl",
              isCompactLayout ? "px-5 py-6 md:px-8 md:py-7" : "px-6 py-9 md:px-10 md:py-12",
            )}
          >
            <div className="pointer-events-none absolute inset-4 rounded-[2.6rem] border border-[#D7EBE1]/90" />
            <div className="pointer-events-none absolute inset-8 rounded-[2.2rem] border border-[#E4F2EB]/90" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.55em] text-[#139C5E]">
              {isActive ? "Focusing" : `${MODES[mode].label} mode`}
            </p>

            <motion.h1
              key={timeLeft}
              initial={{ opacity: 0.84, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={cn(
                "mt-1 font-light leading-[0.9] tracking-[-0.05em] text-[#17323F]",
                isCompactLayout ? "text-[clamp(3.8rem,12vw,7.4rem)]" : "text-[clamp(5rem,16vw,10.5rem)]",
              )}
            >
              {formatTime(timeLeft)}
            </motion.h1>

            <div className={cn("w-full max-w-md mx-auto", isCompactLayout ? "mt-3" : "mt-4")}>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#DDEEE6]">
                <motion.div
                  className={cn("h-full rounded-full bg-gradient-to-r", MODES[mode].accentBar)}
                  initial={false}
                  animate={{ width: `${Math.max(timerProgress, 2)}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className={cn("flex items-center justify-center gap-2", isCompactLayout ? "mt-3" : "mt-4")}>
              {Array.from({ length: segmentCount }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 w-7 rounded-full transition-colors",
                    index < activeSegments ? "bg-[#13B96D]" : "bg-[#BCD7CB]",
                  )}
                />
              ))}
            </div>

            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5F7D78] md:text-xs", isCompactLayout ? "mt-3" : "mt-4")}>
              {isActive ? `${MODES[mode].label} in progress` : `Ready for ${MODES[mode].label.toLowerCase()}?`}
            </p>
          </div>

          <p className={cn("text-sm font-medium text-[#5F7D78] md:text-base", isCompactLayout ? "mt-1" : "mt-2")}>
            {dayLabel} focus cycle
          </p>

          <div className={cn("grid w-full max-w-3xl grid-cols-3 gap-2 md:gap-3", isCompactLayout ? "mt-1" : "mt-2")}>
            <div className={cn(surfaceClass, "px-3 py-3")}>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#6B8D86]">Today Focus</p>
              <p className={cn("mt-1 font-bold text-[#1D3441]", isCompactLayout ? "text-xl md:text-2xl" : "text-2xl md:text-3xl")}>
                {todayStats.focusMinutes}m
              </p>
            </div>
            <div className={cn(surfaceClass, "px-3 py-3")}>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#6B8D86]">Streak</p>
              <p className={cn("mt-1 flex items-center justify-center gap-1 font-bold text-[#1D3441]", isCompactLayout ? "text-xl md:text-2xl" : "text-2xl md:text-3xl")}>
                <Flame className="h-5 w-5 text-[#13B96D]" />
                {analytics.currentStreak}
              </p>
            </div>
            <div className={cn(surfaceClass, "px-3 py-3")}>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#6B8D86]">Goal Hit</p>
              <p className={cn("mt-1 font-bold text-[#1D3441]", isCompactLayout ? "text-xl md:text-2xl" : "text-2xl md:text-3xl")}>
                {goalProgress}%
              </p>
            </div>
          </div>

          <p
            className={cn(
              "max-w-2xl font-medium text-[#5B7A75]",
              isCompactLayout ? "mt-1 text-sm md:text-sm" : "mt-2 text-sm md:text-base",
              isInsightLoading && "animate-pulse opacity-60",
            )}
          >
            "{insight}"
          </p>

          <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#6B8D86]">
            {isActive && completionLabel
              ? `Ends around ${completionLabel} · background-safe session tracking`
              : "Session state stays recoverable across tab switches and refreshes"}
          </p>

          {mode !== "pomodoro" && isActive && (
            <div className={cn("rounded-3xl border border-[#CFE6DB] bg-white/70 p-6 backdrop-blur-md", isCompactLayout ? "mt-3" : "mt-5")}>
              <MindfulBreathing isZenMode />
            </div>
          )}
        </div>

        <div
          className={cn(
            "absolute inset-x-4 bottom-3 z-10 flex flex-col gap-2 md:inset-x-8 md:flex-row md:items-end md:justify-between",
            isCompactLayout ? "bottom-2" : "bottom-3",
          )}
        >
          <div className="flex items-center gap-2 rounded-2xl border border-[#C7E3D5] bg-white/78 p-2 shadow-xl shadow-[#2A5B4A]/15 backdrop-blur-xl">
            {(Object.keys(MODES) as TimerMode[]).map((timerMode) => {
              const Icon = MODES[timerMode].icon;
              return (
                <button
                  key={timerMode}
                  onClick={() => switchMode(timerMode)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition border",
                    mode === timerMode
                      ? "border-[#13B96D] bg-[#E8F7EF] text-[#0F784A]"
                      : "border-transparent text-[#5E7B76] hover:border-[#C2E1D2] hover:bg-[#F1FAF6] hover:text-[#173D35]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{MODES[timerMode].label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#C7E3D5] bg-white/78 p-2 shadow-xl shadow-[#2A5B4A]/15 backdrop-blur-xl">
            <button
              onClick={() => setIsDataCenterOpen((open) => !open)}
              className="flex h-10 items-center gap-2 rounded-xl border border-[#C4E1D2] bg-white/80 px-3 text-xs font-semibold text-[#4F6D67] transition hover:border-[#13B96D]/60 hover:bg-[#F1FAF6]"
            >
              <BarChart3 className="h-4 w-4 text-[#13B96D]" />
              Data Center
              {isDataCenterOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={toolButtonClass}
              aria-label={isMuted ? "Unmute timer sound" : "Mute timer sound"}
            >
              {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </button>

            <button
              onClick={resetTimer}
              className={toolButtonClass}
              aria-label="Reset timer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={toggleTimer}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl text-[#173D35] shadow-lg transition active:scale-95 md:h-12 md:w-12",
                isActive
                  ? "bg-[#13B96D] text-white shadow-[0_0_25px_rgba(19,185,109,0.35)]"
                  : "bg-gradient-to-br from-[#DDF2E7] to-[#CDEAD9] border border-[#BBDCCB]",
              )}
              aria-label={isActive ? "Pause timer" : "Start timer"}
            >
              {isActive ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>

            <button
              onClick={() => setIsZenMode(!isZenMode)}
              className={toolButtonClass}
              aria-label={isZenMode ? "Exit immersive mode" : "Enter immersive mode"}
            >
              {isZenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDataCenterOpen && (
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 35 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-x-4 bottom-4 z-20 max-h-[62vh] overflow-y-auto rounded-3xl border border-[#C5E2D3]/95 bg-[#F1FAF6]/96 p-5 shadow-2xl shadow-[#2A5B4A]/20 backdrop-blur-2xl"
          >
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between border-b border-[#D3E8DD] bg-[#F1FAF6]/98 px-5 py-4 backdrop-blur-2xl">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#6B8D86]">Behavior Analytics</p>
                <h3 className="mt-1 text-xl font-bold text-[#1D3441]">Data Center</h3>
              </div>
              <button
                onClick={() => setIsDataCenterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#C4E1D2] bg-white text-[#5E7B76] transition hover:border-[#13B96D]/60 hover:text-[#173D35] hover:bg-[#F1FAF6]"
                aria-label="Close Data Center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className={cn(surfaceClass, "p-3")}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B8D86]">Total Sessions</p>
                <p className="mt-1 text-2xl font-bold text-[#1D3441]">{analytics.totalSessions}</p>
              </div>
              <div className={cn(surfaceClass, "p-3")}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B8D86]">Focus Time</p>
                <p className="mt-1 text-2xl font-bold text-[#1D3441]">{analytics.totalFocusMinutes}m</p>
              </div>
              <div className={cn(surfaceClass, "p-3")}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B8D86]">Longest Streak</p>
                <p className="mt-1 text-2xl font-bold text-[#1D3441]">{analytics.longestStreak}</p>
              </div>
              <div className={cn(surfaceClass, "p-3")}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B8D86]">Today Actions</p>
                <p className="mt-1 text-2xl font-bold text-[#1D3441]">
                  {todayStats.starts + todayStats.pauses + todayStats.resets + todayStats.modeSwitches}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className={cn(surfaceClass, "p-4")}>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1D3441]">
                  <Target className="h-4 w-4 text-[#13B96D]" />
                  Daily Focus Goal
                </div>
                <p className="mt-2 text-xs text-[#5F7D78]">
                  Adjust your target. Smaller goals improve consistency and reduce friction.
                </p>
                <input
                  type="range"
                  min={25}
                  max={240}
                  step={5}
                  value={focusGoalMinutes}
                  onChange={(event) => setFocusGoalMinutes(Number(event.target.value))}
                  className="mt-4 w-full accent-[#13B96D]"
                />
                <div className="mt-2 flex items-center justify-between text-sm text-[#4F6D67]">
                  <span>{todayStats.focusMinutes}m done</span>
                  <span className="font-semibold text-[#0F784A]">{focusGoalMinutes}m target</span>
                </div>
              </div>

              <div className={cn(surfaceClass, "p-4")}>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1D3441]">
                  <Clock3 className="h-4 w-4 text-[#13B96D]" />
                  Last 7 Days Focus (min)
                </div>
                <div className="mt-4 flex h-28 items-end gap-2">
                  {weeklySeries.map((entry) => (
                    <div key={entry.key} className="flex flex-1 flex-col items-center gap-1">
                      <div className="relative flex h-20 w-full items-end overflow-hidden rounded-md bg-[#DDEEE6]">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(4, (entry.focusMinutes / weeklyPeak) * 100)}%` }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "w-full rounded-md bg-gradient-to-t",
                            entry.focusMinutes > 0 ? "from-[#13B96D] to-[#67D5A5]" : "from-[#BFDCCE] to-[#BFDCCE]",
                          )}
                        />
                      </div>
                      <span className="text-[10px] text-[#6B8D86]">{shortDayLabel(entry.key)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                onClick={toggleNotifications}
                className={cn(surfaceClass, "p-4 text-left transition hover:border-[#13B96D]/60 hover:bg-white/90")}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1D3441]">
                  {notificationsEnabled ? <Bell className="h-4 w-4 text-[#13B96D]" /> : <BellOff className="h-4 w-4 text-[#6B8D86]" />}
                  Browser Alerts
                </div>
                <p className="mt-2 text-xs text-[#5F7D78]">
                  {notificationsEnabled ? 'Enabled for timer completion.' : 'Enable notifications when the session ends.'}
                </p>
              </button>

              <button
                onClick={() => setKeepAwake(!keepAwake)}
                className={cn(surfaceClass, "p-4 text-left transition hover:border-[#13B96D]/60 hover:bg-white/90")}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1D3441]">
                  {keepAwake ? <Maximize2 className="h-4 w-4 text-[#13B96D]" /> : <Minimize2 className="h-4 w-4 text-[#6B8D86]" />}
                  Keep Screen Awake
                </div>
                <p className="mt-2 text-xs text-[#5F7D78]">
                  {keepAwake ? 'Prevents sleep when the browser supports wake lock.' : 'Allow the device to sleep normally.'}
                </p>
              </button>

              <div className={cn(surfaceClass, "p-4")}>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1D3441]">
                  <Target className="h-4 w-4 text-[#13B96D]" />
                  Session Safeguard
                </div>
                <p className="mt-2 text-xs text-[#5F7D78]">
                  Countdown resumes from a saved end time even after app switches, refreshes, or screen locks.
                </p>
              </div>
            </div>

            <div className={cn(surfaceClass, "mt-4 p-4")}>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1D3441]">
                <BarChart3 className="h-4 w-4 text-[#13B96D]" />
                Today Breakdown
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <div className="rounded-xl border border-[#CFE4D8] bg-white/90 p-2 text-[#4F6D67]">
                  Starts: <span className="font-semibold">{todayStats.starts}</span>
                </div>
                <div className="rounded-xl border border-[#CFE4D8] bg-white/90 p-2 text-[#4F6D67]">
                  Pauses: <span className="font-semibold">{todayStats.pauses}</span>
                </div>
                <div className="rounded-xl border border-[#CFE4D8] bg-white/90 p-2 text-[#4F6D67]">
                  Resets: <span className="font-semibold">{todayStats.resets}</span>
                </div>
                <div className="rounded-xl border border-[#CFE4D8] bg-white/90 p-2 text-[#4F6D67]">
                  Mode Changes: <span className="font-semibold">{todayStats.modeSwitches}</span>
                </div>
              </div>
            </div>

            <div className={cn(surfaceClass, "mt-4 p-4")}>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1D3441]">
                <Sparkles className="h-4 w-4 text-[#13B96D]" />
                Recent Actions
              </div>
              <div className="mt-3 space-y-2">
                {analytics.actions.length === 0 && (
                  <p className="text-sm text-[#5F7D78]">No actions yet. Start the timer to begin tracking.</p>
                )}
                {analytics.actions.slice(0, 10).map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between rounded-xl border border-[#CFE4D8] bg-white/90 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#1D3441]">{ACTION_LABELS[action.type]}</span>
                      <span className="ml-2 text-[#5F7D78]">({MODES[action.mode].label})</span>
                      {action.note && <p className="mt-0.5 text-[#6B8D86]">{action.note}</p>}
                    </div>
                    <span className="text-[#5F7D78]">{formatActionTime(action.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};
