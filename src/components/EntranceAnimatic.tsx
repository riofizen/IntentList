import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface EntranceAnimaticProps {
  onComplete: () => void;
}

export const EntranceAnimatic: React.FC<EntranceAnimaticProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(2), 2400),
      setTimeout(() => setStep(3), 5600),
      setTimeout(() => onComplete(), 7600),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[220] overflow-hidden bg-[#ECF7F1] flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -15, 0], opacity: [0.35, 0.5, 0.35] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full bg-[#88D8B0]/30 blur-[90px]"
        />
        <motion.div
          animate={{ x: [0, -18, 0], y: [0, 16, 0], opacity: [0.25, 0.42, 0.25] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-24 -right-24 w-[460px] h-[460px] rounded-full bg-[#6ED4AE]/25 blur-[100px]"
        />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(10,30,25,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(10,30,25,0.08)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="orb"
            initial={{ opacity: 0, scale: 0.75, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -18, filter: 'blur(6px)' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, 7, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-24 h-24 mx-auto rounded-[1.8rem] bg-[#15B56A] text-white flex items-center justify-center shadow-[0_14px_45px_rgba(21,181,106,0.35)]"
            >
              <Sparkles className="w-10 h-10" />
            </motion.div>
            <p className="mt-5 text-[11px] font-semibold tracking-[0.35em] uppercase text-[#2E5751]">
              Focus Orbit
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="intentlist"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(7px)' }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-center px-8"
          >
            <motion.h1
              initial={{ letterSpacing: '0.24em', opacity: 0 }}
              animate={{ letterSpacing: '0.03em', opacity: 1 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="text-[clamp(3rem,10vw,6rem)] leading-none font-serif italic text-[#15253A]"
            >
              IntentList
            </motion.h1>
            <p className="mt-4 text-[12px] md:text-sm uppercase tracking-[0.28em] text-[#2E5751] font-semibold">
              Your digital brain, in motion.
            </p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="closing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center px-8"
          >
            <p className="text-lg md:text-2xl font-medium text-[#1A3442]">Breathe. Prioritize. Execute.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        whileHover={{ opacity: 1 }}
        onClick={onComplete}
        className="absolute bottom-9 right-9 text-[10px] font-mono uppercase tracking-[0.2em] text-[#2E5751] border-b border-[#2E5751]/25 pb-1"
      >
        Skip Intro
      </motion.button>
    </div>
  );
};
