/**
 * ProModal.tsx
 * The upgrade modal. Shows real calculated insights from the user's OWN data.
 * The hook: they can see a number about themselves that they can't act on without Pro.
 * Generic copy is replaced by personal analysis.
 */
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Lock, Zap, TrendingUp, Brain, Flame, AlertTriangle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Task } from '../types';
import { generateInsights } from '../lib/insights';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  tasks?: Task[];
}

// ─── Blurred stat ─────────────────────────────────────────────────────────────

const BlurredStat: React.FC<{
  visible: string;
  locked: string;
  color?: string;
}> = ({ visible, locked, color = '#13B96D' }) => (
  <div className="rounded-2xl border p-4 relative overflow-hidden"
    style={{ background: `${color}06`, borderColor: `${color}20` }}>
    <p className="text-base font-semibold text-[#1A3240] mb-1">{visible}</p>
    <div className="relative">
      <p className="text-sm text-[#4A7568] leading-relaxed" style={{ filter: 'blur(4px)', userSelect: 'none' }}>
        {locked}
      </p>
      <div className="absolute inset-0 flex items-center gap-1.5">
        <Lock className="w-3 h-3 flex-shrink-0" style={{ color }} />
        <span className="text-xs font-bold" style={{ color }}>Pro insight locked</span>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose, onUpgrade, tasks = [] }) => {
  const report = useMemo(() => generateInsights(tasks), [tasks]);
  const hasData = report.totalTasks >= 5;

  // Pick the most impactful hook based on their data
  const hook = useMemo(() => {
    if (!hasData) return null;

    if (report.carryForwardCount > 0) {
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        color: '#F59E0B',
        stat: String(report.carryForwardCount),
        statLabel: `ghost task${report.carryForwardCount > 1 ? 's' : ''} on your list`,
        visible: `You have ${report.carryForwardCount} task${report.carryForwardCount > 1 ? 's' : ''} that ${report.carryForwardCount > 1 ? 'have' : 'has'} been sitting for 14+ days.`,
        locked: `Pro tells you exactly which ones to delete, which to break down, and which are secretly important.`,
      };
    }
    if (report.overdueAging > 0) {
      return {
        icon: <Flame className="w-5 h-5" />,
        color: '#EF4444',
        stat: String(report.overdueAging),
        statLabel: 'tasks overdue 7+ days',
        visible: `${report.overdueAging} task${report.overdueAging > 1 ? 's' : ''} have been overdue for over a week.`,
        locked: `Tasks this old have < 10% chance of completion. Pro shows the pattern behind why they keep slipping.`,
      };
    }
    if (report.completionRate7d > 0) {
      return {
        icon: <TrendingUp className="w-5 h-5" />,
        color: '#13B96D',
        stat: `${report.completionRate7d}%`,
        statLabel: '7-day completion',
        visible: `Your completion rate this week is ${report.completionRate7d}%.`,
        locked: `Pro shows your peak day (${report.peakDay}), weakest day, and which tag you're avoiding most.`,
      };
    }
    return null;
  }, [report, hasData]);

  const PRO_FEATURES = [
    { icon: <Brain className="w-4 h-4" />,      label: 'Personal productivity score',         desc: 'Calculated from your patterns, updated daily' },
    { icon: <TrendingUp className="w-4 h-4" />, label: 'Peak day & tag analytics',             desc: 'Know exactly when and where you perform best' },
    { icon: <AlertTriangle className="w-4 h-4" />, label: 'Ghost task detection',               desc: 'Find the tasks you keep avoiding before they pile up' },
    { icon: <Zap className="w-4 h-4" />,         label: 'Recurring tasks',                     desc: 'Daily, weekly, monthly — auto-generated forever' },
    { icon: <Check className="w-4 h-4" />,       label: 'Unlimited tasks',                     desc: 'No 50-task cap. Plan as far ahead as you want' },
    { icon: <Flame className="w-4 h-4" />,       label: 'AI-enhanced parsing',                 desc: 'Smarter understanding of natural language inputs' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#060F0B]/50 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 overflow-hidden rounded-[2.5rem] shadow-2xl"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Header — dark */}
            <div className="relative px-8 pt-8 pb-6 overflow-hidden"
              style={{ background: 'linear-gradient(160deg, #060F0B 0%, #0C1E15 100%)' }}>
              {/* Grid */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
              {/* Orb */}
              <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ background: 'rgba(19,185,109,0.15)' }} />

              <div className="relative z-10 flex items-start justify-between mb-5">
                <motion.div initial={{ rotate: -12, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'backOut' }}
                  className="w-14 h-14 rounded-2xl border p-3 shadow-xl"
                  style={{ borderColor: 'rgba(19,185,109,0.3)', background: 'rgba(19,185,109,0.12)' }}>
                  <BrandLogo />
                </motion.div>
                <button onClick={onClose}
                  className="p-2.5 rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative z-10">
                <p className="text-[10px] font-mono uppercase tracking-[0.4em] mb-2" style={{ color: '#4E9972' }}>
                  IntentList Pro
                </p>
                <h2 className="text-3xl font-serif italic leading-tight mb-2" style={{ color: '#E8F5EE' }}>
                  {hasData ? 'We see a pattern\nin your data.' : 'Unlock your full\nproductivity picture.'}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {hasData
                    ? 'Pro turns your task history into a personal productivity coach.'
                    : 'Advanced analytics, recurring tasks, and unlimited everything.'}
                </p>
              </div>
            </div>

            {/* Body — light */}
            <div className="px-8 py-6 space-y-5" style={{ background: '#F2FBF6' }}>

              {/* Hook: real data teaser */}
              {hook ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <p className="text-[9px] font-mono uppercase tracking-[0.32em] text-[#84ADA4] mb-2">Based on your data</p>
                  <BlurredStat
                    visible={hook.visible}
                    locked={hook.locked}
                    color={hook.color}
                  />
                  {/* Visible stat */}
                  <div className="flex items-baseline gap-2 mt-3 px-1">
                    <span className="text-3xl font-black tabular-nums" style={{ color: hook.color }}>{hook.stat}</span>
                    <span className="text-sm text-[#4A7568]">{hook.statLabel}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="p-4 rounded-2xl border text-center"
                  style={{ background: 'rgba(19,185,109,0.06)', borderColor: 'rgba(19,185,109,0.2)' }}>
                  <p className="text-sm font-semibold text-[#1A3240] mb-1">Add tasks to unlock your profile</p>
                  <p className="text-xs text-[#4A7568]">Complete 5+ tasks and Pro will show you your personal productivity patterns.</p>
                </motion.div>
              )}

              {/* Feature list */}
              <div className="space-y-2.5">
                <p className="text-[9px] font-mono uppercase tracking-[0.32em] text-[#84ADA4]">Everything in Pro</p>
                {PRO_FEATURES.map(({ icon, label, desc }, i) => (
                  <motion.div key={label}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.06 }}
                    className="flex items-start gap-3 p-3 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.8)', borderColor: '#D4EAE0' }}>
                    <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: 'rgba(19,185,109,0.12)', color: '#0D8A4E' }}>
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1A3240] leading-tight">{label}</p>
                      <p className="text-[11px] text-[#84ADA4] mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="space-y-2.5 pt-1">
                <button onClick={onUpgrade}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all duration-300 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #13B96D, #0D8A4E)', boxShadow: '0 0 30px rgba(19,185,109,0.35)' }}>
                  Go Pro — $5/month
                </button>
                <button onClick={onClose}
                  className="w-full py-3.5 text-sm font-medium text-[#84ADA4] hover:text-[#1A3240] transition-colors">
                  Maybe later
                </button>
              </div>

              <p className="text-center text-[10px] font-mono uppercase tracking-[0.35em] text-[#84ADA4]">
                7-day free trial · cancel anytime · data always yours
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
