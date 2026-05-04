import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  X, 
  Loader2, 
  Search, 
  Upload,
  RefreshCw,
  Video,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { interpretDermResults } from '../lib/gemini';
import { analyzeSkinLesion, base64ToImage, PredictionResult } from '../lib/dermModel';
import { useLanguage } from '../lib/LanguageContext';

interface DermScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScanStatus = 'idle' | 'analyzing_tfjs' | 'interpreting_gemini' | 'complete' | 'error';

export default function DermScanner({ isOpen, onClose }: DermScannerProps) {
  const { selectedLanguage: language } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [tfjsResults, setTfjsResults] = useState<PredictionResult[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setStatus('idle');
        setAnalysis(null);
        setError(null);
        setIsLiveMode(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      setIsLiveMode(false);
      setStatus('idle');
      setAnalysis(null);
      setError(null);
    }
  }, [webcamRef]);

  const handleAnalyze = async () => {
    if (!image) return;

    try {
      setError(null);
      setStatus('analyzing_tfjs');
      
      const imgElement = await base64ToImage(image);
      const results = await analyzeSkinLesion(imgElement).catch(e => {
        console.error("TFJS Error:", e);
        throw new Error(isOffline ? "Model failed to run offline. Please load it once while online." : "Specialized AI model failed to run.");
      });
      setTfjsResults(results);

      if (isOffline) {
        setAnalysis("**Offline Mode Result:** Classification complete. Please connect to internet for the full empathetic AI report. \n\n**Confidence Scores:** " + results.map(r => `\n- ${r.className}: ${(r.probability * 100).toFixed(1)}%`).join(''));
        setStatus('complete');
        return;
      }

      setStatus('interpreting_gemini');
      const geminiResult = await interpretDermResults(results, language).catch(e => {
        console.error("Gemini Error:", e);
        throw new Error("AI Interpreter is unavailable.");
      });
      setAnalysis(geminiResult);
      setStatus('complete');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis failed");
      setStatus('error');
    }
  };

  const reset = () => {
    setImage(null);
    setStatus('idle');
    setAnalysis(null);
    setError(null);
    setIsLiveMode(false);
    setTfjsResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCamera = () => {
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-slate-900/95 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.9, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 40 }}
          className="w-full max-w-2xl bg-white rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white/20 premium-shadow"
        >
          {/* Header */}
          <div className="p-8 border-b flex items-center justify-between glass-morphism sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-100">
                <Activity size={28} />
              </div>
              <div>
                <h3 className="font-display font-bold text-2xl text-slate-900 tracking-tight">DermCheck AI</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Hybrid AI • On-Device Specialized</p>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-95"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {!image && !isLiveMode ? (
              <div className="space-y-8 h-full flex flex-col">
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                  <Zap className="text-amber-500 shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-sm font-bold text-amber-900 leading-none mb-1">Hybrid AI Integration</p>
                    <p className="text-xs text-amber-700/80 leading-relaxed">
                      Uses a <b>specialized local neural net (TFJS)</b> for speed, then <b>Gemini Flash</b> for empathy.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                  <button 
                    onClick={() => setIsLiveMode(true)}
                    className="group border-2 border-rose-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 bg-rose-50/30 hover:border-rose-400 transition-all hover:shadow-2xl hover:shadow-rose-500/5 relative overflow-hidden h-64 md:h-full"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                       <Video size={120} />
                    </div>
                    <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
                      <Camera size={32} />
                    </div>
                    <div className="text-center relative z-10">
                      <p className="font-bold text-slate-900 text-xl tracking-tight">Live Scanner</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">Analyze in real-time</p>
                    </div>
                  </button>

                  <div className="h-64 md:h-full border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 bg-slate-50 relative group hover:border-rose-300 transition-all hover:bg-white hover:shadow-xl overflow-hidden">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                       <Upload size={120} />
                    </div>
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-400 group-hover:text-rose-500 shadow-md border border-slate-100 transition-all group-hover:scale-110">
                      <Upload size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900 tracking-tight">Upload Photo</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">Select clear close-up</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isLiveMode ? (
              <div className="space-y-6 h-full flex flex-col">
                <div className="relative rounded-[3rem] overflow-hidden bg-slate-950 aspect-square md:flex-1 shadow-2xl border-8 border-white group">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: cameraFacingMode,
                      width: { ideal: 1280 },
                      height: { ideal: 720 }
                    }}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-[15%] border-2 border-rose-500/30 rounded-full flex items-center justify-center">
                      <div className="w-full h-0.5 bg-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,1)] absolute animate-scan-slow" />
                    </div>
                  </div>

                  <div className="absolute top-6 right-6">
                     <button 
                      onClick={toggleCamera}
                      className="p-4 bg-black/40 backdrop-blur-xl text-white rounded-2xl hover:bg-black/60 transition-all border border-white/10"
                    >
                      <RefreshCw size={24} />
                    </button>
                  </div>

                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                     <button 
                       onClick={capture}
                       className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-2xl active:scale-90 transition-all border-8 border-rose-500/10 p-1"
                     >
                       <div className="w-full h-full bg-rose-500 rounded-full flex items-center justify-center text-white">
                         <Camera size={32} />
                       </div>
                     </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {status === 'complete' ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500">
                        <Activity size={20} />
                      </div>
                      <h4 className="font-bold text-slate-900 text-xl tracking-tight">AI Analysis Report</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {tfjsResults.slice(0, 2).map((res, i) => (
                        <div key={i} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Model Match</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{res.className}</p>
                          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${res.probability * 100}%` }}
                              className="h-full bg-rose-500"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-rose-500 mt-2">{(res.probability * 100).toFixed(1)}% Confidence</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 shadow-inner relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                         <Sparkles size={160} />
                      </div>
                      <div className="markdown-body prose-sm max-w-none relative z-10">
                        <ReactMarkdown>{analysis || ''}</ReactMarkdown>
                      </div>
                    </div>

                    <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex items-start gap-4">
                      <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-200">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Medical Disclaimer</p>
                        <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                          This AI screening is for education only. It is not a clinical diagnosis. Always consult a dermatologist.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : status === 'analyzing_tfjs' || status === 'interpreting_gemini' ? (
                  <div className="py-20 flex flex-col items-center gap-10">
                     <div className="relative">
                        <div className="w-32 h-32 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-rose-500">
                          {status === 'analyzing_tfjs' ? <Zap size={40} className="animate-pulse" /> : <Sparkles size={40} className="animate-bounce" />}
                        </div>
                     </div>
                     
                     <div className="space-y-5 w-full max-w-sm">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                           <span className={status === 'analyzing_tfjs' ? 'text-rose-500' : 'text-slate-400'}>Neural Net (Edge)</span>
                           <span className={status === 'interpreting_gemini' ? 'text-rose-500' : 'text-slate-400'}>Gemini (Cloud)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                           <motion.div 
                             animate={{ width: status === 'analyzing_tfjs' ? '50%' : '100%' }}
                             className="h-full bg-rose-500"
                           />
                        </div>
                        <p className="text-center text-slate-500 font-bold text-sm">
                           {status === 'analyzing_tfjs' ? 'Running on-device neural network...' : 'Synthesizing empathetic report...'}
                        </p>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-900 aspect-square"
                    >
                      <img src={image || ''} alt="Skin area" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setImage(null)}
                        className="absolute top-6 right-6 p-4 bg-black/40 backdrop-blur-xl text-white rounded-2xl hover:bg-red-500 transition-all z-20"
                      >
                        <X size={20} />
                      </button>
                    </motion.div>

                    <button 
                      onClick={handleAnalyze}
                      className="w-full bg-rose-500 text-white py-6 rounded-[2rem] font-bold hover:bg-rose-600 transition-all active:scale-[0.98] shadow-2xl shadow-rose-500/30 flex items-center justify-center gap-3"
                    >
                      <Sparkles size={24} />
                      <span className="text-xl">Start Hybrid Analysis</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-start gap-4">
                <AlertCircle size={24} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-600 font-bold">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 border-t bg-slate-50/50 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
               <ShieldCheck size={18} className="text-emerald-500" />
               <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">
                  Privacy-First • On-Device Prep
               </span>
            </div>
            <button 
              onClick={image || isLiveMode ? reset : onClose}
              className="py-4 px-10 rounded-2xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm text-sm"
            >
              {image || isLiveMode ? 'Go Back' : 'Close'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
