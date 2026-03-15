import React from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Clock, List, LogOut, History, Timer, Sunrise, BarChart3, LayoutTemplate, Crown } from 'lucide-react';
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  counts,
  onLogout,
  tags,
  selectedTag,
  onTagSelect,
  className,
  isPro,
  onUpgrade,
}) => {
  const primaryItems = [
    { id: 'digest',   label: 'Daily Digest',  icon: Sunrise,      shortcut: 'd' },
    { id: 'today',    label: 'Today',          icon: Clock,        shortcut: 't' },
    { id: 'overdue',  label: 'Overdue',        icon: CheckCircle2, shortcut: 'o' },
    { id: 'upcoming', label: 'Upcoming',       icon: CalendarIcon, shortcut: 'u' },
  ];

  const secondaryItems = [
    { id: 'timeline',  label: 'Timeline',     icon: History },
    { id: 'all',       label: 'All Tasks',    icon: List,          shortcut: 'a' },
    { id: 'calendar',  label: 'Calendar',     icon: CalendarIcon },
    { id: 'weekly',    label: 'Weekly Review',icon: BarChart3,     shortcut: 'w' },
    { id: 'pomodoro',  label: 'Focus Timer',  icon: Timer },
    { id: 'templates', label: 'Templates',    icon: LayoutTemplate },
  ];

  const renderItem = (item: { id: string; label: string; icon: React.ElementType; shortcut?: string }) => {
    const isActive = activeView === item.id && !selectedTag;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => {
          onViewChange(item.id as ViewType);
          onTagSelect(null);
        }}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-2xl transition-all duration-300 group',
          isActive
            ? 'bg-[#EAF7F1] text-[#12935A] shadow-sm ring-1 ring-[#CDE6DB]'
            : 'text-[#5E7B76] hover:bg-white/70 hover:text-[#1A3142]'
        )}
      >
        <div className="flex items-center gap-3.5">
          <Icon className={cn('w-4 h-4 transition-colors duration-300', isActive ? 'text-[#12935A]' : 'text-[#8DAAA0] group-hover:text-[#4A6862]')} />
          <span className="font-medium tracking-wide">{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {counts[item.id as ViewType] > 0 && (
            <span className={cn(
              'text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors duration-300',
              isActive ? 'bg-[#D8F0E4] text-[#0E784A]' : 'bg-[#E6F3EC] text-[#5F7F78] group-hover:bg-white group-hover:text-[#33524C]'
            )}>
              {counts[item.id as ViewType]}
            </span>
          )}
          {item.shortcut && !isActive && (
            <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-[#A4BFB9] border border-[#D7EBE4] rounded-md bg-white/60 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="p-8 flex items-center gap-3">
        <BrandLogo className="h-10 w-10 shrink-0 rounded-2xl border border-[#CEE6DB] bg-white/88 p-2 shadow-lg shadow-[#13B96D]/10" />
        <div>
          <h1 className="text-2xl font-serif italic text-[#1A3142] tracking-tight">IntentList</h1>
          {isPro && (
            <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.25em] text-[#13B96D]">
              <Crown className="w-2.5 h-2.5" /> Pro
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-6 mt-2">
        {/* Primary nav */}
        <nav className="space-y-1">
          {primaryItems.map(renderItem)}
        </nav>

        {/* Divider */}
        <div className="border-t border-[#D7ECE2]/60" />

        {/* Secondary nav */}
        <nav className="space-y-1">
          {secondaryItems.map(renderItem)}
        </nav>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-3">
            <h3 className="px-4 text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">Vibes</h3>
            <div className="space-y-1">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => onTagSelect(tag)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-4 py-2.5 text-sm rounded-xl transition-all duration-300 group',
                    selectedTag === tag
                      ? 'bg-[#EAF7F1] text-[#12935A] shadow-sm ring-1 ring-[#CDE6DB]'
                      : 'text-[#5E7B76] hover:bg-white/70 hover:text-[#1A3142]'
                  )}
                >
                  <span className={cn('text-lg transition-colors duration-300', selectedTag === tag ? 'text-[#12935A]' : 'text-[#A4C0B8] group-hover:text-[#5E7B76]')}>#</span>
                  <span className="font-medium tracking-wide">{tag}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#D7ECE2]/85 space-y-1">
        {/* Pro upgrade CTA — only for free users */}
        {!isPro && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="w-full flex items-center justify-between px-4 py-3 text-sm rounded-2xl bg-[#173D35]/6 hover:bg-[#173D35]/10 text-[#173D35] transition-all duration-300 group mb-1"
          >
            <div className="flex items-center gap-3.5">
              <Crown className="w-4 h-4 text-[#13B96D]" />
              <span className="font-semibold tracking-wide">Go Pro</span>
            </div>
            <span className="text-[10px] font-mono text-[#13B96D] uppercase tracking-widest">$5/mo</span>
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3 text-sm text-[#5E7B76] hover:text-[#1A3142] transition-all duration-300 rounded-2xl hover:bg-white/70"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium tracking-wide">Logout</span>
        </button>
      </div>
    </div>
  );
};
