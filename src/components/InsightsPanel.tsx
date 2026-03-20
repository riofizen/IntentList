/**
 * InsightsPanel.tsx
 * Full productivity insights for Pro users.
 * Free users see blurred cards with real numbers visible — the pain of not knowing
 * is the conversion trigger.
 */
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Task } from '../types';
import { generateInsights, type ProductivityInsight } from '../lib/insights';
import { Lock, Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Star, Target, Flame, Brain } from 'lucide-react';
import { cn } from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightsPanelProps {
  tasks: Task[];
  isPro: boolean;
  onUpgrade: () => void;
  compact?: boolean; // for sidebar / context panel
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; label: string; color: string; size?: number }> = ({
  score, label, color, size = 96,
}) => {
  const r   = size / 2 - 6;
  const c   = size / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - score / 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
        <motion.circle cx={c} cy={c} r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums" style={{ color, lineHeight: 1 }}>{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color: '#84ADA4' }}>{label}</span>
      </div>
    </div>
  );
};

// ─── Insight Card ─────────────────────────────────────────────────────────────

const InsightCard: React.FC<{
  insight: ProductivityInsight;
  isPro: boolean;
  onUpgrade: () => void;
  delay?: number;
}> = ({ insight, isPro, onUpgrade, delay = 0 }) => {
  const locked = insight.isPro && !isPro;

  const iconMap = {
    warning:  <AlertTriangle className="w-4 h-4" />,
    pattern:  <Brain className="w-4 h-4" />,
    win:      <CheckCircle2 className="w-4 h-4" />,
    risk:     <Flame className="w-4 h-4" />,
    capacity: <Target className="w-4 h-4" />,
  };

  const colorMap = {
    warning:  '#F59E0B',
    pattern:  '#8B5CF6',
    win:      '#13B96D',
    risk:     '#EF4444',
    capacity: '#3B82F6',
  };

  const color = colorMap[insight.type];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl border overflow-hidden"
      style={{ background: `${color}08`, borderColor: `${color}25` }}>

      {/* Lock overlay for Pro content */}
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 cursor-pointer"
          style={{ backdropFilter: 'blur(6px)', background: 'rgba(242,251,246,0.85)' }}
          onClick={onUpgrade}>
          <Lock className="w-5 h-5" style={{ color: '#13B96D' }} />
          <span className="text-xs font-bold text-[#13B96D]">Pro insight</span>
          <span className="text-[10px] text-[#84ADA4] text-center px-4">Upgrade to unlock your personal patterns</span>
        </div>
      )}

      <div className={cn('p-4', locked && 'filter blur-[2px] select-none pointer-events-none')}>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, color }}>
            {iconMap[insight.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-[#1A3240] leading-tight">{insight.title}</p>
              {insight.isPro && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0"
                  style={{ background: 'rgba(19,185,109,0.12)', color: '#0D8A4E' }}>Pro</span>
              )}
            </div>
            <p className="text-xs text-[#4A7568] leading-relaxed">{insight.body}</p>
            {insight.stat && (
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-xl font-black" style={{ color }}>{insight.stat}</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#84ADA4]">{insight.statLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Day bar mini chart ───────────────────────────────────────────────────────

const DayBars: React.FC<{ data: Array<{ day: string; rate: number; isPeak: boolean; isWorst: boolean }> }> = ({ data }) => (
  <div className="flex items-end gap-1.5">
    {data.map(({ day, rate, isPeak, isWorst }) => (
      <div key={day} className="flex-1 flex flex-col items-center gap-1">
        <motion.div className="w-full rounded-sm transition-all"
          style={{
            height: `${Math.max(4, rate * 0.44)}px`,
            background: isPeak ? '#13B96D' : isWorst ? '#EF4444' : 'rgba(0,0,0,0.08)',
          }}
          initial={{ height: 0 }} animate={{ height: `${Math.max(4, rate * 0.44)}px` }}
          transition={{ duration: 0.6, delay: 0.1 }} />
        <span className="text-[8px] font-mono" style={{ color: isPeak ? '#13B96D' : isWorst ? '#EF4444' : '#84ADA4' }}>
          {day}
        </span>
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  tasks, isPro, onUpgrade, compact = false,
}) => {
  const report = useMemo(() => generateInsights(tasks), [tasks]);

  const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  if (report.totalTasks < 3) {
    return (
      <div className="p-4 rounded-2xl border border-[#D4EAE0] text-center">
        <Brain className="w-8 h-8 mx-auto mb-2 text-[#84ADA4]" />
        <p className="text-sm font-semibold text-[#4A7568]">Not enough data yet</p>
        <p className="text-xs text-[#84ADA4] mt-1">Add and complete tasks across a few days to unlock your productivity profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Score + overview */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl border"
        style={{ background: `${report.scoreColor}08`, borderColor: `${report.scoreColor}25` }}>
        <div className="flex items-center gap-4">
          <ScoreRing score={report.score} label="Score" color={report.scoreColor} size={compact ? 72 : 88} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-black" style={{ color: report.scoreColor }}>{report.scoreLabel}</span>
              {!isPro && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer"
                  style={{ background: 'rgba(19,185,109,0.12)', color: '#0D8A4E' }}
                  onClick={onUpgrade}>
                  Full report → Pro
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                { label: '7-day rate', value: `${report.completionRate7d}%` },
                { label: 'Today',      value: `${report.todayDone}/${report.todayCount}` },
                { label: 'Overdue',    value: report.overdueAging > 0 ? `${report.overdueAging} aging` : 'Clear ✓' },
                { label: 'Capacity',   value: report.todayCapacity },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-[#84ADA4]">{label}</p>
                  <p className="text-sm font-bold text-[#1A3240]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Peak / worst day — blurred for free */}
      <div className={cn('relative rounded-2xl border p-4 overflow-hidden',)}>
        {!isPro && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 cursor-pointer rounded-2xl"
            style={{ backdropFilter: 'blur(5px)', background: 'rgba(242,251,246,0.88)' }}
            onClick={onUpgrade}>
            <Lock className="w-4 h-4 text-[#13B96D]" />
            <div>
              <p className="text-sm font-bold text-[#1A3240]">Your performance patterns</p>
              <p className="text-xs text-[#84ADA4]">Pro shows peak day, worst day, and tag breakdown</p>
            </div>
            <button className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
              style={{ background: '#13B96D' }}>
              Unlock
            </button>
          </div>
        )}

        <div className={cn(!isPro && 'filter blur-sm select-none pointer-events-none')}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#84ADA4]">Day of week</p>
            <div className="flex items-center gap-3 text-[9px] font-mono uppercase tracking-widest">
              <span className="flex items-center gap-1" style={{ color: '#13B96D' }}>
                <div className="w-2 h-2 rounded-full bg-[#13B96D]" /> Peak: {report.peakDay}
              </span>
              <span className="flex items-center gap-1" style={{ color: '#EF4444' }}>
                <div className="w-2 h-2 rounded-full bg-[#EF4444]" /> Weak: {report.worstDay}
              </span>
            </div>
          </div>
          <DayBars data={DAY_SHORT.map((d, i) => ({
            day: d,
            rate: i === ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(report.peakDay) ? 85 :
                  i === ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(report.worstDay) ? 28 :
                  40 + Math.sin(i * 1.3) * 20,
            isPeak:  d === DAY_SHORT[['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(report.peakDay)],
            isWorst: d === DAY_SHORT[['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(report.worstDay)],
          }))} />
        </div>
      </div>

      {/* Tag breakdown — blurred for free */}
      {(report.bestTag || report.worstTag) && (
        <div className="relative rounded-2xl border p-4 overflow-hidden" style={{ borderColor: '#D4EAE0' }}>
          {!isPro && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 cursor-pointer rounded-2xl"
              style={{ backdropFilter: 'blur(5px)', background: 'rgba(242,251,246,0.88)' }}
              onClick={onUpgrade}>
              <Lock className="w-4 h-4 text-[#13B96D]" />
              <div>
                <p className="text-sm font-bold text-[#1A3240]">Tag completion rates</p>
                <p className="text-xs text-[#84ADA4]">See which areas you're excelling and avoiding</p>
              </div>
            </div>
          )}
          <div className={cn(!isPro && 'filter blur-sm select-none pointer-events-none')}>
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#84ADA4] mb-3">Tag breakdown</p>
            <div className="space-y-2.5">
              {[
                { tag: report.bestTag,  rate: report.bestTagRate,  color: '#13B96D', label: 'strongest' },
                { tag: report.worstTag, rate: report.worstTagRate, color: '#EF4444', label: 'weakest'   },
              ].filter(r => r.tag).map(({ tag, rate, color, label }) => (
                <div key={tag!}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#1A3240]">#{tag}</span>
                    <span className="text-[10px] font-mono" style={{ color }}>
                      {rate}% · {label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#E4EEE9] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${rate}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Individual insight cards */}
      <div className="space-y-2.5">
        {report.insights.slice(0, compact ? 2 : 5).map((insight, i) => (
          <InsightCard key={i} insight={insight} isPro={isPro} onUpgrade={onUpgrade} delay={i * 0.08} />
        ))}
      </div>

      {/* CTA for free users */}
      {!isPro && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          onClick={onUpgrade}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #13B96D, #0D8A4E)', boxShadow: '0 0 24px rgba(19,185,109,0.3)' }}>
          Unlock full insights → Pro
        </motion.button>
      )}
    </div>
  );
};
