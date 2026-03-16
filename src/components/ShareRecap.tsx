/**
 * ShareRecap.tsx
 * Generates a beautiful, shareable weekly recap card.
 * Uses html2canvas via CDN to export as PNG, then offers download + share.
 */
import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isSameDay, subDays } from 'date-fns';
import { Share2, Download, X, Check, Flame, Target, BarChart3, Zap } from 'lucide-react';
import { cn } from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareRecapProps {
  tasks: Task[];
  userEmail: string;
  streak?: number;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStats(tasks: Task[]) {
  const today    = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(today, { weekStartsOn: 1 });

  const thisWeek  = tasks.filter(t => isWithinInterval(parseISO(t.date), { start: weekStart, end: weekEnd }));
  const done      = thisWeek.filter(t => t.completed);
  const rate      = thisWeek.length > 0 ? Math.round((done.length / thisWeek.length) * 100) : 0;

  // top tags
  const tagMap = new Map<string, number>();
  done.forEach(t => t.tags.forEach(tag => tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)));
  const topTags = Array.from(tagMap.entries()).sort((a,b) => b[1]-a[1]).slice(0,3).map(([tag]) => tag);

  // day-by-day
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(weekEnd, 6 - i);
    const dayTasks = thisWeek.filter(t => isSameDay(parseISO(t.date), d));
    return {
      label: format(d, 'EEE').slice(0,2),
      total: dayTasks.length,
      done: dayTasks.filter(t => t.completed).length,
      isToday: isSameDay(d, today),
    };
  });

  return {
    total: thisWeek.length,
    done: done.length,
    rate,
    topTags,
    days,
    weekLabel: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
  };
}

// ─── The Card (renders both on screen and is exported) ─────────────────────────

const RecapCard: React.FC<{
  stats: ReturnType<typeof getWeekStats>;
  name: string;
  streak: number;
  cardRef: React.RefObject<HTMLDivElement>;
}> = ({ stats, name, streak, cardRef }) => {
  const maxDay = Math.max(1, ...stats.days.map(d => d.total));

  return (
    <div ref={cardRef}
      className="relative overflow-hidden rounded-3xl"
      style={{
        width: 420,
        background: 'linear-gradient(150deg, #060F0B 0%, #0C1E15 100%)',
        padding: '32px',
        fontFamily: "'Manrope', sans-serif",
      }}>
      {/* Grid texture */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Orb */}
      <div style={{ position: 'absolute', top: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(19,185,109,0.1)', filter: 'blur(80px)' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#4E9972', marginBottom: 4 }}>
              IntentList · Weekly Recap
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{stats.weekLabel}</p>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(19,185,109,0.15)', border: '1px solid rgba(19,185,109,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#13B96D', fontSize: 18 }}>✓</span>
          </div>
        </div>

        {/* Name + headline */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#E8F5EE', letterSpacing: '-0.02em', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic', lineHeight: 1.1, marginBottom: 6 }}>
            {name}'s week.
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            {stats.done} tasks completed · {stats.rate}% completion rate
          </p>
        </div>

        {/* Big stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { icon: '✓',  label: 'Done',   value: String(stats.done),  color: '#13B96D' },
            { icon: '🔥', label: 'Streak', value: String(streak) + 'd', color: '#F59E0B' },
            { icon: '📊', label: 'Rate',   value: stats.rate + '%',     color: '#3B82F6' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '14px 12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Daily breakdown</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 }}>
            {stats.days.map(d => (
              <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 44 }}>
                  {d.total > 0 ? (
                    <div style={{ width: '100%', borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', height: `${Math.max(6, (d.total / maxDay) * 44)}px` }}>
                      <div style={{ width: '100%', height: `${d.total > 0 ? (d.done / d.total) * 100 : 0}%`, background: 'linear-gradient(to top, #13B96D, #5FD4A0)', borderRadius: 4, minHeight: d.done > 0 ? 4 : 0 }} />
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
                  )}
                </div>
                <p style={{ fontSize: 9, color: d.isToday ? '#13B96D' : 'rgba(255,255,255,0.25)', fontWeight: d.isToday ? 700 : 400 }}>{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {stats.topTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {stats.topTags.map(tag => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 100, background: 'rgba(19,185,109,0.15)', color: '#13B96D', letterSpacing: '0.02em' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>intentlist.app</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ShareRecap: React.FC<ShareRecapProps> = ({ tasks, userEmail, streak = 0, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const name    = userEmail.split('@')[0];
  const stats   = useMemo(() => getWeekStats(tasks), [tasks]);

  const downloadCard = async () => {
    setDownloading(true);
    try {
      // Dynamically load html2canvas from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => { script.onload = resolve; });

      const h2c = (window as any).html2canvas;
      const canvas = await h2c(cardRef.current!, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `intentlist-week-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const copyText = async () => {
    const text = `📊 My week on IntentList:\n✅ ${stats.done} tasks done · ${stats.rate}% completion\n🔥 ${streak} day streak\n${stats.topTags.length ? '🏷️ ' + stats.topTags.map(t => '#'+t).join(' ') : ''}\n\ntry intentlist.app`;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>

        <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-5 max-w-[460px] w-full">

          {/* Card preview */}
          <div className="overflow-hidden rounded-3xl shadow-2xl" style={{ boxShadow: '0 0 60px rgba(19,185,109,0.25)' }}>
            <RecapCard stats={stats} name={name} streak={streak} cardRef={cardRef as React.RefObject<HTMLDivElement>} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full">
            <button onClick={downloadCard} disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/15 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.07)' }}>
              <Download className="w-4 h-4" />
              {downloading ? 'Exporting…' : 'Download PNG'}
            </button>

            <button onClick={copyText}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
              style={{ background: copied ? '#0D8A4E' : '#13B96D', boxShadow: '0 0 24px rgba(19,185,109,0.4)' }}>
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Share2 className="w-4 h-4" /> Copy for sharing</>}
            </button>
          </div>

          {/* Stats context */}
          <div className="grid grid-cols-3 gap-3 w-full text-center">
            {[
              { icon: <Check className="w-4 h-4" />, label: 'Tasks done',    value: stats.done,         color: '#13B96D' },
              { icon: <Target className="w-4 h-4" />, label: 'Completion',   value: `${stats.rate}%`,   color: '#3B82F6' },
              { icon: <Flame className="w-4 h-4" />,  label: 'Day streak',   value: `${streak}d`,       color: '#F59E0B' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="py-3 rounded-2xl border border-white/10"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
                <p className="text-lg font-black" style={{ color }}>{value}</p>
                <p className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
              </div>
            ))}
          </div>

          <button onClick={onClose} className="text-xs font-mono uppercase tracking-[0.28em] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
            <X className="w-3 h-3" /> Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
