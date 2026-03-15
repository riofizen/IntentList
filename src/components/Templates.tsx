import React, { useState } from 'react';
import { format, addDays, nextMonday, startOfToday, addWeeks } from 'date-fns';
import { Sunrise, Briefcase, CalendarRange, Brain, Heart, Rocket, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../App';
import { Task } from '../types';

interface TemplateTask {
  text: string;
  offsetDays: number; // days from today
  time?: string;
  priority: 'high' | 'normal' | 'low';
  tags: string[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tasks: TemplateTask[];
}

const TEMPLATES: Template[] = [
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    description: 'Start every day with clarity and energy',
    icon: Sunrise,
    color: 'text-amber-500',
    tasks: [
      { text: 'Drink a full glass of water', offsetDays: 0, time: '07:00', priority: 'normal', tags: ['health'] },
      { text: '10 minutes of stretching or yoga', offsetDays: 0, time: '07:10', priority: 'normal', tags: ['health'] },
      { text: 'Review today\'s tasks and set top 3 priorities', offsetDays: 0, time: '08:00', priority: 'high', tags: ['personal'] },
      { text: 'No phone for the first 30 minutes', offsetDays: 0, time: '07:00', priority: 'low', tags: ['personal'] },
    ],
  },
  {
    id: 'work-day',
    name: 'Work Day Setup',
    description: 'Hit the ground running every morning',
    icon: Briefcase,
    color: 'text-blue-500',
    tasks: [
      { text: 'Check and process inbox to zero', offsetDays: 0, time: '09:00', priority: 'normal', tags: ['work'] },
      { text: 'Review calendar and confirm today\'s meetings', offsetDays: 0, time: '09:15', priority: 'normal', tags: ['work'] },
      { text: 'Write the 3 most important tasks for today', offsetDays: 0, time: '09:20', priority: 'high', tags: ['work'] },
      { text: 'End-of-day: update task list and close tabs', offsetDays: 0, time: '17:30', priority: 'low', tags: ['work'] },
    ],
  },
  {
    id: 'weekly-planning',
    name: 'Weekly Planning',
    description: 'Set yourself up for a focused week',
    icon: CalendarRange,
    color: 'text-purple-500',
    tasks: [
      { text: 'Review last week\'s completed and missed tasks', offsetDays: 0, time: '09:00', priority: 'high', tags: ['personal'] },
      { text: 'Set 3 goals for this week', offsetDays: 0, time: '09:30', priority: 'high', tags: ['personal'] },
      { text: 'Schedule focus blocks in calendar', offsetDays: 0, time: '10:00', priority: 'normal', tags: ['work'] },
      { text: 'Plan meals and grocery list', offsetDays: 0, time: '10:30', priority: 'low', tags: ['errands', 'personal'] },
      { text: 'Weekly review check-in with team', offsetDays: 1, time: '10:00', priority: 'normal', tags: ['work'] },
    ],
  },
  {
    id: 'deep-work',
    name: 'Deep Work Session',
    description: 'Protect your most productive hours',
    icon: Brain,
    color: 'text-[#12935A]',
    tasks: [
      { text: 'Close all notifications and set phone to DND', offsetDays: 0, time: '09:00', priority: 'high', tags: ['personal'] },
      { text: 'Pick ONE task to complete this session', offsetDays: 0, time: '09:05', priority: 'high', tags: ['work'] },
      { text: '90-minute focus block — no interruptions', offsetDays: 0, time: '09:10', priority: 'high', tags: ['work'] },
      { text: '15-minute break: walk or stretch', offsetDays: 0, time: '10:40', priority: 'normal', tags: ['health'] },
    ],
  },
  {
    id: 'health-week',
    name: 'Health Week',
    description: 'One small health habit for every day',
    icon: Heart,
    color: 'text-red-400',
    tasks: [
      { text: 'Monday: 30 min walk or jog', offsetDays: 0, time: '07:00', priority: 'normal', tags: ['health'] },
      { text: 'Tuesday: Drink 2L of water', offsetDays: 1, time: '08:00', priority: 'low', tags: ['health'] },
      { text: 'Wednesday: Cook a healthy meal at home', offsetDays: 2, time: '18:00', priority: 'normal', tags: ['health', 'personal'] },
      { text: 'Thursday: 20 min yoga or stretching', offsetDays: 3, time: '07:00', priority: 'normal', tags: ['health'] },
      { text: 'Friday: Sleep by 10:30pm', offsetDays: 4, time: '22:30', priority: 'normal', tags: ['health'] },
      { text: 'Weekend: Phone-free morning', offsetDays: 5, time: '09:00', priority: 'low', tags: ['health', 'personal'] },
    ],
  },
  {
    id: 'project-kickoff',
    name: 'Project Kickoff',
    description: 'Start any new project the right way',
    icon: Rocket,
    color: 'text-orange-400',
    tasks: [
      { text: 'Define project goal and success criteria', offsetDays: 0, time: '09:00', priority: 'high', tags: ['work'] },
      { text: 'List all key stakeholders and roles', offsetDays: 0, time: '10:00', priority: 'high', tags: ['work'] },
      { text: 'Break project into 3–5 milestones', offsetDays: 0, time: '11:00', priority: 'high', tags: ['work'] },
      { text: 'Create initial task list and assign deadlines', offsetDays: 1, time: '09:00', priority: 'normal', tags: ['work'] },
      { text: 'Share kickoff summary with team', offsetDays: 1, time: '11:00', priority: 'normal', tags: ['work'] },
    ],
  },
];

interface TemplatesProps {
  onApply: (tasks: Omit<Task, 'id' | 'userId' | 'createdAt' | 'completed'>[]) => void;
}

export const Templates: React.FC<TemplatesProps> = ({ onApply }) => {
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleApply = (template: Template) => {
    const today = startOfToday();
    const taskBatch = template.tasks.map(t => ({
      text: t.text,
      date: format(addDays(today, t.offsetDays), 'yyyy-MM-dd'),
      time: t.time ?? null,
      priority: t.priority,
      tags: t.tags,
    }));
    onApply(taskBatch);
    setAppliedId(template.id);
    setTimeout(() => setAppliedId(null), 3000);
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#6B8D86] mb-2">Quick Start</p>
        <h2 className="text-3xl font-serif italic text-[#1A3142]">Templates</h2>
        <p className="text-sm text-[#6B8D86] mt-1">One tap to load a batch of tasks. Fully editable after.</p>
      </motion.div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEMPLATES.map((template, i) => {
          const Icon = template.icon;
          const isApplied = appliedId === template.id;
          const isHovered = hoveredId === template.id;

          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "group relative bg-white/90 border rounded-2xl p-5 shadow-sm transition-all duration-300 cursor-default",
                isApplied
                  ? "border-[#13B96D]/50 bg-[#ECF9F2]/80"
                  : "border-[#D6EBE1] hover:border-[#B7DDCC] hover:shadow-md"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("w-9 h-9 rounded-xl bg-[#F2FBF6] flex items-center justify-center", template.color)}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <AnimatePresence mode="wait">
                  {isApplied ? (
                    <motion.div
                      key="done"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13B96D]/15 text-[#12935A] rounded-full text-[10px] font-bold uppercase tracking-widest"
                    >
                      <Check className="w-3 h-3" />
                      Added
                    </motion.div>
                  ) : (
                    <motion.button
                      key="apply"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      onClick={() => handleApply(template)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#13B96D] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#0FAA64] transition-colors"
                    >
                      Use <ChevronRight className="w-3 h-3" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <h3 className="text-base font-semibold text-[#1D3441] mb-1">{template.name}</h3>
              <p className="text-xs text-[#6B8D86] mb-4 leading-relaxed">{template.description}</p>

              {/* Task preview */}
              <div className="space-y-1.5">
                {template.tasks.slice(0, 3).map((task, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      task.priority === 'high' ? 'bg-red-400' : task.priority === 'low' ? 'bg-[#46C488]' : 'bg-[#9FC1B4]'
                    )} />
                    <p className="text-[11px] text-[#6B8D86] truncate">{task.text}</p>
                  </div>
                ))}
                {template.tasks.length > 3 && (
                  <p className="text-[10px] text-[#9AB8AF] font-mono pl-3.5">
                    +{template.tasks.length - 3} more tasks
                  </p>
                )}
              </div>

              {/* Tap area — full card click on mobile */}
              <button
                onClick={() => !isApplied && handleApply(template)}
                className="absolute inset-0 rounded-2xl sm:hidden"
                aria-label={`Apply ${template.name} template`}
              />
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-[10px] font-mono uppercase tracking-[0.3em] text-[#9AB8AF] pt-4">
        All tasks are fully editable after adding
      </p>
    </div>
  );
};
