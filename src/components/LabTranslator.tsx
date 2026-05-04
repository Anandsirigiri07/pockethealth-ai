import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  X, 
  Loader2, 
  TestTube, 
  Upload,
  RefreshCw,
  Video,
  FileText,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { analyzeLabReportImage } from '@/src/lib/gemini';
import { Language } from '@/src/lib/translations';
import { useLanguage } from '@/src/lib/LanguageContext';

interface LabTranslatorProps {
  isOpen: boolean;
  onClose: () => void;
}

function LabTranslator({ isOpen, onClose }: LabTranslatorProps) {
  const { selectedLanguage: language, t } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  
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
    if (!image) return;

    setIsScanning(true);
    setError(null);

    try {
      const result = await analyzeLabReportImage(image, language);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try a clearer, brighter photo of your report.");
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setImage(null);
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-xl bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full md:max-h-[90dvh]"
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white">
                  <TestTube size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-900">{t.labTranslator}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.reportAnalysis} • {language}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!image && !isLiveMode ? (
                <div className="space-y-4">
                  <button 
                    onClick={() => setIsLiveMode(true)}
                    className="w-full h-48 border-2 border-brand/20 rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-brand/[0.02] group hover:border-brand/40 transition-all shadow-sm"
                  >
                    <div className="w-16 h-16 bg-brand rounded-3xl flex items-center justify-center text-white shadow-lg shadow-brand/20 group-hover:scale-110 transition-transform">
                      <Video size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-900 text-lg">{t.takePhotoReport}</p>
                      <p className="text-xs text-slate-400 font-medium max-w-[200px] mx-auto">{t.positionReport}</p>
                    </div>
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                      <span className="bg-white px-4 text-slate-300">{t.orUpload}</span>
                    </div>
                  </div>

                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 bg-slate-50 relative group hover:border-brand/30 transition-all">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand shadow-sm transition-all group-hover:scale-110">
                      <Upload size={20} />
                    </div>
                    <p className="text-sm font-bold text-slate-900">{t.uploadReportImage}</p>
                  </div>
                </div>
              ) : isLiveMode ? (
                <div className="space-y-4">
                  <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 aspect-[3/4] shadow-2xl border-4 border-white">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: cameraFacingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                      }}
                      onUserMediaError={() => setError("Camera access denied. Please allow camera permissions in your browser settings.")}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Scanner Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-full border-[30px] border-black/40 relative">
                        <div className="absolute inset-0 border-2 border-white/20" />
                        
                        {/* Scanning Line */}
                        <motion.div 
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                          className="absolute left-0 right-0 h-0.5 bg-brand shadow-[0_0_15px_rgba(37,99,235,0.8)] z-10"
                        />
                      </div>
                    </div>

                    <div className="absolute top-4 right-4">
                       <button 
                        onClick={toggleCamera}
                        className="p-3 bg-black/50 backdrop-blur-md text-white rounded-2xl hover:bg-black/70 transition-all active:scale-95 border border-white/10"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                       <button 
                         onClick={capture}
                         className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-brand shadow-2xl active:scale-90 transition-all border-4 border-brand/20 p-1"
                       >
                         <div className="w-full h-full bg-brand rounded-full flex items-center justify-center text-white">
                           <Camera size={24} />
                         </div>
                       </button>
                    </div>
                  </div>
                  <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest">{t.centerExpiryBox}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Image Preview or Analysis */}
                  {!analysis ? (
                    <div className="relative group rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-lg bg-slate-100 p-4 aspect-[4/3]">
                      <img src={image!} alt="Report preview" className="w-full h-full object-contain rounded-2xl" />
                      <button 
                        onClick={reset}
                        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-md text-white rounded-xl hover:bg-black/70 transition-all z-20"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 shadow-inner"
                    >
                      <div className="flex items-center gap-2 mb-4 text-brand font-bold">
                        <Sparkles size={18} />
                        <span>AI Analysis Results</span>
                      </div>
                      <div className="markdown-body prose-sm max-w-none">
                        <ReactMarkdown>{analysis}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}

                  {/* Action Section */}
                  <AnimatePresence mode="wait">
                    {isScanning ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center space-y-4"
                      >
                        <div className="flex justify-center">
                          <div className="relative">
                            <Loader2 size={48} className="text-brand animate-spin" />
                            <FileText size={20} className="absolute top-3.5 left-3.5 text-brand" />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 tracking-tight text-lg">{t.analyzingReport}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t.extractingData}</p>
                        </div>
                      </motion.div>
                    ) : !analysis ? (
                      <button 
                        onClick={handleAnalyze}
                        className="w-full bg-brand text-white py-5 rounded-3xl font-bold hover:bg-brand-dark transition-all active:scale-[0.98] shadow-2xl shadow-brand/30 flex items-center justify-center gap-3 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Sparkles size={20} className="relative z-10" />
                        <span className="relative z-10 text-lg">{t.analyzeImage}</span>
                      </button>
                    ) : (
                      <button 
                        onClick={reset}
                        className="w-full bg-slate-900 text-white py-4 rounded-3xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
                      >
                        <RefreshCw size={20} />
                        <span>{t.analyzeAnother}</span>
                      </button>
                    )}
                  </AnimatePresence>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-5 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-3 shadow-sm"
                    >
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm text-red-600 font-bold">{t.analysisFailed}</p>
                        <p className="text-xs text-red-500 mt-1">{error}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-slate-50/50 flex gap-3">
              <button 
                onClick={image || isLiveMode ? reset : onClose}
                className="flex-1 py-4 px-6 rounded-2xl font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
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

export default React.memo(LabTranslator);
