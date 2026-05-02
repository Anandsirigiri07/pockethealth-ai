import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  X, 
  Loader2, 
  Dna, 
  Upload,
  RefreshCw,
  Video,
  FileSearch,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { analyzeMedicalImage } from '@/src/lib/gemini';
import { useLanguage } from '@/src/lib/LanguageContext';

interface MedicalImageExplainerProps {
  isOpen: boolean;
  onClose: () => void;
}

function MedicalImageExplainer({ isOpen, onClose }: MedicalImageExplainerProps) {
  const { selectedLanguage: language, t } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  
  const [reportText, setReportText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
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
      setAnalysis(null);
      setError(null);
    }
  }, [webcamRef]);

  const handleAnalyze = async () => {
    if (!image && !reportText.trim()) return;

    setIsScanning(true);
    setError(null);

    try {
      const result = await analyzeMedicalImage(image, reportText, language);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try again with a clearer photo or report text.");
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setImage(null);
    setReportText('');
    setAnalysis(null);
    setError(null);
    setIsLiveMode(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCamera = () => {
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 40 }}
            className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20 premium-shadow"
          >
            {/* Header */}
            <div className="p-8 border-b flex items-center justify-between glass-morphism sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <Stethoscope size={28} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-2xl text-slate-900 tracking-tight">{t.medicalImageExplainer}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest leading-none">{t.scanAnalysis} • {language}</p>
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
              {!image && !isLiveMode && !analysis ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                      onClick={() => setIsLiveMode(true)}
                      className="h-64 border-2 border-brand/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 bg-brand/[0.02] group hover:border-brand/40 transition-all hover:shadow-2xl hover:shadow-brand/5 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Video size={120} />
                      </div>
                      <div className="w-16 h-16 bg-brand rounded-3xl flex items-center justify-center text-white shadow-lg shadow-brand/20 group-hover:scale-110 transition-transform">
                        <Camera size={32} />
                      </div>
                      <div className="text-center relative z-10">
                        <p className="font-bold text-slate-900 text-xl">{t.takePhotoScan}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">{t.positionScan}</p>
                      </div>
                    </button>

                    <div className="h-64 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 bg-slate-50 relative group hover:border-brand/30 transition-all hover:bg-white hover:shadow-xl">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Upload size={120} />
                      </div>
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-400 group-hover:text-brand shadow-md border border-slate-100 transition-all group-hover:scale-110">
                        <Upload size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">{t.uploadScanImage}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Select from your device library</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Paste Radiology Report (Optional)</label>
                    <textarea 
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Paste the text from your X-ray, MRI, or CT report here..."
                      className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-brand/30 outline-none transition-all font-medium resize-none shadow-inner"
                    />
                  </div>

                  {reportText.trim() && !image && (
                    <button 
                      onClick={handleAnalyze}
                      className="w-full bg-brand text-white py-6 rounded-[2rem] font-bold hover:bg-brand-dark transition-all active:scale-[0.98] shadow-2xl shadow-brand/30 flex items-center justify-center gap-3 relative overflow-hidden group"
                    >
                      <Sparkles size={24} className="relative z-10" />
                      <span className="relative z-10 text-xl">Analyze Report Text</span>
                    </button>
                  )}
                </div>
              ) : isLiveMode ? (
                <div className="space-y-6">
                  <div className="relative rounded-[3rem] overflow-hidden bg-slate-950 aspect-square md:aspect-[4/3] shadow-2xl border-8 border-white group">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: cameraFacingMode
                      }}
                      className="w-full h-full object-cover grayscale brightness-110 contrast-125"
                    />
                    
                    {/* Scanner UI */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-[10%] border-2 border-white/30 rounded-[2rem] flex items-center justify-center">
                        <div className="w-full h-0.5 bg-brand/50 shadow-[0_0_20px_rgba(37,99,235,1)] animate-scan-slow" />
                      </div>
                      
                      {/* Corner Accents */}
                      <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-brand rounded-tl-xl" />
                      <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-brand rounded-tr-xl" />
                      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-brand rounded-bl-xl" />
                      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-brand rounded-br-xl" />
                    </div>

                    <div className="absolute top-6 right-6">
                       <button 
                        onClick={toggleCamera}
                        className="p-4 bg-black/40 backdrop-blur-xl text-white rounded-2xl hover:bg-black/60 transition-all active:scale-95 border border-white/10"
                      >
                        <RefreshCw size={24} />
                      </button>
                    </div>

                    <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                       <button 
                         onClick={capture}
                         className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-brand shadow-2xl active:scale-90 transition-all border-8 border-brand/10 p-1"
                       >
                         <div className="w-full h-full bg-brand rounded-full flex items-center justify-center text-white">
                           <Camera size={32} />
                         </div>
                       </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{t.positionScan}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {!analysis ? (
                    <div className="space-y-6">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-900 aspect-square md:aspect-[16/10]"
                      >
                        <img src={image!} alt="Medical Scan" className="w-full h-full object-contain grayscale" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button 
                          onClick={() => setImage(null)}
                          className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-xl text-white rounded-2xl hover:bg-red-500 transition-all z-20"
                        >
                          <X size={20} />
                        </button>
                      </motion.div>

                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Paste Radiology Report (Optional)</label>
                        <textarea 
                          value={reportText}
                          onChange={(e) => setReportText(e.target.value)}
                          placeholder="Paste the text from your X-ray, MRI, or CT report here..."
                          className="w-full h-32 bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-4 text-sm focus:bg-white focus:border-brand/30 outline-none transition-all font-medium resize-none shadow-inner"
                        />
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                          <Sparkles size={20} />
                        </div>
                        <h4 className="font-bold text-slate-900 text-xl">{t.scanResults}</h4>
                      </div>
                      
                      <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                           <Dna size={200} />
                        </div>
                        <div className="markdown-body prose-sm max-w-none relative z-10">
                          <ReactMarkdown>{analysis}</ReactMarkdown>
                        </div>
                      </div>

                      <div className="p-6 bg-brand/5 rounded-3xl border border-brand/10 flex items-start gap-4">
                        <div className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center shrink-0">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Safety First</p>
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            This analysis is for educational purposes. AI can misinterpret medical imaging or report text. Never delay professional medical advice based on this reading.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Action Button Section */}
                  <AnimatePresence mode="wait">
                    {isScanning ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-12 flex flex-col items-center gap-6"
                      >
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center text-brand">
                            <FileSearch size={32} />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-900 text-2xl tracking-tight">{t.analyzingScan}</p>
                          <div className="flex items-center justify-center gap-2 mt-2">
                             <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" />
                             <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:0.2s]" />
                             <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:0.4s]" />
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-2">Mapping anatomy</span>
                          </div>
                        </div>
                      </motion.div>
                    ) : !analysis ? (
                      (image || reportText.trim()) && (
                        <button 
                          onClick={handleAnalyze}
                          className="w-full bg-brand text-white py-6 rounded-[2rem] font-bold hover:bg-brand-dark transition-all active:scale-[0.98] shadow-2xl shadow-brand/30 flex items-center justify-center gap-3 relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          <Sparkles size={24} className="relative z-10" />
                          <span className="relative z-10 text-xl">Analyze Now</span>
                        </button>
                      )
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={reset}
                          className="bg-slate-900 text-white py-5 rounded-[2rem] font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-3"
                        >
                          <RefreshCw size={20} />
                          <span>{t.analyzeAnother}</span>
                        </button>
                        <button 
                          onClick={onClose}
                          className="bg-slate-100 text-slate-900 py-5 rounded-[2rem] font-bold hover:bg-slate-200 transition-all active:scale-[0.98] border border-slate-200 flex items-center justify-center gap-3"
                        >
                          <X size={20} />
                          <span>{t.close}</span>
                        </button>
                      </div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-start gap-4 shadow-sm"
                    >
                      <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shrink-0">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <p className="text-base text-red-600 font-bold">{t.analysisFailed}</p>
                        <p className="text-sm text-red-500 mt-1 font-medium">{error}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t bg-slate-50/50 backdrop-blur-xl flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                    <ShieldCheck size={12} className="text-slate-400" />
                  </div>
                ))}
                <span className="pl-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center">
                   Trusted by 10k+ users
                </span>
              </div>
              <button 
                onClick={image || isLiveMode ? reset : onClose}
                className="py-4 px-10 rounded-2xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                {image || isLiveMode ? t.goBack : t.close}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default React.memo(MedicalImageExplainer);
