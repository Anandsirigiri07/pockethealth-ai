import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
  isOpen: boolean;
}

export default function DisclaimerModal({ onAccept, isOpen }: DisclaimerModalProps) {
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
              <h2 id="disclaimer-title" className="font-display font-bold text-xl text-slate-900">Medical Disclaimer</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Important Safety Information</p>
            </div>
          </div>

          <div 
            onScroll={handleScroll}
            className="p-6 overflow-y-auto text-slate-600 space-y-4 text-sm leading-relaxed"
          >
            <p className="font-semibold text-slate-900">
              Please read this disclaimer carefully before using PocketHealth AI.
            </p>
            <p>
              PocketHealth AI is an artificial intelligence-powered informational tool. 
              <span className="font-bold text-teal-700"> It is NOT a doctor, and it does not provide medical diagnoses, treatment advice, or prescriptions.</span>
            </p>
            <ul className="list-disc ml-5 space-y-2">
              <li>Information provided is for educational and awareness purposes only.</li>
              <li>Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</li>
              <li>Never disregard professional medical advice or delay in seeking it because of something you have read on this application.</li>
              <li>In case of a medical emergency, call your local emergency services (e.g., 102/108 in India) or visit the nearest hospital immediately.</li>
              <li>AI interpretations of lab results or symptoms may be inaccurate or incomplete.</li>
            </ul>
            <p>
              By clicking "I Understand & Accept", you acknowledge that you have read, understood, and agree to these terms, and that you will use this tool responsibly as a supplement to, not a replacement for, professional medical care.
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
              {hasScrolledToBottom ? 'I Understand & Accept' : 'Please read to the bottom'}
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Your health is priority. This consent is stored locally on your device.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
