import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, BarChart3, Bell, BellOff, Brain, Coffee,
  Flame, Minimize2, Maximize2, Pause, Play, RotateCcw,
  Sparkles, Target, X, Wind, Zap, Clock3, ListTodo,
  ChevronDown, Volume2, VolumeX, Check, SlidersHorizontal,
} from "lucide-react";
import { cn } from "../App";
import { useLocalStorage } from "../lib/useLocalStorage";
import { getFocusInsight } from "../services/focusInsight";
import { BrandLogo } from "./BrandLogo";
import { Task } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode = "pomodoro" | "shortBreak" | "longBreak";
type TimerActionType = "start" | "pause" | "reset" | "mode_switch" | "session_complete";

export interface PomodoroTimerProps {
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
  /** Today's incomplete tasks — for task linking feature */
  tasks?: Task[];
}

interface DailyTimerStats {
  focusMinutes: number; breakMinutes: number; focusSessions: number;
  completions: number; starts: number; pauses: number; resets: number; modeSwitches: number;
}
interface TimerAction { id: string; type: TimerActionType; mode: TimerMode; at: string; note?: string; }
interface TimerAnalytics {
  totalSessions: number; totalFocusMinutes: number; totalBreakMinutes: number;
  currentStreak: number; longestStreak: number; lastFocusDate: string | null;
  daily: Record<string, DailyTimerStats>; actions: TimerAction[];
}

// ─── Themes ───────────────────────────────────────────────────────────────────

const T = {
  pomodoro: {
    bgA:"#060E0B", bgB:"#0C1E15",
    accent:"#13B96D", glow:"rgba(19,185,109,0.5)",
    rA:"#13B96D", rB:"#5FD4A0", rTr:"rgba(19,185,109,0.1)",
    p:"#E2F4EC", s:"#4E9972", m:"#214E38",
    cBg:"rgba(255,255,255,0.05)", cBd:"rgba(255,255,255,0.1)",
    bBg:"rgba(255,255,255,0.08)", bBd:"rgba(255,255,255,0.13)", bTxt:"#8FCFB2",
    play:"#13B96D", playGlow:"0 0 32px rgba(19,185,109,0.6)",
    mABg:"rgba(19,185,109,0.18)", mABd:"rgba(19,185,109,0.55)", mATxt:"#13B96D",
    mIBd:"rgba(255,255,255,0.1)", mITxt:"#4E9972",
    pBg:"rgba(4,10,8,0.97)", pBd:"rgba(255,255,255,0.1)",
    dark:true,
  },
  shortBreak: {
    bgA:"#DEF0E8", bgB:"#EBF7F1",
    accent:"#0D9955", glow:"rgba(13,153,85,0.4)",
    rA:"#0D9955", rB:"#4DCFA0", rTr:"rgba(13,153,85,0.12)",
    p:"#1A3240", s:"#366B5C", m:"#7EB0A5",
    cBg:"rgba(255,255,255,0.72)", cBd:"#BDE3D2",
    bBg:"rgba(255,255,255,0.72)", bBd:"#BDE3D2", bTxt:"#366B5C",
    play:"#0D9955", playGlow:"0 0 24px rgba(13,153,85,0.45)",
    mABg:"rgba(13,153,85,0.12)", mABd:"rgba(13,153,85,0.5)", mATxt:"#0A7A43",
    mIBd:"#BDE3D2", mITxt:"#366B5C",
    pBg:"rgba(235,247,241,0.98)", pBd:"#BDE3D2",
    dark:false,
  },
  longBreak: {
    bgA:"#D8EDE5", bgB:"#E8F5EF",
    accent:"#0A8A4E", glow:"rgba(10,138,78,0.4)",
    rA:"#0A8A4E", rB:"#6FD5A8", rTr:"rgba(10,138,78,0.1)",
    p:"#1A3240", s:"#2F6356", m:"#78A89E",
    cBg:"rgba(255,255,255,0.72)", cBd:"#B2DCCC",
    bBg:"rgba(255,255,255,0.72)", bBd:"#B2DCCC", bTxt:"#2F6356",
    play:"#0A8A4E", playGlow:"0 0 24px rgba(10,138,78,0.45)",
    mABg:"rgba(10,138,78,0.12)", mABd:"rgba(10,138,78,0.5)", mATxt:"#096040",
    mIBd:"#B2DCCC", mITxt:"#2F6356",
    pBg:"rgba(232,245,239,0.98)", pBd:"#B2DCCC",
    dark:false,
  },
} as const;

// ─── Ambient Sounds ───────────────────────────────────────────────────────────

interface SoundOption { id: string; label: string; emoji: string; url: string; }

