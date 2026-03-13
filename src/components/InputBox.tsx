import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { parseIntent, type ParsedIntent } from '../lib/parser';

interface InputBoxProps {
  onAddTask: (intent: ParsedIntent) => void;
  selectedDate?: Date;
}

export const InputBox: React.FC<InputBoxProps> = ({ onAddTask, selectedDate }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    onAddTask(parseIntent(input, selectedDate || new Date()));
    setInput('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative group">
      <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
        <Plus className="w-6 h-6 text-[#8FAEA3] group-focus-within:text-[#12935A] transition-all duration-500 group-focus-within:rotate-90" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Brain dump your thoughts... (e.g. 'buy milk tomorrow morning @home')"
        className="w-full pl-14 pr-4 py-5 text-base tracking-tight bg-white/90 border border-[#CCE4D8] rounded-[1.6rem] shadow-[0_8px_30px_rgb(29,73,58,0.08)] focus:outline-none focus:ring-4 focus:ring-[#13B96D]/10 focus:border-[#13B96D]/40 transition-all duration-500 text-[#1D3441] placeholder:text-[#90AEA4] sm:pl-16 sm:pr-6 sm:py-6 sm:text-lg sm:rounded-[2rem]"
      />
      <div className="absolute right-6 inset-y-0 flex items-center">
        <kbd className="hidden sm:inline-block px-3 py-1.5 text-[10px] font-mono text-[#6B8D86] border border-[#CDE5DA] rounded-xl bg-[#F4FBF7] tracking-widest">
          / TO FOCUS
        </kbd>
      </div>
    </form>
  );
};
