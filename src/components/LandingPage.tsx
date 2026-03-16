/**
 * LandingPage.tsx
 * The full IntentList marketing site.
 * Sections: Hero → Science → Features → HowItWorks → Pricing → FAQ → CTA → Footer
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  Sparkles, Timer, BarChart3, LayoutTemplate, Wand2,
  CheckCircle2, ChevronDown, ArrowRight, Brain, Flame,
  Repeat2, Dumbbell, Moon, BookOpen, Zap, Clock3,
  Quote, Check, X, Star, Layers, Command,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

// ─── Typed Demo ───────────────────────────────────────────────────────────────

const DEMO_PHRASES = [
  { text: 'team meeting tomorrow 10am @work',          result: { date: 'Tomorrow', time: '10:00 AM', tag: '#work',    priority: 'Normal' } },
  { text: 'buy groceries this evening @errands',       result: { date: 'Today',    time: '6:00 PM',  tag: '#errands', priority: 'Normal' } },
  { text: 'finish report by friday high priority',     result: { date: 'Friday',   time: null,       tag: '#work',    priority: 'High'   } },
  { text: 'call mom on sunday afternoon',              result: { date: 'Sunday',   time: '2:00 PM',  tag: '#personal',priority: 'Normal' } },
  { text: 'gym every monday 7am #health',              result: { date: 'Monday',   time: '7:00 AM',  tag: '#health',  priority: 'Normal' } },
  { text: 'deploy to production EOD urgent',           result: { date: 'Today',    time: '5:00 PM',  tag: '#code',    priority: 'High'   } },
];

const TypedDemo: React.FC = () => {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const current = DEMO_PHRASES[phraseIdx];

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && text.length < current.text.length) {
      t = setTimeout(() => { setText(current.text.slice(0, text.length + 1)); }, 52);
    } else if (!deleting && text.length === current.text.length) {
      setShowResult(true);
      t = setTimeout(() => { setDeleting(true); setShowResult(false); }, 2200);
    } else if (deleting && text.length > 0) {
      t = setTimeout(() => setText(text.slice(0, -1)), 24);
    } else if (deleting && text.length === 0) {
      setDeleting(false);
      setPhraseIdx(i => (i + 1) % DEMO_PHRASES.length);
    }
    return () => clearTimeout(t);
  }, [text, deleting, phraseIdx, current.text]);

  const highlight = (s: string) =>
    s.split(/(\s)/).map((w, i) => {
      if (w.startsWith('@') || w.startsWith('#')) return <span key={i} className="font-semibold" style={{ color: '#13B96D' }}>{w}</span>;
      if (/\b(tomorrow|today|monday|friday|sunday|evening|morning|afternoon|eod)\b/i.test(w)) return <span key={i} style={{ color: '#5FD4A0' }}>{w}</span>;
      if (/\b(high priority|urgent)\b/i.test(w)) return <span key={i} style={{ color: '#F87171' }}>{w}</span>;
      if (/\d{1,2}(am|pm)\b/i.test(w)) return <span key={i} style={{ color: '#A78BFA' }}>{w}</span>;
      if (/\b(every|eod)\b/i.test(w)) return <span key={i} style={{ color: '#60A5FA' }}>{w}</span>;
      return <span key={i}>{w}</span>;
    });

  const prioColor = current.result.priority === 'High' ? '#F87171' : '#94A3B8';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Input bar */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border"
        style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#13B96D' }} />
        <span className="font-mono text-sm sm:text-base flex-1" style={{ color: '#E2F4EC', minHeight: '1.5em' }}>
          {highlight(text)}
          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ color: '#13B96D' }}>|</motion.span>
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest hidden sm:block" style={{ color: 'rgba(255,255,255,0.2)' }}>brain dump</span>
      </div>

      {/* Parsed result */}
      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { emoji: '📅', label: 'Date',     value: current.result.date,                 color: '#5FD4A0' },
              { emoji: '⏰', label: 'Time',     value: current.result.time ?? '—',           color: '#A78BFA' },
              { emoji: '🏷️', label: 'Tag',      value: current.result.tag,                   color: '#13B96D' },
              { emoji: '⚡', label: 'Priority', value: current.result.priority,              color: prioColor },
            ].map(({ emoji, label, value, color }) => (
              <div key={label} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-sm flex-shrink-0">{emoji}</span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
                  <p className="text-xs font-bold truncate" style={{ color }}>{value}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Counter animation ────────────────────────────────────────────────────────

const CountUp: React.FC<{ to: number; suffix?: string; duration?: number }> = ({ to, suffix = '', duration = 1.5 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 40;
    const step = to / steps;
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, to);
      setCount(Math.round(current));
      if (current >= to) clearInterval(interval);
    }, (duration * 1000) / steps);
    return () => clearInterval(interval);
  }, [inView, to, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// ─── Section wrapper with reveal ─────────────────────────────────────────────

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => (
  <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}>
    {children}
  </motion.div>
);

// ─── Research Paper Card ──────────────────────────────────────────────────────

