import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './Sidebar';
import { Task } from '../types';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  tasks: Task[];
}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, tasks }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getTasksForDay = (day: Date) => {
    return tasks.filter(t => isSameDay(parseISO(t.date), day));
  };

  return (
    <div className="bg-white/80 border border-[#D3E9DE] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-serif italic text-[#1D3441]">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-2 hover:bg-[#F2FBF6] rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#5F7E79]" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-[#F2FBF6] rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-[#5F7E79]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] font-mono uppercase tracking-widest text-[#6C8F87] py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dayTasks = getTasksForDay(day);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "aspect-square relative flex flex-col items-center justify-center rounded-xl transition-all",
                !isCurrentMonth && "opacity-20",
                isSelected ? "bg-[#13B96D] text-white shadow-md shadow-[#13B96D]/25" : "hover:bg-[#F2FBF6]",
                isToday && !isSelected && "text-[#1D3441] font-bold"
              )}
            >
              <span className="text-sm">{format(day, 'd')}</span>
              {dayTasks.length > 0 && (
                <div className={cn(
                  "absolute bottom-2 w-1 h-1 rounded-full",
                  isSelected ? "bg-white/50" : "bg-[#5E7D78]"
                )} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