const SOUNDS: SoundOption[] = [
  { id: "none",   label: "Silence",    emoji: "🔇", url: "" },
  { id: "rain",   label: "Rain",       emoji: "🌧️", url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3" },
  { id: "cafe",   label: "Café",       emoji: "☕", url: "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3" },
  { id: "forest", label: "Forest",     emoji: "🌿", url: "https://assets.mixkit.co/active_storage/sfx/2516/2516-preview.mp3" },
  { id: "waves",  label: "Waves",      emoji: "🌊", url: "https://assets.mixkit.co/active_storage/sfx/2517/2517-preview.mp3" },
  { id: "white",  label: "White noise",emoji: "〰️", url: "https://assets.mixkit.co/active_storage/sfx/2514/2514-preview.mp3" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE = 4;

const DEFAULT_DURATIONS = { pomodoro: 25, shortBreak: 5, longBreak: 15 };

const MODES: Record<TimerMode,{label:string;short:string;icon:React.ComponentType<{className?:string}>}> = {
  pomodoro:   {label:"Focus",       short:"FOCUS",   icon:Brain },
  shortBreak: {label:"Short Break", short:"BREATHE", icon:Coffee},
  longBreak:  {label:"Long Break",  short:"RESTORE", icon:Wind  },
};

const ACTION_LABEL: Record<TimerActionType,string> = {
  start:"Started",pause:"Paused",reset:"Reset",mode_switch:"Mode Switch",session_complete:"Completed"
};

const BREAK_TIPS = {
  shortBreak:["Look 20ft away for 20 sec.","Stand. Roll your shoulders.","Drink a full glass of water.","5 slow deep breaths."],
  longBreak: ["Walk outside — 5 min resets you.","Eat something real.","Let your thoughts wander freely.","Do something with your hands."],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const es=():DailyTimerStats=>({focusMinutes:0,breakMinutes:0,focusSessions:0,completions:0,starts:0,pauses:0,resets:0,modeSwitches:0});
const ea=():TimerAnalytics=>({totalSessions:0,totalFocusMinutes:0,totalBreakMinutes:0,currentStreak:0,longestStreak:0,lastFocusDate:null,daily:{},actions:[]});
const dk=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const last7=()=>Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return dk(d);});
const dayLbl=(k:string)=>new Date(`${k}T00:00:00`).toLocaleDateString([],{weekday:"short"}).slice(0,2);
const fmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const mkAct=(type:TimerActionType,mode:TimerMode,note?:string):TimerAction=>({id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type,mode,note,at:new Date().toISOString()});

// ─── SVG Ring ─────────────────────────────────────────────────────────────────

const VB=280,CX=140,R=112,SW=14,CIRC=2*Math.PI*R;

const Ring:React.FC<{p:number;mode:TimerMode;active:boolean}>=({p,mode,active})=>{
  const t=T[mode];
  const off=CIRC*(1-Math.min(p,100)/100);
  const ang=(p/100*360-90)*Math.PI/180;
  const dx=CX+R*Math.cos(ang),dy=CX+R*Math.sin(ang);
  const showDot=p>1&&p<99.5;
  const gId=`g${mode}`,fId=`f${mode}`;
  return(
    <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full" style={{overflow:"visible"}} aria-hidden>
      <defs>
        <linearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.rA}/><stop offset="100%" stopColor={t.rB}/>
        </linearGradient>
        <filter id={fId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={active?"5":"2.5"} result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={CX} cy={CX} r={R+SW*1.6} fill="none"
        stroke={t.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"}
        strokeWidth="1" strokeDasharray="3 10" strokeLinecap="round"/>
      <circle cx={CX} cy={CX} r={R} fill="none" stroke={t.rTr} strokeWidth={SW}/>
      <motion.circle cx={CX} cy={CX} r={R} fill="none"
        stroke={`url(#${gId})`} strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={CIRC} initial={false}
        animate={{strokeDashoffset:off}} transition={{duration:0.65,ease:"easeOut"}}
        transform={`rotate(-90 ${CX} ${CX})`} filter={`url(#${fId})`}/>
      {showDot&&(
        <motion.circle cx={dx} cy={dy} r={SW/2+2} fill={t.rB}
          initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} filter={`url(#${fId})`}/>
      )}
    </svg>
  );
};

// ─── Phase Dots ───────────────────────────────────────────────────────────────

const Dots:React.FC<{done:number;mode:TimerMode;active:boolean}>=({done,mode,active})=>{
  const t=T[mode];
  return(
    <div className="flex items-center gap-2">
      {Array.from({length:CYCLE}).map((_,i)=>{
        const filled=i<done,cur=i===done&&active;
        return(
          <motion.div key={i}
            animate={cur?{scale:[1,1.35,1],opacity:[0.6,1,0.6]}:{}}
            transition={{duration:2.2,repeat:Infinity,ease:"easeInOut"}}
            style={{
              width:filled?15:cur?11:9,height:filled?15:cur?11:9,
              borderRadius:"50%",transition:"all .3s",
              background:filled||cur?t.accent:"transparent",
              border:`2px solid ${filled||cur?t.accent:(t.dark?"rgba(255,255,255,0.22)":"rgba(0,0,0,0.18)")}`,
              boxShadow:(filled||cur)&&active?`0 0 8px ${t.glow}`:"none",
            }}/>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PomodoroTimer:React.FC<PomodoroTimerProps>=({
  onExit,mode,setMode,timeLeft,setTimeLeft,endAt,setEndAt,
  isActive,setIsActive,isMuted,setIsMuted,
  notificationsEnabled,setNotificationsEnabled,
  keepAwake,setKeepAwake,isZenMode,setIsZenMode,
  tasks=[],
})=>{
  const [insight,setInsight]           = useState("A calm start makes everything easier.");
  const [insightLoad,setIL]            = useState(false);
  const [dcOpen,setDcOpen]             = useState(false);
  const [taskPickerOpen,setTaskPicker] = useState(false);
  const [soundPickerOpen,setSoundPicker]= useState(false);
  const [durPickerOpen,setDurPicker]   = useState(false);
  const [focusedTaskId,setFocusedTaskId]= useState<string|null>(null);
  const [goal,setGoal]                 = useLocalStorage<number>("pomodoro_focus_goal",90);
  const [doneCount,setDoneCount]       = useLocalStorage<number>("pomodoro_cycle_count",0);
  const [analytics,setAnalytics]       = useLocalStorage<TimerAnalytics>("pomodoro_data_center",ea());
  const [activeSound,setActiveSound]   = useLocalStorage<string>("pomodoro_sound","none");
  const [soundVol,setSoundVol]         = useLocalStorage<number>("pomodoro_sound_vol",40);
  const [customDurs,setCustomDurs]     = useLocalStorage<typeof DEFAULT_DURATIONS>("pomodoro_custom_dur",DEFAULT_DURATIONS);
  const [flowSecs,setFlowSecs]         = useState(0);
  const [flash,setFlash]               = useState(false);

  const snap      = useRef({timeLeft,mode,isActive});
  const flowRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const audioRef  = useRef<HTMLAudioElement|null>(null);
  const tipRef    = useRef("");

  const t      = T[mode];
  const isFoc  = mode==="pomodoro";
  const isBrk  = !isFoc;
  const total  = customDurs[mode]*60;
  const prog   = Math.min(100,Math.max(0,((total-timeLeft)/total)*100));
  const cycPos = doneCount%CYCLE;
  const flowM  = Math.floor(flowSecs/60);
  const tKey   = dk();
  const today  = analytics.daily[tKey]??es();
  const gPct   = Math.round(Math.min(100,(today.focusMinutes/Math.max(1,goal))*100));
  const endLbl = useMemo(()=>endAt?new Date(endAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):null,[endAt]);
  const k7     = useMemo(()=>last7(),[]);
  const s7     = useMemo(()=>k7.map(k=>analytics.daily[k]?.focusMinutes??0),[analytics.daily,k7]);
  const pk7    = Math.max(1,...s7);

  const focusedTask = tasks.find(t=>t.id===focusedTaskId)||null;

  // tip
  useEffect(()=>{
    if(isBrk){
      const p=BREAK_TIPS[mode as "shortBreak"|"longBreak"]??[];
      tipRef.current=p[Math.floor(Math.random()*p.length)]??"Rest fully.";
    }
  },[mode,isBrk]);

  // insight
  const loadInsight=useCallback(async()=>{
    setIL(true);
    const h=new Date().getHours();
    setInsight(await getFocusInsight(mode,h<12?"morning":h<18?"afternoon":"evening"));
    setIL(false);
  },[mode]);
  useEffect(()=>{loadInsight();},[loadInsight]);

  // ambient audio
  useEffect(()=>{
    if(audioRef.current){audioRef.current.pause();audioRef.current=null;}
    if(activeSound==="none"||!isActive)return;
    const s=SOUNDS.find(s=>s.id===activeSound);
    if(!s?.url)return;
    const a=new Audio(s.url);
    a.loop=true;
    a.volume=soundVol/100;
    a.play().catch(()=>{});
    audioRef.current=a;
    return()=>{a.pause();};
  },[activeSound,isActive,soundVol]);

  useEffect(()=>{
    if(audioRef.current)audioRef.current.volume=soundVol/100;
  },[soundVol]);

  // flow
  useEffect(()=>{
    if(flowRef.current)clearInterval(flowRef.current);
    if(isActive&&isFoc)flowRef.current=setInterval(()=>setFlowSecs(s=>s+1),1000);
    else if(!isActive)setFlowSecs(0);
    return()=>{if(flowRef.current)clearInterval(flowRef.current);};
  },[isActive,isFoc]);

  // analytics
  const track=useCallback((type:TimerActionType,m:TimerMode,note?:string)=>{
    setAnalytics(prev=>{
      const k=dk(),c=prev.daily[k]??es(),u={...c};
      if(type==="start")u.starts+=1;
      if(type==="pause")u.pauses+=1;
      if(type==="reset")u.resets+=1;
      if(type==="mode_switch")u.modeSwitches+=1;
      return{...prev,daily:{...prev.daily,[k]:u},actions:[mkAct(type,m,note),...prev.actions].slice(0,120)};
    });
  },[setAnalytics]);

  const trackComp=useCallback((cm:TimerMode)=>{
    setAnalytics(prev=>{
      const k=dk(),c=prev.daily[k]??es(),u={...c,completions:c.completions+1};
      const mins=customDurs[cm];
      let{totalSessions:ts,totalFocusMinutes:tf,totalBreakMinutes:tb,currentStreak:cs,longestStreak:ls,lastFocusDate:lf}=prev;
      if(cm==="pomodoro"){
        u.focusMinutes+=mins;u.focusSessions+=1;ts++;tf+=mins;
        if(lf!==k){const y=new Date();y.setDate(y.getDate()-1);cs=lf===dk(y)?cs+1:1;ls=Math.max(ls,cs);lf=k;}
        setDoneCount(n=>n+1);
      }else{u.breakMinutes+=mins;tb+=mins;}
      return{...prev,totalSessions:ts,totalFocusMinutes:tf,totalBreakMinutes:tb,currentStreak:cs,longestStreak:ls,lastFocusDate:lf,daily:{...prev.daily,[k]:u},actions:[mkAct("session_complete",cm),...prev.actions].slice(0,120)};
    });
  },[setAnalytics,setDoneCount,customDurs]);

  useEffect(()=>{
    const p=snap.current;
    if(p.isActive&&p.timeLeft>0&&timeLeft===0){trackComp(p.mode);setFlash(true);setTimeout(()=>setFlash(false),2000);}
    snap.current={timeLeft,mode,isActive};
  },[isActive,mode,timeLeft,trackComp]);

  const switchMode=(m:TimerMode)=>{
    if(m===mode)return;
    setMode(m);setTimeLeft(customDurs[m]*60);setIsActive(false);setEndAt(null);setFlowSecs(0);
    track("mode_switch",m);
  };

  const toggleTimer=async()=>{
    const next=!isActive;
    if(next){
      if(notificationsEnabled&&"Notification"in window&&Notification.permission==="default"){
        if(await Notification.requestPermission()!=="granted")setNotificationsEnabled(false);
      }
      setEndAt(Date.now()+timeLeft*1000);
    }else if(endAt!==null){
      setTimeLeft(Math.max(0,Math.ceil((endAt-Date.now())/1000)));setEndAt(null);
    }
    setIsActive(next);track(next?"start":"pause",mode);
  };

  const resetTimer=()=>{
    setIsActive(false);setTimeLeft(customDurs[mode]*60);setEndAt(null);setFlowSecs(0);track("reset",mode);
  };

  const applyCustomDur=(m:TimerMode,mins:number)=>{
    const next={...customDurs,[m]:mins};
    setCustomDurs(next);
    if(m===mode&&!isActive){setTimeLeft(mins*60);}
  };

  const toggleNotif=async()=>{
    if(!notificationsEnabled&&"Notification"in window){
      if(Notification.permission==="granted"){setNotificationsEnabled(true);return;}
      if(Notification.permission==="default"){setNotificationsEnabled(await Notification.requestPermission()==="granted");return;}
    }
    setNotificationsEnabled(!notificationsEnabled);
  };

  const card="rounded-2xl border backdrop-blur-sm";
  const toolC="flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 flex-shrink-0";
  const toolS={background:t.bBg,borderColor:t.bBd,color:t.bTxt} as React.CSSProperties;
  const soundOpt=SOUNDS.find(s=>s.id===activeSound)||SOUNDS[0];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ZEN MODE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if(isZenMode){
    return(
      <div className="w-full h-full flex flex-col items-center justify-center gap-5"
        style={{background:`linear-gradient(135deg,${t.bgA},${t.bgB})`}}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {isFoc
            ?<div style={{position:"absolute",top:"-20%",left:"-15%",width:"60vmin",height:"60vmin",borderRadius:"50%",background:"rgba(19,185,109,0.06)",filter:"blur(100px)"}}/>
            :<motion.div style={{position:"absolute",top:"15%",left:"15%",width:"60vmin",height:"60vmin",borderRadius:"50%",background:`${t.rA}16`,filter:"blur(100px)"}} animate={{scale:[1,1.12,1]}} transition={{duration:8,repeat:Infinity,ease:"easeInOut"}}/>
          }
        </div>
        <div style={{width:"min(58vmin,300px)",height:"min(58vmin,300px)",position:"relative"}}>
          <Ring p={prog} mode={mode} active={isActive}/>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.5em] mb-1" style={{color:t.s}}>{MODES[mode].short}</span>
            <span style={{color:t.p,fontSize:"min(16vmin,72px)",fontFamily:"'Libre Baskerville',serif",letterSpacing:"-0.04em",fontWeight:300,lineHeight:1}}>{fmt(timeLeft)}</span>
            {endLbl&&isActive&&<span className="text-[10px] font-mono mt-1" style={{color:t.m}}>ends {endLbl}</span>}
          </div>
          {isBrk&&isActive&&(
            <motion.div className="absolute inset-0 rounded-full border-2 pointer-events-none" style={{borderColor:`${t.rA}28`}}
              animate={{scale:[1,1.07,1],opacity:[0.3,0.65,0.3]}} transition={{duration:8,repeat:Infinity,ease:"easeInOut"}}/>
          )}
        </div>
        {focusedTask&&(
          <p className="text-sm font-medium text-center max-w-[240px]" style={{color:t.s}}>
            ↳ {focusedTask.text}
          </p>
        )}
        <Dots done={cycPos} mode={mode} active={isActive}/>
        <div className="flex items-center gap-3">
          <button onClick={resetTimer} className={toolC} style={toolS}><RotateCcw className="w-4 h-4"/></button>
          <motion.button onClick={toggleTimer} whileTap={{scale:0.92}}
            className="flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{background:t.play,boxShadow:t.playGlow}}>
            {isActive?<Pause className="w-6 h-6 fill-white text-white"/>:<Play className="w-6 h-6 ml-0.5 fill-white text-white"/>}
          </motion.button>
          <button onClick={()=>setIsZenMode(false)} className={toolC} style={toolS}><Minimize2 className="w-4 h-4"/></button>
        </div>
        <p className="text-sm font-serif italic text-center max-w-[260px] leading-relaxed" style={{color:t.s}}>
          {isBrk?tipRef.current:`"${insight}"`}
        </p>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FULL LAYOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return(
    <div className="w-full h-full flex flex-col overflow-hidden"
      style={{background:`linear-gradient(150deg,${t.bgA} 0%,${t.bgB} 100%)`}}>

      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
        {isFoc?(
          <>
            <motion.div style={{position:"absolute",top:"-15%",left:"-12%",width:500,height:500,borderRadius:"50%",background:"rgba(19,185,109,0.07)",filter:"blur(110px)"}}
              animate={{x:[0,36,-18,0],y:[0,20,10,0]}} transition={{duration:26,repeat:Infinity,ease:"easeInOut"}}/>
            <motion.div style={{position:"absolute",bottom:"-12%",right:"-8%",width:380,height:380,borderRadius:"50%",background:"rgba(95,212,160,0.05)",filter:"blur(90px)"}}
              animate={{x:[0,-22,11,0],y:[0,12,-17,0]}} transition={{duration:31,repeat:Infinity,ease:"easeInOut"}}/>
            <div style={{position:"absolute",inset:0,opacity:0.022,backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",backgroundSize:"56px 56px"}}/>
          </>
        ):(
          <>
            <motion.div style={{position:"absolute",top:"-10%",left:"-8%",width:460,height:460,borderRadius:"50%",background:`${t.rA}20`,filter:"blur(100px)"}}
              animate={{scale:[1,1.1,1],opacity:[0.7,1,0.7]}} transition={{duration:8,repeat:Infinity,ease:"easeInOut"}}/>
            <motion.div style={{position:"absolute",bottom:"-8%",right:"-5%",width:360,height:360,borderRadius:"50%",background:`${t.rB}16`,filter:"blur(80px)"}}
              animate={{scale:[1,1.08,1],opacity:[0.5,0.8,0.5]}} transition={{duration:8,delay:2.5,repeat:Infinity,ease:"easeInOut"}}/>
          </>
        )}
      </div>

      {/* Flash */}
      <AnimatePresence>
        {flash&&(
          <motion.div className="absolute inset-0 z-50 pointer-events-none"
            initial={{opacity:0}} animate={{opacity:[0,0.22,0]}} exit={{opacity:0}}
            transition={{duration:2,times:[0,0.25,1]}}
            style={{background:`radial-gradient(circle at 50% 42%,${t.glow},transparent 64%)`}}/>
        )}
      </AnimatePresence>

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="relative z-10 flex-none flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 flex-shrink-0">
          <BrandLogo className="h-9 w-9 rounded-[1.1rem] p-2 flex-shrink-0"
            style={{border:`1px solid ${t.cBd}`,background:t.dark?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.8)"}} alt="IntentList"/>
          <div className="hidden sm:block leading-none">
            <p className="text-sm font-black tracking-[-0.02em]" style={{color:t.p}}>Focus Orbit</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] mt-0.5" style={{color:t.s}}>by IntentList</p>
          </div>
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 flex-1 justify-center overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border flex-shrink-0"
            style={{background:t.cBg,borderColor:t.cBd}}>
            <Flame className="w-3.5 h-3.5 flex-shrink-0" style={{color:t.accent}}/>
            <span className="text-xs font-bold tabular-nums" style={{color:t.p}}>{analytics.currentStreak}</span>
            <span className="text-[9px] uppercase tracking-widest hidden sm:inline" style={{color:t.s}}>streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border flex-shrink-0"
            style={{background:t.cBg,borderColor:t.cBd}}>
            <Target className="w-3.5 h-3.5 flex-shrink-0" style={{color:t.accent}}/>
            <span className="text-xs font-bold tabular-nums" style={{color:t.p}}>{gPct}%</span>
            <span className="text-[9px] uppercase tracking-widest hidden sm:inline" style={{color:t.s}}>goal</span>
          </div>
          <AnimatePresence>
            {isFoc&&isActive&&flowM>=12&&(
              <motion.div initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.85}}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border flex-shrink-0"
                style={{background:`${t.accent}18`,borderColor:`${t.accent}45`}}>
                <Zap className="w-3 h-3 flex-shrink-0" style={{color:t.accent}}/>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:t.accent}}>
                  {flowM>=20?"Deep flow":"In zone"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold uppercase tracking-[0.14em] flex-shrink-0 transition-all"
          style={{background:t.bBg,borderColor:t.bBd,color:t.bTxt}}>
          <ArrowLeft className="w-3.5 h-3.5"/>
          <span className="hidden sm:inline">Back</span>
        </button>
      </header>

      {/* ═══════════════ CENTER ═══════════════ */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-8 px-3 sm:px-4 lg:px-6 py-1 overflow-hidden">

        {/* Ring column */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.p key={mode+String(isActive)}
              initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:5}}
              className="text-[10px] font-bold uppercase tracking-[0.5em]" style={{color:t.s}}>
              {isActive?(isFoc?"— deep focus —":"— rest & recover —"):`${MODES[mode].label} mode`}
            </motion.p>
          </AnimatePresence>

          {/* Ring */}
          <div className="relative flex items-center justify-center"
            style={{width:"min(50vmin,260px)",height:"min(50vmin,260px)"}}>
            <Ring p={prog} mode={mode} active={isActive}/>
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
              <AnimatePresence mode="wait">
                <motion.span key={Math.floor(timeLeft/5)}
                  initial={{opacity:0.75,scale:0.97}} animate={{opacity:1,scale:1}} transition={{duration:0.28}}
                  style={{color:t.p,fontSize:"clamp(34px,12vmin,68px)",fontFamily:"'Libre Baskerville',serif",letterSpacing:"-0.04em",fontWeight:300,lineHeight:1}}>
                  {fmt(timeLeft)}
                </motion.span>
              </AnimatePresence>
              {endLbl&&isActive&&<span className="text-[10px] font-mono mt-0.5" style={{color:t.m}}>ends {endLbl}</span>}
              {isBrk&&isActive&&(
                <motion.span animate={{opacity:[0.4,1,0.4]}} transition={{duration:8,repeat:Infinity,ease:"easeInOut"}}
                  className="text-[11px] font-serif italic mt-1" style={{color:t.s}}>breathe</motion.span>
              )}
            </div>
            {isBrk&&isActive&&(
              <motion.div className="absolute inset-0 rounded-full border-2 pointer-events-none" style={{borderColor:`${t.rA}28`}}
                animate={{scale:[1,1.06,1],opacity:[0.3,0.65,0.3]}} transition={{duration:8,repeat:Infinity,ease:"easeInOut"}}/>
            )}
          </div>

          {/* Phase dots */}
          <div className="flex flex-col items-center gap-1">
            <Dots done={cycPos} mode={mode} active={isActive}/>
            <p className="text-[9px] font-mono uppercase tracking-[0.26em]" style={{color:t.m}}>
              {cycPos===0&&doneCount>0?"cycle complete":`session ${cycPos+1} / ${CYCLE}`}
            </p>
          </div>

          {/* Focused task badge */}
          <AnimatePresence>
            {focusedTask&&(
              <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border max-w-[240px]"
                style={{background:`${t.accent}14`,borderColor:`${t.accent}35`}}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:t.accent}}/>
                <p className="text-[10px] font-medium truncate" style={{color:t.p}}>{focusedTask.text}</p>
                <button onClick={()=>setFocusedTaskId(null)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" style={{color:t.p}}/>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats column */}
        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible w-full lg:w-60 pb-1 lg:pb-0 flex-shrink-0 items-stretch custom-scrollbar">
          {/* 3 stat chips */}
          <div className="flex lg:grid lg:grid-cols-3 gap-2 flex-shrink-0">
            {[{label:"Focus",val:`${today.focusMinutes}m`},{label:"Done",val:today.focusSessions},{label:"Goal",val:`${gPct}%`}].map(({label,val})=>(
              <div key={label} className={cn(card,"px-3 py-2.5 text-center flex-shrink-0 min-w-[64px] lg:min-w-0")}
                style={{background:t.cBg,borderColor:t.cBd}}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{color:t.s}}>{label}</p>
                <p className="text-base font-black mt-0.5 tabular-nums" style={{color:t.p}}>{val}</p>
              </div>
            ))}
          </div>

          {/* Goal bar */}
          <div className={cn(card,"px-3 py-2.5 flex-shrink-0 min-w-[140px] lg:min-w-0")} style={{background:t.cBg,borderColor:t.cBd}}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{color:t.s}}>Daily goal</span>
              <span className="text-[9px] font-mono font-bold" style={{color:t.accent}}>{today.focusMinutes}/{goal}m</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{background:t.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)"}}>
              <motion.div className="h-full rounded-full" initial={false}
                animate={{width:`${Math.max(gPct,2)}%`}} transition={{duration:0.7}}
                style={{background:`linear-gradient(90deg,${t.rA},${t.rB})`}}/>
            </div>
          </div>

          {/* Insight */}
          <div className={cn(card,"px-3 py-2.5 flex-shrink-0 min-w-[170px] lg:min-w-0")} style={{background:t.cBg,borderColor:t.cBd}}>
            <div className="flex items-center gap-1 mb-1.5">
              <Sparkles className="w-3 h-3 flex-shrink-0" style={{color:t.accent}}/>
              <span className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{color:t.s}}>{isBrk?"Break tip":"Insight"}</span>
            </div>
            <p className="text-xs font-serif italic leading-relaxed" style={{color:t.s,opacity:insightLoad?0.5:1}}>
              {isBrk?tipRef.current:`"${insight}"`}
            </p>
          </div>

          {/* Sparkline */}
          <div className={cn(card,"px-3 py-2.5 flex-shrink-0 min-w-[130px] lg:min-w-0")} style={{background:t.cBg,borderColor:t.cBd}}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2" style={{color:t.s}}>7-day</p>
            <div className="flex items-end gap-[3px] h-8">
              {s7.map((v,i)=>(
                <div key={i} className="flex-1 rounded-sm transition-all duration-500"
                  style={{height:`${Math.max(3,(v/pk7)*100)}%`,background:v>0?t.rA:(t.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)")}}/>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {k7.map(k=><span key={k} className="text-[8px] font-mono" style={{color:t.m}}>{dayLbl(k)}</span>)}
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="relative z-10 flex-none flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">

        {/* Mode switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl border" style={{background:t.cBg,borderColor:t.cBd}}>
          {(Object.keys(MODES) as TimerMode[]).map(m=>{
            const Icon=MODES[m].icon,a=m===mode;
            return(
              <button key={m} onClick={()=>switchMode(m)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-300"
                style={{background:a?t.mABg:t.cBg,borderColor:a?t.mABd:t.mIBd,color:a?t.mATxt:t.mITxt}}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0"/>
                <span className="hidden md:inline">{MODES[m].label}</span>
              </button>
            );
          })}
        </div>

        {/* Right tool strip */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{background:t.cBg,borderColor:t.cBd}}>

          {/* Task picker */}
          {tasks.length>0&&(
            <div className="relative">
              <button onClick={()=>{setTaskPicker(o=>!o);setSoundPicker(false);setDurPicker(false);setDcOpen(false);}}
                className={cn(toolC,"gap-1.5 w-auto px-2.5 text-xs font-semibold")}
                style={{...toolS,borderColor:focusedTaskId?t.accent:t.bBd,color:focusedTaskId?t.accent:t.bTxt}}
                title="Link a task">
                <ListTodo className="w-4 h-4 flex-shrink-0"/>
                <span className="hidden sm:inline max-w-[80px] truncate">{focusedTask?"Linked":"Link Task"}</span>
              </button>
              <AnimatePresence>
                {taskPickerOpen&&(
                  <motion.div initial={{opacity:0,y:8,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.96}}
                    className="absolute bottom-full mb-2 right-0 rounded-2xl border shadow-2xl overflow-hidden w-64 z-40"
                    style={{background:t.pBg,borderColor:t.pBd}}>
                    <p className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.3em]" style={{color:t.s}}>Focus on a task</p>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {tasks.map(task=>(
                        <button key={task.id} onClick={()=>{setFocusedTaskId(task.id);setTaskPicker(false);}}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium transition-all hover:opacity-80"
                          style={{color:focusedTaskId===task.id?t.accent:t.p,background:focusedTaskId===task.id?`${t.accent}12`:"transparent"}}>
                          {focusedTaskId===task.id&&<Check className="w-3.5 h-3.5 flex-shrink-0" style={{color:t.accent}}/>}
                          <span className="truncate">{task.text}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Ambient sound picker */}
          <div className="relative">
            <button onClick={()=>{setSoundPicker(o=>!o);setTaskPicker(false);setDurPicker(false);setDcOpen(false);}}
              className={cn(toolC,"gap-1 w-auto px-2 text-xs")}
              style={{...toolS,borderColor:activeSound!=="none"?t.accent:t.bBd,color:activeSound!=="none"?t.accent:t.bTxt}}
              title="Ambient sound">
              {activeSound!=="none"?<Volume2 className="w-4 h-4"/>:<VolumeX className="w-4 h-4"/>}
              <span className="text-base leading-none">{soundOpt.emoji}</span>
            </button>
            <AnimatePresence>
              {soundPickerOpen&&(
                <motion.div initial={{opacity:0,y:8,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.96}}
                  className="absolute bottom-full mb-2 right-0 rounded-2xl border shadow-2xl p-3 z-40 w-56"
                  style={{background:t.pBg,borderColor:t.pBd}}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-2" style={{color:t.s}}>Ambient Sound</p>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {SOUNDS.map(s=>(
                      <button key={s.id} onClick={()=>setActiveSound(s.id)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all"
                        style={{background:activeSound===s.id?t.mABg:t.cBg,borderColor:activeSound===s.id?t.mABd:t.cBd,color:activeSound===s.id?t.mATxt:t.s}}>
                        <span className="text-base leading-none">{s.emoji}</span>
                        <span className="text-[9px] leading-none">{s.label}</span>
                      </button>
                    ))}
                  </div>
                  {activeSound!=="none"&&(
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{color:t.s}}>Volume</p>
                      <input type="range" min={10} max={100} step={5} value={soundVol}
                        onChange={e=>setSoundVol(Number(e.target.value))} className="w-full" style={{accentColor:t.accent}}/>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Custom durations */}
          <div className="relative">
            <button onClick={()=>{setDurPicker(o=>!o);setTaskPicker(false);setSoundPicker(false);setDcOpen(false);}}
              className={toolC} style={toolS} title="Timer durations">
              <SlidersHorizontal className="w-4 h-4"/>
            </button>
            <AnimatePresence>
              {durPickerOpen&&(
                <motion.div initial={{opacity:0,y:8,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.96}}
                  className="absolute bottom-full mb-2 right-0 rounded-2xl border shadow-2xl p-4 z-40 w-56"
                  style={{background:t.pBg,borderColor:t.pBd}}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-3" style={{color:t.s}}>Timer Durations</p>
                  {(["pomodoro","shortBreak","longBreak"] as TimerMode[]).map(m=>(
                    <div key={m} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{color:t.s}}>{MODES[m].label}</span>
                        <span className="text-xs font-bold tabular-nums" style={{color:t.p}}>{customDurs[m]}m</span>
                      </div>
                      <input type="range" min={m==="pomodoro"?10:1} max={m==="pomodoro"?90:30} step={m==="pomodoro"?5:1}
                        value={customDurs[m]} onChange={e=>applyCustomDur(m,Number(e.target.value))}
                        className="w-full" style={{accentColor:t.accent}}/>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Data center */}
          <button onClick={()=>{setDcOpen(o=>!o);setTaskPicker(false);setSoundPicker(false);setDurPicker(false);}}
            className="flex items-center gap-1.5 h-10 px-3 rounded-xl border text-xs font-semibold transition-all"
            style={{background:t.bBg,borderColor:t.bBd,color:t.bTxt}}>
            <BarChart3 className="w-4 h-4 flex-shrink-0"/>
            <span className="hidden md:inline">Stats</span>
          </button>

          <button onClick={()=>setIsMuted(!isMuted)} className={toolC} style={toolS}><Bell className={cn("w-4 h-4",isMuted&&"opacity-40")}/></button>
          <button onClick={resetTimer} className={toolC} style={toolS}><RotateCcw className="w-4 h-4"/></button>

          {/* Play/Pause hero */}
          <motion.button onClick={toggleTimer} whileTap={{scale:0.92}}
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 flex-shrink-0"
            style={{background:t.play,boxShadow:t.playGlow}}>
            {isActive?<Pause className="w-5 h-5 fill-white text-white"/>:<Play className="w-5 h-5 ml-0.5 fill-white text-white"/>}
          </motion.button>

          <button onClick={()=>setIsZenMode(true)} className={toolC} style={toolS}><Maximize2 className="w-4 h-4"/></button>
        </div>
      </footer>

      {/* ═══════════════ DATA CENTER ═══════════════ */}
      <AnimatePresence>
        {dcOpen&&(
          <>
            <motion.div className="absolute inset-0 z-20 cursor-pointer"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              style={{background:t.dark?"rgba(0,0,0,0.55)":"rgba(0,0,0,0.2)"}}
              onClick={()=>setDcOpen(false)}/>
            <motion.section
              initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
              transition={{type:"spring",damping:28,stiffness:260}}
              className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-x overflow-y-auto max-h-[82vh] custom-scrollbar"
              style={{background:t.pBg,borderColor:t.pBd}}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{background:t.dark?"rgba(255,255,255,0.22)":"rgba(0,0,0,0.16)"}}/>
              </div>
              <div className="flex items-center justify-between px-5 pb-4 border-b" style={{borderColor:t.pBd}}>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{color:t.s}}>Behavior Analytics</p>
                  <h3 className="text-xl font-black mt-0.5" style={{color:t.p}}>Data Center</h3>
                </div>
                <button onClick={()=>setDcOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border" style={toolS}>
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[["Total Sessions",analytics.totalSessions],["Focus Time",`${analytics.totalFocusMinutes}m`],["Best Streak",analytics.longestStreak],["Today Actions",today.starts+today.pauses+today.resets]].map(([l,v])=>(
                    <div key={String(l)} className={cn(card,"p-3 text-center")} style={{background:t.cBg,borderColor:t.cBd}}>
                      <p className="text-[9px] uppercase tracking-[0.2em]" style={{color:t.s}}>{l}</p>
                      <p className="text-2xl font-black mt-1" style={{color:t.p}}>{v}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={cn(card,"p-4")} style={{background:t.cBg,borderColor:t.cBd}}>
                    <div className="flex items-center gap-2 text-sm font-bold mb-3" style={{color:t.p}}>
                      <Target className="w-4 h-4" style={{color:t.accent}}/> Daily Focus Goal
                    </div>
                    <input type="range" min={25} max={240} step={5} value={goal}
                      onChange={e=>setGoal(Number(e.target.value))} className="w-full" style={{accentColor:t.accent}}/>
                    <div className="mt-2 flex justify-between text-sm" style={{color:t.s}}>
                      <span>{today.focusMinutes}m done</span>
                      <span className="font-bold" style={{color:t.accent}}>{goal}m target</span>
                    </div>
                  </div>
                  <div className={cn(card,"p-4")} style={{background:t.cBg,borderColor:t.cBd}}>
                    <div className="flex items-center gap-2 text-sm font-bold mb-3" style={{color:t.p}}>
                      <Clock3 className="w-4 h-4" style={{color:t.accent}}/> Last 7 Days
                    </div>
                    <div className="flex items-end gap-1.5 h-14">
                      {s7.map((v,i)=>(
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <div className="w-full rounded transition-all"
                            style={{height:`${Math.max(3,(v/pk7)*50)}px`,background:v>0?`linear-gradient(to top,${t.rA},${t.rB})`:(t.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)")}}/>
                          <span className="text-[8px] font-mono" style={{color:t.m}}>{dayLbl(k7[i])}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[{icon:notificationsEnabled?Bell:BellOff,label:"Browser Alerts",desc:notificationsEnabled?"On — notified at session end.":"Tap to enable.",fn:toggleNotif},
                    {icon:keepAwake?Maximize2:Minimize2,label:"Keep Awake",desc:keepAwake?"Screen stays on.":"Device can sleep.",fn:()=>setKeepAwake(!keepAwake)},
                    {icon:Sparkles,label:"Session Guard",desc:"Resumes from saved end-time after refresh.",fn:undefined},
                  ].map(({icon:Icon,label,desc,fn})=>(
                    <button key={label} onClick={fn}
                      className={cn(card,"p-3 text-left transition-all",fn?"cursor-pointer hover:opacity-90":"cursor-default")}
                      style={{background:t.cBg,borderColor:t.cBd}}>
                      <div className="flex items-center gap-2 text-sm font-bold mb-1" style={{color:t.p}}>
                        <Icon className="w-4 h-4" style={{color:t.accent}}/>{label}
                      </div>
                      <p className="text-xs leading-relaxed" style={{color:t.s}}>{desc}</p>
                    </button>
                  ))}
                </div>

                <div className={cn(card,"p-4")} style={{background:t.cBg,borderColor:t.cBd}}>
                  <p className="text-sm font-bold mb-3" style={{color:t.p}}>Today Breakdown</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[["Starts",today.starts],["Pauses",today.pauses],["Resets",today.resets],["Mode Shifts",today.modeSwitches]].map(([l,v])=>(
                      <div key={String(l)} className="rounded-xl border p-2.5"
                        style={{background:t.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.7)",borderColor:t.cBd}}>
                        <span style={{color:t.s}}>{l}: </span><span className="font-bold" style={{color:t.p}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cn(card,"p-4")} style={{background:t.cBg,borderColor:t.cBd}}>
                  <p className="text-sm font-bold mb-3" style={{color:t.p}}>Recent Actions</p>
                  {analytics.actions.length===0
                    ?<p className="text-xs" style={{color:t.s}}>No actions yet.</p>
                    :<div className="space-y-2">
                      {analytics.actions.slice(0,8).map(a=>(
                        <div key={a.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs"
                          style={{background:t.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.7)",borderColor:t.cBd}}>
                          <div>
                            <span className="font-bold" style={{color:t.p}}>{ACTION_LABEL[a.type]}</span>
                            <span className="ml-1.5" style={{color:t.s}}>({MODES[a.mode].label})</span>
                          </div>
                          <span className="font-mono" style={{color:t.m}}>{new Date(a.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                        </div>
                      ))}
                    </div>
                  }
                </div>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
