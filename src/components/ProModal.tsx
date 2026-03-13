import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#12362f]/35 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass p-1 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] z-50 overflow-hidden"
          >
            <div className="p-10 bg-white/85 backdrop-blur-3xl rounded-[2.8rem]">
              <div className="flex justify-between items-start mb-10">
                <motion.div 
                  initial={{ rotate: -15 }}
                  animate={{ rotate: 0 }}
                  className="w-16 h-16 rounded-[1.5rem] border border-[#CEE6DB] bg-white/88 p-3.5 shadow-2xl shadow-[#13B96D]/15"
                >
                  <BrandLogo />
                </motion.div>
                <button onClick={onClose} className="p-3 hover:bg-[#F1FAF6] rounded-2xl transition-all duration-300">
                  <X className="w-6 h-6 text-[#6B8D86]" />
                </button>
              </div>

              <h2 className="text-4xl font-serif italic text-[#1A3142] mb-4 tracking-tight">Elevate your intent.</h2>
              <p className="text-[#5F7D78] mb-10 leading-relaxed">Unlock the full potential of your digital brain with advanced AI understanding and infinite planning.</p>

              <ul className="space-y-5 mb-12">
                {[
                  'Unlimited tasks & projects',
                  'Advanced AI intent recognition',
                  'Life history & timeline search',
                  'Smart carry-forward insights',
                  'Priority AI planning assistance'
                ].map((benefit, i) => (
                  <motion.li 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="flex items-center gap-4 text-sm text-[#4F6D67]"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#E8F7EF] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-[#12935A] stroke-[3]" />
                    </div>
                    <span className="font-medium tracking-wide">{benefit}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="space-y-4">
                <button
                  onClick={onUpgrade}
                  className="w-full py-5 bg-[#13B96D] text-white rounded-[1.5rem] font-semibold hover:bg-[#10A763] transition-all duration-500 shadow-xl shadow-[#13B96D]/20 active:scale-[0.98]"
                >
                  Go Pro - $5/month
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-transparent text-[#6B8D86] rounded-2xl font-medium hover:text-[#264941] transition-all duration-300"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <div className="bg-[#F3FBF7] p-5 text-center">
              <p className="text-[10px] text-[#6B8D86] uppercase tracking-[0.4em] font-mono">
                7-DAY FREE TRIAL - CANCEL ANYTIME
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