const ResearchCard: React.FC<{
  citation: string; stat: string; statLabel: string; quote: string; delay?: number;
}> = ({ citation, stat, statLabel, quote, delay = 0 }) => (
  <Reveal delay={delay}
    className="relative p-6 rounded-3xl border overflow-hidden"
    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(19,185,109,0.2)' }}>
    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
      style={{ background: 'rgba(19,185,109,0.06)' }} />
    <div className="relative">
      <p className="text-[9px] font-mono uppercase tracking-[0.35em] mb-4" style={{ color: '#4E9972' }}>{citation}</p>
      <p className="text-4xl font-black mb-1 font-serif italic" style={{ color: '#13B96D' }}>{stat}</p>
      <p className="text-sm font-semibold mb-4" style={{ color: '#E2F4EC' }}>{statLabel}</p>
      <div className="flex gap-2.5">
        <Quote className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#4E9972' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{quote}</p>
      </div>
    </div>
  </Reveal>
);

// ─── Feature Tab ─────────────────────────────────────────────────────────────

const features = [
  {
    id: 'parser',
    icon: <Sparkles className="w-5 h-5" />,
    label: 'Smart Parser',
    headline: 'Your brain dumps, decoded.',
    subhead: 'Type messy thoughts. Get structured tasks.',
    desc: 'IntentList\'s natural language engine understands over 50 date formats, time expressions, priorities, tags, and even recurring patterns. No fields. No friction. Just type.',
    bullets: ['EOD, next Friday, in 3 weeks, first Monday of next month', 'Auto-tags: #work, #health, #code from context', 'Recurring: "every Tuesday 9am" creates infinite instances', 'Priority: urgent, p1, !!, high priority all work'],
    color: '#13B96D',
    bg: 'rgba(19,185,109,0.06)',
    visual: (
      <div className="space-y-2.5 p-4">
        {[
          { input: 'standup every weekday 9am @work',     tags: ['Recurring', 'Mon–Fri', '#work'] },
          { input: 'submit invoice EOD friday urgent',    tags: ['Fri 5pm', 'High priority', '#finance'] },
          { input: 'read chapter 4 tonight for 1hr',      tags: ['Tonight', '1h est.', '#study'] },
        ].map((ex, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.4 }}
            className="rounded-xl border p-3" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-mono mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>"{ex.input}"</p>
            <div className="flex flex-wrap gap-1.5">
              {ex.tags.map(t => (
                <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(19,185,109,0.18)', color: '#13B96D' }}>{t}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    id: 'pomodoro',
    icon: <Timer className="w-5 h-5" />,
    label: 'Focus Timer',
    headline: 'Flow state, engineered.',
    subhead: 'The Pomodoro timer your productivity deserves.',
    desc: 'Two modes for two worlds. Focus is dark and cosmic — you and the clock, nothing else. Break is light and airy — your mind refills. Ambient sounds, task linking, and flow detection make it the most thoughtful Pomodoro ever built.',
    bullets: ['6 ambient sounds: rain, café, forest, waves, white noise', 'Flow state badge appears after 12+ uninterrupted minutes', 'Link a task to your session — stay intentional', 'Custom durations (10–90 min focus, 1–30 min breaks)'],
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.06)',
    visual: (
      <div className="flex flex-col items-center gap-4 p-6">
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 140 140" className="w-full h-full" style={{ overflow: 'visible' }}>
            <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(19,185,109,0.1)" strokeWidth="7" />
            <motion.circle cx="70" cy="70" r="56" fill="none" stroke="#13B96D" strokeWidth="7"
              strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 56}`}
              animate={{ strokeDashoffset: [2 * Math.PI * 56 * 0.95, 2 * Math.PI * 56 * 0.4, 2 * Math.PI * 56 * 0.95] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              transform="rotate(-90 70 70)"
              style={{ filter: 'drop-shadow(0 0 8px rgba(19,185,109,0.6))' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-light font-serif" style={{ color: '#E2F4EC', letterSpacing: '-0.04em' }}>18:42</span>
            <span className="text-[9px] font-mono uppercase tracking-widest mt-1" style={{ color: '#4E9972' }}>DEEP FOCUS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[true, true, false, false].map((done, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-full border-2 transition-all"
              style={{ background: done ? '#13B96D' : 'transparent', borderColor: done ? '#13B96D' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
        <p className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: '#2B5C42' }}>session 3 / 4</p>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
          style={{ background: 'rgba(19,185,109,0.12)', borderColor: 'rgba(19,185,109,0.35)' }}>
          <Zap className="w-3 h-3" style={{ color: '#13B96D' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#13B96D' }}>In zone · 18m</span>
        </div>
      </div>
    ),
  },
  {
    id: 'habits',
    icon: <Dumbbell className="w-5 h-5" />,
    label: 'Habit Tracker',
    headline: 'Your rituals. Your identity.',
    subhead: 'Tasks get done. Habits build who you become.',
    desc: 'Habits and tasks live together because they belong together. Track streaks, visualise your 7-day consistency, and build the rituals that compound over time. Research shows habit stacking increases success rates by 3.5×.',
    bullets: ['Streaks with visual fire badge — loss aversion works', '7-day dot trail per habit — see your pattern clearly', 'Custom icons, colors, and frequency targets (1–7×/week)', 'All-done celebration when every habit is checked'],
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.06)',
    visual: (
      <div className="space-y-3 p-4">
        {[
          { name: 'Morning workout', emoji: '💪', streak: 12, last7: [true,true,true,false,true,true,true], color: '#13B96D' },
          { name: 'Read 20 minutes', emoji: '📚', streak: 7,  last7: [true,true,false,true,true,true,true], color: '#3B82F6' },
          { name: 'Drink 2L water',  emoji: '💧', streak: 5,  last7: [false,true,true,true,false,true,true], color: '#14B8A6' },
        ].map((h, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-2xl border"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-xl">{h.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-1.5 truncate" style={{ color: '#E2F4EC' }}>{h.name}</p>
              <div className="flex gap-1">
                {h.last7.map((d, j) => (
                  <div key={j} className="w-2.5 h-2.5 rounded-full" style={{ background: d ? h.color : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" style={{ color: '#F59E0B' }}>
              <Flame className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{h.streak}</span>
            </div>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    id: 'review',
    icon: <BarChart3 className="w-5 h-5" />,
    label: 'Weekly Review',
    headline: 'Finish the week with clarity.',
    subhead: 'Know exactly what you did. Plan exactly what\'s next.',
    desc: 'Most people don\'t review their week. The ones who do outperform those who don\'t by 2.3× in goal completion (Locke & Latham, 1990). IntentList makes the weekly review take under 3 minutes.',
    bullets: ['Day-by-day bar chart of tasks completed vs planned', 'Completion rate vs last week — track momentum', 'Top focus areas by tag — see where time really goes', 'Plan next week inline with a single natural language input'],
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.06)',
    visual: (
      <div className="p-4 space-y-3">
        <div className="flex items-end gap-1.5 h-16">
          {[6, 4, 8, 5, 3, 7, 2].map((v, i) => {
            const labels = ['Mo','Tu','We','Th','Fr','Sa','Su'];
            const maxV = 8;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <motion.div initial={{ height: 0 }} whileInView={{ height: `${(v/maxV)*52}px` }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="w-full rounded-sm"
                  style={{ background: i < 5 ? `rgba(59,130,246,${0.3 + (v/maxV)*0.6})` : 'rgba(255,255,255,0.08)' }} />
                <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{labels[i]}</span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[{label:'Done',value:'33',accent:'#3B82F6'},{label:'Rate',value:'82%',accent:'#13B96D'},{label:'Streak',value:'7d',accent:'#F59E0B'}].map(s => (
            <div key={s.label} className="p-2.5 rounded-xl border text-center"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
              <p className="text-lg font-black" style={{ color: s.accent }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const FeatureTabs: React.FC<{ dark?: boolean }> = ({ dark = true }) => {
  const [activeId, setActiveId] = useState('parser');
  const active = features.find(f => f.id === activeId) ?? features[0];

  const textPrimary = dark ? '#E2F4EC' : '#1A3240';
  const textSub     = dark ? '#4E9972' : '#3D7A6B';
  const cardBg      = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)';
  const cardBd      = dark ? 'rgba(255,255,255,0.09)' : '#D4EAE0';
  const tabActive   = dark ? 'rgba(19,185,109,0.18)' : 'rgba(19,185,109,0.12)';
  const tabActiveBd = dark ? 'rgba(19,185,109,0.5)' : 'rgba(19,185,109,0.4)';
  const tabInact    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)';
  const tabInactBd  = dark ? 'rgba(255,255,255,0.08)' : '#D4EAE0';
  const tabText     = dark ? '#4E9972' : '#4A7568';
  const bgVisual    = dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)';
  const bdVisual    = dark ? 'rgba(255,255,255,0.06)' : '#D4EAE0';

  return (
    <div className="w-full">
      {/* Tab strip */}
      <div className="flex flex-wrap gap-2 mb-8">
        {features.map(f => {
          const isActive = f.id === activeId;
          return (
            <button key={f.id} onClick={() => setActiveId(f.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all duration-200"
              style={{
                background: isActive ? tabActive : tabInact,
                borderColor: isActive ? tabActiveBd : tabInactBd,
                color: isActive ? active.color : tabText,
              }}>
              <span style={{ color: isActive ? active.color : tabText }}>{f.icon}</span>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: copy */}
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] mb-2" style={{ color: active.color }}>
                {active.label}
              </p>
              <h3 className="text-3xl font-serif italic leading-tight mb-2" style={{ color: textPrimary }}>
                {active.headline}
              </h3>
              <p className="text-base font-medium" style={{ color: textSub }}>{active.subhead}</p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#4A7568' }}>
              {active.desc}
            </p>
            <ul className="space-y-2.5">
              {active.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: `${active.color}20` }}>
                    <Check className="w-2.5 h-2.5 stroke-[3]" style={{ color: active.color }} />
                  </div>
                  <span className="text-sm" style={{ color: dark ? 'rgba(255,255,255,0.65)' : '#4A7568' }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: visual */}
          <div className="rounded-3xl border overflow-hidden"
            style={{ background: bgVisual, borderColor: bdVisual }}>
            {active.visual}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const faqs = [
  { q: 'Is IntentList really free to start?', a: 'Yes — no credit card needed. The free plan gives you 50 tasks, all views, the Pomodoro timer, habit tracking, and templates. You hit a limit only if you need recurring tasks or AI-enhanced parsing.' },
  { q: 'How is this different from Todoist or Things 3?', a: 'IntentList is built around brain dumping, not structured input. You type naturally; the app figures out the rest. The Pomodoro timer, habit tracker, and weekly review are first-class — not add-ons. The aesthetic is intentionally calming, not clinical.' },
  { q: 'Does the natural language parsing work offline?', a: 'Yes. The parser is pure logic — no API call, no internet required. It handles 50+ date/time formats, tags, priorities, and recurring rules entirely on-device. AI refinement (Pro) is optional and runs in the background.' },
  { q: 'Can I use it on my phone?', a: 'IntentList is a Progressive Web App (PWA). Install it from your browser on iOS or Android — it works offline, sends notifications, and stays synced via Supabase. A native app is on the roadmap.' },
  { q: 'What happens to my tasks if I cancel Pro?', a: 'All your tasks remain. You simply lose access to Pro features like AI parsing and recurring task generation. Your data is always yours.' },
  { q: 'Is there a keyboard shortcut for everything?', a: 'Almost. Cmd+K opens the command palette to search everything. D/T/O/U/A/W navigate views. Escape clears selections. Double-click any task to edit it inline. More shortcuts are on the way.' },
];

const FAQ: React.FC<{ dark?: boolean }> = ({ dark = false }) => {
  const [open, setOpen] = useState<number | null>(null);
  const textPrimary = dark ? '#E2F4EC' : '#1A3240';
  const textSub     = dark ? 'rgba(255,255,255,0.5)' : '#4A7568';
  const border      = dark ? 'rgba(255,255,255,0.08)' : '#D4EAE0';
  const hoverBg     = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)';

  return (
    <div className="space-y-2">
      {faqs.map((item, i) => (
        <div key={i} className="rounded-2xl border overflow-hidden transition-all duration-200"
          style={{ borderColor: border, background: open === i ? hoverBg : 'transparent' }}>
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left">
            <span className="text-sm font-semibold pr-4" style={{ color: textPrimary }}>{item.q}</span>
            <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
              <ChevronDown className="w-4 h-4" style={{ color: open === i ? '#13B96D' : textSub }} />
            </motion.div>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: textSub }}>{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

const Pricing: React.FC<{ onSignup: () => void }> = ({ onSignup }) => {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      price: 0,
      priceAnnual: 0,
      desc: 'For people who want to try a calmer way to work.',
      cta: 'Get started free',
      ctaAction: onSignup,
      highlight: false,
      features: [
        '50 tasks',
        'All 7 views (Digest, Today, Timeline…)',
        'Pomodoro focus timer',
        'Habit tracker',
        'Natural language parsing',
        'Templates & task breakdown',
        'Weekly review',
        'PWA / mobile install',
      ],
      missing: ['Recurring tasks', 'AI-enhanced parsing', 'Unlimited tasks'],
    },
    {
      name: 'Pro',
      price: 5,
      priceAnnual: 4,
      desc: 'For people serious about getting things done.',
      cta: 'Start 7-day free trial',
      ctaAction: onSignup,
      highlight: true,
      badge: 'Most popular',
      features: [
        'Everything in Free',
        'Unlimited tasks',
        'Recurring tasks (daily, weekly, monthly…)',
        'AI-enhanced parsing & refinement',
        'Priority support',
        'Early access to new features',
      ],
      missing: [],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm font-semibold text-[#1A3240]">Monthly</span>
        <button onClick={() => setAnnual(a => !a)}
          className="relative w-11 h-6 rounded-full transition-colors duration-300"
          style={{ background: annual ? '#13B96D' : '#D4EAE0' }}>
          <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
            animate={{ left: annual ? '24px' : '4px' }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} />
        </button>
        <span className="text-sm font-semibold text-[#1A3240]">
          Annual
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={{ background: 'rgba(19,185,109,0.15)', color: '#0D8A4E' }}>Save 20%</span>
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {plans.map(plan => (
          <div key={plan.name}
            className="relative rounded-3xl border p-7 flex flex-col"
            style={{
              background: plan.highlight ? 'linear-gradient(160deg, #060F0B, #0B1E14)' : 'rgba(255,255,255,0.75)',
              borderColor: plan.highlight ? 'rgba(19,185,109,0.4)' : '#D4EAE0',
              boxShadow: plan.highlight ? '0 0 40px rgba(19,185,109,0.15)' : undefined,
            }}>
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{ background: '#13B96D', color: '#fff' }}>{plan.badge}</div>
            )}

            <div className="mb-5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] mb-1"
                style={{ color: plan.highlight ? '#4E9972' : '#84ADA4' }}>{plan.name}</p>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-5xl font-black font-serif italic"
                  style={{ color: plan.highlight ? '#E2F4EC' : '#1A3240' }}>
                  ${annual ? plan.priceAnnual : plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-sm mb-2" style={{ color: plan.highlight ? '#4E9972' : '#84ADA4' }}>/mo</span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: plan.highlight ? 'rgba(255,255,255,0.45)' : '#4A7568' }}>
                {plan.desc}
              </p>
            </div>

            <ul className="space-y-2.5 mb-7 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5 stroke-[2.5]" style={{ color: '#13B96D' }} />
                  <span className="text-sm" style={{ color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#4A7568' }}>{f}</span>
                </li>
              ))}
              {plan.missing.map(f => (
                <li key={f} className="flex items-start gap-2.5 opacity-40">
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.highlight ? '#E2F4EC' : '#84ADA4' }} />
                  <span className="text-sm" style={{ color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#84ADA4' }}>{f}</span>
                </li>
              ))}
            </ul>

            <button onClick={plan.ctaAction}
              className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 active:scale-[0.98]"
              style={plan.highlight
                ? { background: '#13B96D', color: '#fff', boxShadow: '0 0 30px rgba(19,185,109,0.4)' }
                : { background: 'rgba(19,185,109,0.1)', color: '#0D8A4E', border: '1px solid rgba(19,185,109,0.3)' }
              }>
              {plan.cta}
            </button>

            {plan.highlight && (
              <p className="text-center text-[10px] font-mono uppercase tracking-[0.35em] mt-3"
                style={{ color: '#2B5C42' }}>7-day free trial · cancel anytime</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Landing Page ────────────────────────────────────────────────────────

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup }) => {
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#EDF8F2' }}>

      {/* ══════════════════════════════════════════════
          STICKY NAV
      ══════════════════════════════════════════════ */}
      <div className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${navScrolled ? 'py-3' : 'py-0'}`}>
        <nav className={`mx-auto max-w-6xl px-6 flex items-center justify-between transition-all duration-300 ${
          navScrolled ? 'bg-[rgba(6,15,11,0.92)] backdrop-blur-xl rounded-2xl shadow-2xl mt-2 py-3 border border-[rgba(19,185,109,0.15)]' : 'py-5'
        }`}>
          <div className="flex items-center gap-3">
            <BrandLogo className="h-9 w-9 rounded-2xl p-2 flex-shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)' } as React.CSSProperties} alt="IntentList" />
            <span className="text-base font-black tracking-[-0.02em]" style={{ color: '#E2F4EC' }}>IntentList</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {[
              { label: 'Features',      href: '#features'   },
              { label: 'The Science',   href: '#science'    },
              { label: 'How it works',  href: '#how'        },
              { label: 'Pricing',       href: '#pricing'    },
              { label: 'FAQ',           href: '#faq'        },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                className="hover:text-white transition-colors duration-200 cursor-pointer"
                onClick={e => { e.preventDefault(); document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }); }}>
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogin}
              className="hidden sm:block px-4 py-2 text-sm font-semibold transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
              Sign in
            </button>
            <button onClick={onSignup}
              className="px-5 py-2 rounded-full text-sm font-bold transition-all duration-300"
              style={{ background: '#13B96D', color: '#fff', boxShadow: '0 0 20px rgba(19,185,109,0.4)' }}>
              Get started
            </button>
          </div>
        </nav>
      </div>

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060F0B 0%, #0B1E14 55%, #0D2016 100%)' }}>
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.028) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />
        {/* Orbs */}
        <motion.div className="absolute rounded-full blur-[130px] pointer-events-none"
          style={{ width: 700, height: 700, top: '-20%', left: '-15%', background: 'rgba(19,185,109,0.08)' }}
          animate={{ x: [0, 35, -18, 0], y: [0, 22, 8, 0] }} transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute rounded-full blur-[100px] pointer-events-none"
          style={{ width: 500, height: 500, bottom: '-10%', right: '-8%', background: 'rgba(95,212,160,0.06)' }}
          animate={{ x: [0, -28, 14, 0], y: [0, 18, -20, 0] }} transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute rounded-full blur-[80px] pointer-events-none"
          style={{ width: 300, height: 300, top: '45%', left: '55%', background: 'rgba(139,92,246,0.04)' }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        {/* Shooting lines */}
        {[0, 1, 2, 3].map(i => (
          <motion.div key={i} className="absolute h-px pointer-events-none"
            style={{ width: `${100 + i * 40}px`, top: `${18 + i * 16}%`, left: -180,
              background: 'linear-gradient(90deg,transparent,rgba(19,185,109,0.65),transparent)', transform: 'rotate(-11deg)' }}
            animate={{ x: [0, 1800], opacity: [0, 0.9, 0] }}
            transition={{ duration: 6 + i * 1.8, repeat: Infinity, ease: 'linear', delay: i * 2.5 }} />
        ))}

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-16 pt-32 text-center">
          {/* Alpha badge */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-10"
            style={{ background: 'rgba(19,185,109,0.08)', borderColor: 'rgba(19,185,109,0.28)' } as React.CSSProperties}>
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: '#13B96D' }}
              animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-xs font-bold uppercase tracking-[0.32em]" style={{ color: '#5FD4A0' }}>Now in alpha · free to use</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif italic leading-[0.9] tracking-tight"
            style={{ fontSize: 'clamp(3.2rem, 10vw, 7.5rem)', color: '#E8F5EE' }}>
            The one tool<br />
            <span style={{ color: '#13B96D' }}>your mind needs.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-6 text-base sm:text-xl max-w-2xl leading-relaxed mx-auto"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            Tasks. Habits. Focus. Reviews. All in one calm, intelligent space —
            without the complexity that makes every other tool feel like work.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button onClick={onSignup}
              className="group flex items-center gap-2 px-9 py-4 rounded-full text-base font-bold transition-all duration-300 active:scale-95"
              style={{ background: '#13B96D', color: '#fff', boxShadow: '0 0 50px rgba(19,185,109,0.45)' }}>
              Start for free
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
            <button onClick={onLogin}
              className="px-7 py-4 rounded-full border text-sm font-semibold transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' } as React.CSSProperties}>
              Sign in
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="mt-8 flex items-center gap-2">
            <div className="flex -space-x-2">
              {['#13B96D', '#8B5CF6', '#F59E0B', '#3B82F6', '#EF4444'].map((c, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#0B1E14] flex items-center justify-center text-[10px] font-bold"
                  style={{ background: c, color: '#fff', zIndex: 5 - i }}>
                  {['S','A','R','M','J'][i]}
                </div>
              ))}
            </div>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Join 400+ alpha users building better habits</span>
          </motion.div>

          {/* Live demo */}
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.65 }}
            className="mt-16 w-full max-w-2xl mx-auto">
            <p className="text-[9px] font-mono uppercase tracking-[0.45em] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
              watch it parse as you type
            </p>
            <TypedDemo />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          className="relative z-10 flex flex-col items-center pb-8 gap-2">
          <motion.div className="w-px h-10"
            style={{ background: 'linear-gradient(to bottom, rgba(19,185,109,0.5), transparent)' }}
            animate={{ scaleY: [0, 1, 0], originY: 0 }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
          <span className="text-[9px] font-mono uppercase tracking-[0.45em]" style={{ color: 'rgba(255,255,255,0.18)' }}>discover more</span>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════
          NUMBERS BAR
      ══════════════════════════════════════════════ */}
      <section className="py-12 border-y" style={{ background: '#F2FBF6', borderColor: '#D4EAE0' }}>
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: 50,  suffix: '+', label: 'Date formats parsed',     sub: 'without any API' },
            { n: 6,   suffix: '',  label: 'Ambient soundscapes',     sub: 'for deep focus'  },
            { n: 400, suffix: '+', label: 'Alpha users',             sub: 'already building' },
            { n: 7,   suffix: '',  label: 'Integrated views',        sub: 'one product'     },
          ].map(({ n, suffix, label, sub }, i) => (
            <Reveal key={label} delay={i * 0.1}>
              <p className="text-4xl font-black font-serif italic mb-1" style={{ color: '#13B96D' }}>
                <CountUp to={n} suffix={suffix} />
              </p>
              <p className="text-sm font-semibold" style={{ color: '#1A3240' }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#84ADA4' }}>{sub}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          THE SCIENCE — dark section
      ══════════════════════════════════════════════ */}
      <section id="science" className="relative py-28 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060F0B 0%, #0C1E15 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.42em] mb-4" style={{ color: '#4E9972' }}>backed by research</p>
            <h2 className="text-4xl sm:text-5xl font-serif italic tracking-tight mb-5" style={{ color: '#E8F5EE' }}>
              This isn't just<br />an app. It's applied science.
            </h2>
            <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Every feature in IntentList is built on decades of productivity research, cognitive psychology, and habit science.
            </p>
          </Reveal>

          {/* Research cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            <ResearchCard
              citation="Cirillo, F. (2006) · Pomodoro Technique"
              stat="25%"
              statLabel="more work completed in the same time"
              quote="Working in focused sprints with built-in breaks reduces cognitive fatigue and prevents the illusion of multitasking."
              delay={0}
            />
            <ResearchCard
              citation="Csikszentmihalyi, M. (1990) · Flow Theory"
              stat="5×"
              statLabel="more productive in flow state vs. average"
              quote="Flow occurs when challenge level meets skill level. A good Pomodoro system creates the conditions for flow systematically."
              delay={0.1}
            />
            <ResearchCard
              citation="Clear, J. (2018) · Atomic Habits"
              stat="3.5×"
              statLabel="higher habit success with tracking"
              quote="The mere act of recording whether you did a habit makes you significantly more likely to maintain it over time."
              delay={0.2}
            />
            <ResearchCard
              citation="Locke & Latham (1990) · Goal-Setting Theory"
              stat="2.3×"
              statLabel="better goal completion with weekly review"
              quote="Regular reflection on goals and performance is one of the highest-leverage activities for consistent achievement."
              delay={0.3}
            />
            <ResearchCard
              citation="Gollwitzer, P.M. (1999) · Implementation Intentions"
              stat="91%"
              statLabel="of intentions with when/where succeed"
              quote="'I will do X at time Y in location Z' is 2–3× more likely to happen than 'I intend to do X.' Natural language planning triggers this automatically."
              delay={0.4}
            />
            <ResearchCard
              citation="Baumeister & Tierney (2011) · Willpower Research"
              stat="40%"
              statLabel="of daily decisions happen on autopilot"
              quote="Decision fatigue depletes willpower. Systems that capture tasks instantly — before the thought is lost — conserve mental energy for execution."
              delay={0.5}
            />
          </div>

          {/* Pomodoro deep-dive */}
          <Reveal>
            <div className="rounded-3xl border p-8 md:p-10"
              style={{ background: 'rgba(19,185,109,0.04)', borderColor: 'rgba(19,185,109,0.2)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.38em] mb-3" style={{ color: '#4E9972' }}>the pomodoro effect</p>
                  <h3 className="text-2xl font-serif italic mb-4" style={{ color: '#E2F4EC' }}>
                    Why 25 minutes is the magic number.
                  </h3>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Francesco Cirillo developed the Pomodoro Technique in the late 1980s while studying at university.
                    The 25-minute interval wasn't arbitrary — it aligns with the human ultradian rhythm, the 90–120 minute
                    biological cycle that governs energy and focus. Each 25-minute sprint hits the peak of a mini-cycle before the dip.
                  </p>
                  <div className="space-y-3">
                    {[
                      { icon: '🧠', text: 'Interruptions take 23 minutes to recover from (Gloria Mark, UC Irvine)' },
                      { icon: '⏱️', text: 'Short breaks prevent vigilance decrement — attention fatigue that builds invisibly' },
                      { icon: '🔥', text: 'The transition ritual (timer → task) trains the brain\'s prefrontal cortex to focus on demand' },
                    ].map(({ icon, text }) => (
                      <div key={text} className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">{icon}</span>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Mini timer viz */}
                <div className="flex flex-col items-center gap-5">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 192 192" className="w-full h-full" style={{ overflow: 'visible' }}>
                      <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(19,185,109,0.1)" strokeWidth="8" />
                      <motion.circle cx="96" cy="96" r="80" fill="none" stroke="#13B96D" strokeWidth="8"
                        strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 80}`}
                        animate={{ strokeDashoffset: [2 * Math.PI * 80, 0, 2 * Math.PI * 80] }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                        transform="rotate(-90 96 96)"
                        style={{ filter: 'drop-shadow(0 0 12px rgba(19,185,109,0.7))' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Timer className="w-8 h-8 mb-2" style={{ color: '#13B96D' }} />
                      <span className="text-4xl font-light font-serif" style={{ color: '#E2F4EC', letterSpacing: '-0.04em' }}>25:00</span>
                      <span className="text-[9px] font-mono uppercase tracking-widest mt-1" style={{ color: '#4E9972' }}>one pomodoro</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 w-full">
                    {[
                      { label: 'Focus sprint', val: '25 min', color: '#13B96D' },
                      { label: 'Short break',  val: '5 min',  color: '#3B82F6' },
                      { label: 'Long break',   val: '15 min', color: '#8B5CF6' },
                    ].map(s => (
                      <div key={s.label} className="text-center p-2.5 rounded-2xl border"
                        style={{ background: `${s.color}10`, borderColor: `${s.color}30` }}>
                        <p className="text-xs font-black mb-0.5" style={{ color: s.color }}>{s.val}</p>
                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURES — interactive tabs
      ══════════════════════════════════════════════ */}
      <section id="features" className="py-28 px-6" style={{ background: '#EDF8F2' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.42em] mb-4" style={{ color: '#13B96D' }}>what's inside</p>
            <h2 className="text-4xl sm:text-5xl font-serif italic tracking-tight leading-tight" style={{ color: '#1A3240' }}>
              Four systems.<br />One calm space.
            </h2>
          </Reveal>
          <FeatureTabs dark={false} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════ */}
      <section id="how" className="py-28 px-6 border-t" style={{ background: '#F2FBF6', borderColor: '#D4EAE0' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.42em] mb-4" style={{ color: '#13B96D' }}>how it works</p>
            <h2 className="text-4xl sm:text-5xl font-serif italic tracking-tight" style={{ color: '#1A3240' }}>
              Zero learning curve.<br />Real results.
            </h2>
          </Reveal>

          {/* Steps */}
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[16.666%] right-[16.666%] h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #D4EAE0 20%, #D4EAE0 80%, transparent)' }} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  n: '01', icon: <Brain className="w-6 h-6" />, title: 'Brain dump anything',
                  desc: 'Open the app. Type what\'s in your head — messy, incomplete, mid-sentence. The parser handles the rest.',
                  examples: ['"review PRs tomorrow morning"', '"dentist appt 23rd at 4pm"', '"gym every tuesday 6am"'],
                },
                {
                  n: '02', icon: <Layers className="w-6 h-6" />, title: 'It organises instantly',
                  desc: 'Date, time, priority, tags, and recurrence are extracted automatically. Tasks land in the right view.',
                  examples: ['📅 Date detected', '⚡ Priority set', '#tags inferred'],
                },
                {
                  n: '03', icon: <Zap className="w-6 h-6" />, title: 'Focus and execute',
                  desc: 'Use Deep Work mode for tunnel vision. Start a Pomodoro linked to a task. Review your week every Sunday.',
                  examples: ['🔥 Flow state timer', '🏆 Habit streaks', '📊 Weekly review'],
                },
              ].map(({ n, icon, title, desc, examples }, i) => (
                <Reveal key={n} delay={i * 0.12}>
                  <div className="relative">
                    {/* Step circle */}
                    <div className="flex justify-center md:justify-start mb-5">
                      <div className="w-16 h-16 rounded-3xl flex flex-col items-center justify-center relative"
                        style={{ background: 'rgba(19,185,109,0.1)', border: '1px solid rgba(19,185,109,0.25)' }}>
                        <div style={{ color: '#13B96D' }}>{icon}</div>
                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center"
                          style={{ background: '#13B96D', color: '#fff' }}>{n.replace('0','')}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-center md:text-left" style={{ color: '#1A3240' }}>{title}</h3>
                    <p className="text-sm leading-relaxed mb-4 text-center md:text-left" style={{ color: '#4A7568' }}>{desc}</p>
                    <div className="space-y-1.5">
                      {examples.map(ex => (
                        <div key={ex} className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                          style={{ background: 'rgba(255,255,255,0.7)', borderColor: '#D4EAE0' }}>
                          <span className="text-xs font-mono" style={{ color: '#4A7568' }}>{ex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Cmd+K callout */}
          <Reveal delay={0.3}>
            <div className="mt-16 p-6 rounded-3xl border flex flex-col sm:flex-row items-center gap-5"
              style={{ background: 'rgba(255,255,255,0.7)', borderColor: '#D4EAE0' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(19,185,109,0.1)' }}>
                <Command className="w-5 h-5" style={{ color: '#13B96D' }} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-base font-bold mb-1" style={{ color: '#1A3240' }}>Power users love ⌘K</p>
                <p className="text-sm" style={{ color: '#4A7568' }}>
                  Press Cmd+K (or Ctrl+K) from anywhere to instantly search tasks, switch views, or jump to a habit.
                  No mouse. No clicks. Pure keyboard flow.
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <kbd className="px-2 py-1 rounded-lg text-xs font-mono border" style={{ background: '#1A3240', color: '#E2F4EC', borderColor: 'transparent' }}>⌘</kbd>
                <kbd className="px-2 py-1 rounded-lg text-xs font-mono border" style={{ background: '#1A3240', color: '#E2F4EC', borderColor: 'transparent' }}>K</kbd>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════ */}
      <section id="pricing" className="py-28 px-6 border-t" style={{ background: '#EDF8F2', borderColor: '#D4EAE0' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.42em] mb-4" style={{ color: '#13B96D' }}>pricing</p>
            <h2 className="text-4xl sm:text-5xl font-serif italic tracking-tight mb-4" style={{ color: '#1A3240' }}>
              Simple. Honest. Fair.
            </h2>
            <p className="text-base max-w-lg mx-auto leading-relaxed" style={{ color: '#4A7568' }}>
              Start free and stay free as long as you want. Upgrade when you need recurring tasks and AI parsing.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Pricing onSignup={onSignup} />
          </Reveal>

          {/* Trust signals */}
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs" style={{ color: '#84ADA4' }}>
              {['No credit card required', 'Cancel anytime', 'Data export always available', 'Free plan never expires'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#13B96D' }} />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════ */}
      <section id="faq" className="py-24 px-6 border-t" style={{ background: '#F2FBF6', borderColor: '#D4EAE0' }}>
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.42em] mb-4" style={{ color: '#13B96D' }}>FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-serif italic tracking-tight" style={{ color: '#1A3240' }}>
              Questions people actually ask.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <FAQ dark={false} />
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          DARK CTA
      ══════════════════════════════════════════════ */}
      <section className="relative py-36 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060F0B 0%, #0B1E14 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />
        <motion.div className="absolute rounded-full blur-[140px] pointer-events-none"
          style={{ width: 600, height: 600, top: '-20%', left: '25%', background: 'rgba(19,185,109,0.09)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <Reveal>
            <p className="text-[10px] font-mono uppercase tracking-[0.42em] mb-5" style={{ color: '#4E9972' }}>
              your brain deserves better
            </p>
            <h2 className="font-serif italic tracking-tight leading-[0.92] mb-6"
              style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)', color: '#E8F5EE' }}>
              Start building<br />
              <span style={{ color: '#13B96D' }}>a better system.</span>
            </h2>
            <p className="text-base mb-10 max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Free. No card. No tutorial. Open it and type. That's the whole onboarding.
            </p>
            <button onClick={onSignup}
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-bold transition-all duration-300 active:scale-95"
              style={{ background: '#13B96D', color: '#fff', boxShadow: '0 0 60px rgba(19,185,109,0.5)' }}>
              Get started free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="mt-5 text-[10px] font-mono uppercase tracking-[0.35em]" style={{ color: '#2B5C42' }}>
              no credit card · free plan · no expiry
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="py-10 px-6 md:px-10 border-t" style={{ background: '#EDF8F2', borderColor: '#D4EAE0' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <BrandLogo className="h-9 w-9 rounded-xl p-1.5 border border-[#C8E6D8] bg-white/80" alt="IntentList" />
                <span className="font-black text-base tracking-[-0.02em]" style={{ color: '#1A3240' }}>IntentList</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#84ADA4' }}>
                A calm, intelligent productivity tool built on real psychology. Tasks, habits, focus, and weekly review in one place.
              </p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              {[
                { heading: 'Product', links: [
                  { label: 'Features',     href: '#features' },
                  { label: 'How it works', href: '#how'      },
                  { label: 'Pricing',      href: '#pricing'  },
                ]},
                { heading: 'Learn', links: [
                  { label: 'The Science',  href: '#science'  },
                  { label: 'FAQ',          href: '#faq'      },
                ]},
                { heading: 'Account', links: [
                  { label: 'Sign up',  href: '#', action: onSignup },
                  { label: 'Sign in',  href: '#', action: onLogin  },
                ]},
              ].map(col => (
                <div key={col.heading}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.32em] mb-3" style={{ color: '#84ADA4' }}>{col.heading}</p>
                  <ul className="space-y-2">
                    {col.links.map(l => (
                      <li key={l.label}>
                        <a href={l.href}
                          onClick={e => { e.preventDefault(); if (l.action) { l.action(); } else { document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }); } }}
                          className="transition-colors cursor-pointer" style={{ color: '#4A7568' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#13B96D')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#4A7568')}>
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t" style={{ borderColor: '#D4EAE0' }}>
            <p className="text-xs" style={{ color: '#84ADA4' }}>
              © {new Date().getFullYear()} IntentList. Built with intention.
            </p>
            <div className="flex items-center gap-1" style={{ color: '#84ADA4' }}>
              <span className="text-xs">Made with</span>
              <span className="text-red-400">♥</span>
              <span className="text-xs">and too many Pomodoros.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
