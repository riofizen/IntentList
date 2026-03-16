import React from 'react';
import {
  Calendar as CalendarIcon, CheckCircle2, Clock, List, LogOut,
  History, Timer, Sunrise, BarChart3, LayoutTemplate, Crown,
  Dumbbell, Search, Command,
} from 'lucide-react';
import { ViewType } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BrandLogo } from './BrandLogo';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  counts: Record<ViewType, number>;
  onLogout: () => void;
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  className?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
  onOpenSearch?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView, onViewChange, counts, onLogout,
  tags, selectedTag, onTagSelect,
  className, isPro, onUpgrade, onOpenSearch,
}) => {
  const primaryItems = [
    { id: 'digest',    label: 'Daily Digest',  icon: Sunrise,      shortcut: 'D' },
    { id: 'today',     label: 'Today',          icon: Clock,        shortcut: 'T' },
    { id: 'overdue',   label: 'Overdue',        icon: CheckCircle2, shortcut: 'O' },
    { id: 'upcoming',  label: 'Upcoming',       icon: CalendarIcon, shortcut: 'U' },
  ];

  const secondaryItems = [
    { id: 'habits',    label: 'Habits',         icon: Dumbbell },
    { id: 'timeline',  label: 'Timeline',       icon: History },
    { id: 'all',       label: 'All Tasks',      icon: List,         shortcut: 'A' },
    { id: 'calendar',  label: 'Calendar',       icon: CalendarIcon },
    { id: 'weekly',    label: 'Weekly Review',  icon: BarChart3,    shortcut: 'W' },
    { id: 'pomodoro',  label: 'Focus Timer',    icon: Timer },
    { id: 'templates', label: 'Templates',      icon: LayoutTemplate },
  ];

  const renderItem = (item: { id: string; label: string; icon: React.ElementType; shortcut?: string }) => {
    const isActive = activeView === item.id && !selectedTag;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => { onViewChange(item.id as ViewType); onTagSelect(null); }}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-2xl transition-all duration-200 group',
          isActive
            ? 'bg-[#EAF7F1] text-[#12935A] shadow-sm ring-1 ring-[#CDE6DB]'
            : 'text-[#5E7B76] hover:bg-white/70 hover:text-[#1A3142]'
        )}
      >
        <div className="flex items-center gap-3.5">
          <Icon className={cn('w-4 h-4 transition-colors duration-200 flex-shrink-0',
            isActive ? 'text-[#12935A]' : 'text-[#8DAAA0] group-hover:text-[#4A6862]'
          )} />
          <span className="font-medium tracking-wide">{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {counts[item.id as ViewType] > 0 && (
            <span className={cn(
              'text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors duration-200',
              isActive ? 'bg-[#D8F0E4] text-[#0E784A]' : 'bg-[#E6F3EC] text-[#5F7F78] group-hover:bg-white group-hover:text-[#33524C]'
            )}>
              {counts[item.id as ViewType]}
            </span>
          )}
          {item.shortcut && (
            <kbd className={cn(
              'hidden xl:inline-flex text-[9px] font-mono px-1.5 py-0.5 rounded-md border transition-opacity duration-200 opacity-0 group-hover:opacity-100',
              isActive ? 'opacity-100 border-[#C4E0D0] text-[#12935A] bg-[#DFF5EA]' : 'border-[#D7EBE4] text-[#A4BFB9]'
            )}>
              {item.shortcut}
            </kbd>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className={cn('w-72 border-r border-[#D7ECE2]/85 h-full flex flex-col glass-sidebar relative z-20', className)}>

      {/* Logo */}
      <div className="p-6 flex items-center gap-3 pb-4">
        <BrandLogo className="h-10 w-10 shrink-0 rounded-2xl border border-[#CEE6DB] bg-white/88 p-2 shadow-lg shadow-[#13B96D]/10" />
        <div className="min-w-0">
          <h1 className="text-xl font-serif italic text-[#1A3142] tracking-tight leading-none">IntentList</h1>
          {isPro && (
            <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.25em] text-[#13B96D] mt-0.5">
              <Crown className="w-2.5 h-2.5" /> Pro
            </span>
          )}
        </div>
      </div>

      {/* Search / Cmd+K */}
      {onOpenSearch && (
        <div className="px-4 mb-3">
          <button onClick={onOpenSearch}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-[#D7ECE2] bg-white/60 text-[#7A9E96] hover:text-[#1A3142] hover:border-[#B7D9CC] hover:bg-white/80 transition-all duration-200 text-xs font-medium">
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left">Search tasks…</span>
            <kbd className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-md border border-[#D7ECE2] bg-white/80 text-[#A4BFB9]">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-5 pb-4">
        {/* Primary nav */}
        <nav className="space-y-0.5">
          {primaryItems.map(renderItem)}
        </nav>

        {/* Divider */}
        <div className="border-t border-[#D7ECE2]/60 mx-1" />

        {/* Secondary nav */}
        <nav className="space-y-0.5">
          {secondaryItems.map(renderItem)}
        </nav>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="px-4 text-[9px] font-mono uppercase tracking-[0.35em] text-[#6B8D86]">Vibes</h3>
            <div className="space-y-0.5">
              {tags.map(tag => (
                <button key={tag} onClick={() => onTagSelect(tag)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-4 py-2.5 text-sm rounded-xl transition-all duration-200 group',
                    selectedTag === tag
                      ? 'bg-[#EAF7F1] text-[#12935A] shadow-sm ring-1 ring-[#CDE6DB]'
                      : 'text-[#5E7B76] hover:bg-white/70 hover:text-[#1A3142]'
                  )}>
                  <span className={cn('text-base transition-colors duration-200',
                    selectedTag === tag ? 'text-[#12935A]' : 'text-[#A4C0B8] group-hover:text-[#5E7B76]'
                  )}>#</span>
                  <span className="font-medium tracking-wide">{tag}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#D7ECE2]/85 space-y-1">
        {!isPro && onUpgrade && (
          <button onClick={onUpgrade}
            className="w-full flex items-center justify-between px-4 py-3 text-sm rounded-2xl bg-[#173D35]/6 hover:bg-[#173D35]/10 transition-all duration-200 group mb-1">
            <div className="flex items-center gap-3.5">
              <Crown className="w-4 h-4 text-[#13B96D]" />
              <span className="font-semibold text-[#173D35] tracking-wide">Go Pro</span>
            </div>
            <span className="text-[10px] font-mono text-[#13B96D] uppercase tracking-widest">$5/mo</span>
          </button>
        )}
        <button onClick={onLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3 text-sm text-[#5E7B76] hover:text-[#1A3142] transition-all duration-200 rounded-2xl hover:bg-white/70">
          <LogOut className="w-4 h-4" />
          <span className="font-medium tracking-wide">Logout</span>
        </button>
      </div>
    </div>
  );
};
