/**
 * MobileBottomNav.tsx
 * Bottom tab navigation for mobile. Makes the PWA feel like a native app.
 * Shown only on mobile (< 1024px). Replaces the hamburger menu for primary navigation.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sunrise, Clock, CheckCircle2, Timer, Dumbbell,
  List, Sparkles, Plus,
} from 'lucide-react';
import { ViewType } from '../types';
import { cn } from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MobileBottomNavProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  overdueCount: number;
  isPro: boolean;
  onAddTask: () => void; // focus the InputBox
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const PRIMARY_TABS = [
  { id: 'digest'   as ViewType, icon: Sunrise,       label: 'Digest'  },
  { id: 'today'    as ViewType, icon: Clock,          label: 'Today'   },
  { id: 'overdue'  as ViewType, icon: CheckCircle2,   label: 'Overdue' },
  { id: 'habits'   as ViewType, icon: Dumbbell,       label: 'Habits'  },
  { id: 'pomodoro' as ViewType, icon: Timer,          label: 'Focus'   },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView, onViewChange, overdueCount, isPro, onAddTask,
}) => {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden">
      {/* Backdrop blur strip */}
      <div className="relative border-t border-[#D7ECE2]/80"
        style={{ background: 'rgba(242,251,246,0.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>

        {/* Safe area padding for iPhone */}
        <div className="flex items-center justify-around px-1 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">

          {PRIMARY_TABS.map(tab => {
            const Icon    = tab.icon;
            const isActive = activeView === tab.id;
            const showBadge = tab.id === 'overdue' && overdueCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className="relative flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition-all duration-200 min-w-[52px]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Active pill background */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: 'rgba(19,185,109,0.12)' }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon */}
                <div className="relative">
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-all duration-200',
                      isActive ? 'text-[#13B96D]' : 'text-[#84ADA4]'
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />

                  {/* Badge */}
                  {showBadge && (
                    <div className="absolute -top-1 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black text-white"
                      style={{ background: '#EF4444' }}>
                      {overdueCount > 9 ? '9+' : overdueCount}
                    </div>
                  )}

                  {/* Pro sparkle on insights */}
                  {tab.id === 'habits' && !isPro && (
                    <div className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(19,185,109,0.15)' }}>
                      <span className="text-[6px] font-black" style={{ color: '#0D8A4E' }}>P</span>
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  'text-[9px] font-semibold uppercase tracking-[0.12em] leading-none transition-all duration-200',
                  isActive ? 'text-[#13B96D]' : 'text-[#84ADA4]'
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
