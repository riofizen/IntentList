import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../App';

export const MindfulBreathing: React.FC<{ isZenMode: boolean }> = ({ isZenMode }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="relative flex items-center justify-center">
        {/* Breathing Circle */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn(
            "w-32 h-32 rounded-full blur-3xl",
            isZenMode ? "bg-[#13B96D]/20" : "bg-[#13B96D]/14"
          )}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn(
            "absolute w-24 h-24 rounded-full border flex items-center justify-center",
            isZenMode ? "border-[#13B96D]/45" : "border-[#13B96D]/35"
          )}
        >
          <motion.span
            animate={{
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={cn(
              "text-[10px] font-mono uppercase tracking-[0.3em]",
              isZenMode ? "text-[#0F784A]" : "text-[#139C5E]"
            )}
          >
            Breathe
          </motion.span>
        </motion.div>
      </div>
      <p className={cn(
        "text-xs font-serif italic text-center max-w-[200px]",
        isZenMode ? "text-[#3B645B]" : "text-[#5E7B76]"
      )}>
        Inhale deeply, exhale slowly. Let your mind rest.
      </p>
    </div>
  );
};
