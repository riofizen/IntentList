import React from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Clock, List, LogOut, History, Sparkles, Timer } from 'lucide-react';
import { ViewType } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onViewChange, 
  counts, 
  onLogout,
  tags,
  selectedTag,
  onTagSelect,
  className
}) => {
  const items = [
    { id: 'today', label: 'Today', icon: Clock },
    { id: 'overdue', label: 'Overdue', icon: CheckCircle2 },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarIcon },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'all', label: 'All Tasks', icon: List },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'pomodoro', label: 'Focus Timer', icon: Timer },
  ];

  return (
    <div className={cn("w-72 border-r border-[#D7ECE2]/85 h-full flex flex-col glass-sidebar relative z-20", className)}>
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#13B96D] rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#13B96D]/25">
          <Sparkles className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-serif italic text-[#1A3142] tracking-tight">IntentList</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-8 mt-4">
        <nav className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id as ViewType);
                onTagSelect(null);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 text-sm rounded-2xl transition-all duration-300 group",
                activeView === item.id && !selectedTag
                  ? "bg-[#EAF7F1] text-[#12935A] shadow-sm ring-1 ring-[#CDE6DB]" 
                  : "text-[#5E7B76] hover:bg-white/70 hover:text-[#1A3142]"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("w-4 h-4 transition-colors duration-300", activeView === item.id && !selectedTag ? "text-[#12935A]" : "text-[#8DAAA0] group-hover:text-[#4A6862]")} />
                <span className="font-medium tracking-wide">{item.label}</span>
              </div>
              {counts[item.id as ViewType] > 0 && (
                <span className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors duration-300",
                  activeView === item.id && !selectedTag ? "bg-[#D8F0E4] text-[#0E784A]" : "bg-[#E6F3EC] text-[#5F7F78] group-hover:bg-white group-hover:text-[#33524C]"
                )}>
                  {counts[item.id as ViewType]}
                </span>
              )}
            </button>
          ))}
        </nav>

        {tags.length > 0 && (
          <div className="space-y-4">
            <h3 className="px-4 text-[10px] font-mono uppercase tracking-[0.3em] text-[#6B8D86]">Vibes</h3>
            <div className="space-y-1">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => onTagSelect(tag)}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-2.5 text-sm rounded-xl transition-all duration-300 group",
                    selectedTag === tag
                      ? "bg-[#EAF7F1] text-[#12935A] shadow-sm ring-1 ring-[#CDE6DB]"
                      : "text-[#5E7B76] hover:bg-white/70 hover:text-[#1A3142]"
                  )}
                >
                  <span className={cn("text-lg transition-colors duration-300", selectedTag === tag ? "text-[#12935A]" : "text-[#A4C0B8] group-hover:text-[#5E7B76]")}>#</span>
                  <span className="font-medium tracking-wide">{tag}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-[#D7ECE2]/85">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3 text-sm text-[#5E7B76] hover:text-[#1A3142] transition-all duration-300 rounded-2xl hover:bg-white/70"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium tracking-wide">Logout</span>
        </button>
      </div>
    </div>
  );
};
