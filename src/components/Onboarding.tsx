/**
 * Onboarding.tsx
 * 3-step first-run experience. One-time only. Skippable.
 * Goal: get user to (1) feel at home, (2) add a habit, (3) add a task.
 * Each step is self-contained and takes < 20 seconds.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, X, Dumbbell, Brain, Droplets, BookOpen, Sun, Zap } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { parseIntent } from '../lib/parser';
import type { ParsedIntent } from '../lib/parser';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingResult {
  name: string;
  habit?: { name: string; icon: string; color: string };
  firstTask?: ParsedIntent;
}

interface OnboardingProps {
  userEmail: string;
  onComplete: (result: OnboardingResult) => void;
  onSkip: () => void;
}

// ─── Suggested habits ─────────────────────────────────────────────────────────

const HABIT_PICKS = [
  { name: 'Morning workout',    icon: 'dumbbell', color: 'green',  emoji: '💪' },
  { name: 'Read 20 minutes',    icon: 'book',     color: 'blue',   emoji: '📚' },
  { name: 'Drink 2L water',     icon: 'water',    color: 'teal',   emoji: '💧' },
  { name: 'Meditate',           icon: 'brain',    color: 'purple', emoji: '🧠' },
  { name: 'No phone before 9am',icon: 'sun',      color: 'orange', emoji: '☀️' },
  { name: 'Journal',            icon: 'book',     color: 'pink',   emoji: '📔' },
];

const TASK_EXAMPLES = [
  'finish the project proposal by friday',
  'call the client tomorrow at 3pm',
  'review pull requests this morning @work',
  'grocery run this evening @errands',
];

// ─── Progress dots ────────────────────────────────────────────────────────────

const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <motion.div key={i} animate={{ width: i === current ? 20 : 8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="h-2 rounded-full"
        style={{ background: i <= current ? '#13B96D' : '#D4EAE0' }} />
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const Onboarding: React.FC<OnboardingProps> = ({ userEmail, onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(userEmail.split('@')[0]);
  const [selectedHabit, setSelectedHabit] = useState<typeof HABIT_PICKS[0] | null>(null);
  const [taskInput, setTaskInput] = useState('');
  const [taskPreview, setTaskPreview] = useState<ParsedIntent | null>(null);
  const [taskExampleIdx, setTaskExampleIdx] = useState(0);

  const handleTaskInput = (val: string) => {
    setTaskInput(val);
    if (val.trim().length > 3) {
      setTaskPreview(parseIntent(val));
    } else {
      setTaskPreview(null);
    }
  };

  const tryExample = () => {
    const ex = TASK_EXAMPLES[taskExampleIdx % TASK_EXAMPLES.length];
    setTaskExampleIdx(i => i + 1);
    handleTaskInput(ex);
  };

  const finish = () => {
    onComplete({
      name,
      habit: selectedHabit ?? undefined,
      firstTask: taskInput.trim() ? parseIntent(taskInput) : undefined,
    });
  };

  const steps = [
    // ── Step 0: Welcome ──
    <motion.div key="step0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-6">
      <div className="flex justify-center">
        <motion.div initial={{ scale: 0.7, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: 'backOut' }}
          className="w-20 h-20 rounded-3xl border border-[#CDE6DB] bg-white/88 p-4 shadow-2xl shadow-[#13B96D]/20">
          <BrandLogo />
        </motion.div>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-serif italic text-[#1A3142] mb-2">Welcome to IntentList.</h1>
        <p className="text-sm text-[#4A7568] leading-relaxed">
          This takes 60 seconds. We'll set up your space so it feels like yours from day one.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase tracking-[0.28em] text-[#6B8D86]">
          What should we call you?
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(1)}
          className="w-full px-5 py-4 rounded-2xl bg-white border border-[#C8E6D8] text-[#1A3142] text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all placeholder:text-[#9AB8B0] placeholder:font-normal"
          placeholder="Your first name"
          autoFocus
        />
      </div>

      <button onClick={() => name.trim() && setStep(1)} disabled={!name.trim()}
        className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: '#13B96D', boxShadow: name.trim() ? '0 0 30px rgba(19,185,109,0.35)' : 'none' }}>
        Let's go, {name.trim() || '…'} <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>,

    // ── Step 1: Pick a habit ──
    <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-serif italic text-[#1A3142] mb-1">
          Pick one daily habit, {name}.
        </h2>
        <p className="text-sm text-[#4A7568]">
          Research shows tracking even one habit increases success by 3.5×. You can add more later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {HABIT_PICKS.map(h => (
          <motion.button key={h.name} whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedHabit(prev => prev?.name === h.name ? null : h)}
            className="flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200"
            style={{
              background: selectedHabit?.name === h.name ? 'rgba(19,185,109,0.1)' : 'rgba(255,255,255,0.8)',
              borderColor: selectedHabit?.name === h.name ? '#13B96D' : '#C8E6D8',
            }}>
            <span className="text-xl flex-shrink-0">{h.emoji}</span>
            <span className="text-sm font-semibold text-[#1A3142] leading-tight">{h.name}</span>
            {selectedHabit?.name === h.name && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-[#13B96D] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                </div>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-2.5">
        <button onClick={() => { setSelectedHabit(null); setStep(2); }}
          className="flex-1 py-3.5 rounded-2xl border border-[#C8E6D8] text-sm font-semibold text-[#4A7568] hover:bg-[#F2FBF6] transition-all">
          Skip for now
        </button>
        <button onClick={() => setStep(2)}
          className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm transition-all"
          style={{ background: selectedHabit ? '#13B96D' : '#84ADA4', boxShadow: selectedHabit ? '0 0 24px rgba(19,185,109,0.3)' : 'none' }}>
          {selectedHabit ? `Add "${selectedHabit.name}"` : 'Continue →'}
        </button>
      </div>
    </motion.div>,

    // ── Step 2: First task ──
    <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-serif italic text-[#1A3142] mb-1">
          Brain dump something right now.
        </h2>
        <p className="text-sm text-[#4A7568]">
          Just type naturally — dates, tags, priority — the parser figures it out.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#13B96D] animate-pulse" />
          <input
            value={taskInput}
            onChange={e => handleTaskInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && taskInput.trim() && finish()}
            placeholder="e.g. team meeting tomorrow 9am @work"
            className="w-full pl-9 pr-4 py-4 rounded-2xl bg-white border border-[#C8E6D8] text-[#1A3142] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#13B96D]/25 focus:border-[#13B96D]/50 transition-all placeholder:text-[#9AB8B0] placeholder:font-normal"
            autoFocus
          />
        </div>
        <button onClick={tryExample}
          className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#84ADA4] hover:text-[#13B96D] transition-colors">
          ↻ try an example
        </button>
      </div>

      {/* Live parse preview */}
      <AnimatePresence>
        {taskPreview && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-[#C8E6D8] p-4 space-y-3"
            style={{ background: 'rgba(19,185,109,0.04)' }}>
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#84ADA4]">parsed in real-time</p>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: taskPreview.priority === 'high' ? '#EF4444' : '#13B96D' }} />
              <p className="text-sm font-semibold text-[#1A3142]">{taskPreview.text}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '📅', value: taskPreview.date.toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' }) },
                ...(taskPreview.time ? [{ label: '⏰', value: taskPreview.time }] : []),
                ...(taskPreview.tags.length ? taskPreview.tags.map(t => ({ label: '#', value: t })) : []),
                { label: '⚡', value: taskPreview.priority },
              ].map(({ label, value }) => (
                <span key={value} className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(19,185,109,0.12)', color: '#0D8A4E' }}>
                  {label} {value}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2.5">
        <button onClick={() => { setTaskInput(''); setTaskPreview(null); finish(); }}
          className="flex-1 py-3.5 rounded-2xl border border-[#C8E6D8] text-sm font-semibold text-[#4A7568] hover:bg-[#F2FBF6] transition-all">
          Skip
        </button>
        <button onClick={finish}
          className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm transition-all"
          style={{
            background: taskInput.trim() ? '#13B96D' : '#84ADA4',
            boxShadow: taskInput.trim() ? '0 0 24px rgba(19,185,109,0.3)' : 'none',
          }}>
          {taskInput.trim() ? 'Start →' : 'Open app →'}
        </button>
      </div>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,15,11,0.75)', backdropFilter: 'blur(16px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-[2.5rem] border shadow-2xl overflow-hidden"
        style={{ background: '#F2FBF6', borderColor: '#C8E6D8' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-4">
          <StepDots current={step} total={3} />
          <button onClick={onSkip}
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.28em] text-[#84ADA4] hover:text-[#1A3142] transition-colors">
            <X className="w-3 h-3" /> Skip all
          </button>
        </div>

        {/* Step content */}
        <div className="px-7 pb-7 min-h-[380px]">
          <AnimatePresence mode="wait">
            {steps[step]}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
