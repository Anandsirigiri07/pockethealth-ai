import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Language } from '@/src/lib/translations';
import { useLanguage } from '@/src/lib/LanguageContext';

interface DisclaimerModalProps {
  onAccept: () => void;
  isOpen: boolean;
}

function DisclaimerModal({ onAccept, isOpen }: DisclaimerModalProps) {
  const { t } = useLanguage();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 20) {
      setHasScrolledToBottom(true);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-teal-50/50">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 id="disclaimer-title" className="font-display font-bold text-xl text-slate-900">{t.importantDisclaimer}</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t.importantSafety}</p>
            </div>
          </div>

          <div 
            onScroll={handleScroll}
            className="p-6 overflow-y-auto text-slate-600 space-y-4 text-sm leading-relaxed"
          >
            <p className="font-semibold text-slate-900">
              {t.readCarefully}
            </p>
            <p>
              {t.notADoctor}
            </p>
            <ul className="list-disc ml-5 space-y-2">
              <li>{t.disclaimerPoint1}</li>
              <li>{t.disclaimerPoint2}</li>
              <li>{t.disclaimerPoint3}</li>
              <li>{t.disclaimerPoint4}</li>
              <li>{t.disclaimerPoint5}</li>
            </ul>
            <p>
              {t.disclaimerAcknowledge}
            </p>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
            <button
              onClick={onAccept}
              disabled={!hasScrolledToBottom}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                hasScrolledToBottom 
                ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200 active:scale-95' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {hasScrolledToBottom ? <CheckCircle2 size={20} /> : null}
              {hasScrolledToBottom ? t.acceptAndContinue : t.readToBottom}
            </button>
            <p className="text-[10px] text-center text-slate-400">
              {t.consentStored}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default React.memo(DisclaimerModal);
