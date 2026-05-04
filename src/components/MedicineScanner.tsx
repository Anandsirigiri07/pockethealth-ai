import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  X, 
  Loader2, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Hash,
  Upload,
  RefreshCw,
  Video,
  Info,
  Save,
  Package
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/src/lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Language } from '@/src/lib/translations';
import { useLanguage } from '@/src/lib/LanguageContext';

interface MedicineScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExpiryResult {
  detectedDate: string | null;
  mfgDate: string | null;
  status: 'expired' | 'warning' | 'valid' | 'estimated';
  daysLeft: number | null;
  medicineName?: string;
  purpose?: string;
  typicalShelfLife?: string;
  reasoning?: string;
  confidence?: number;
  highlights?: {
    nameBox?: number[];
    expiryBox?: number[];
  };
}

function MedicineScanner({ isOpen, onClose }: MedicineScannerProps) {
  const { selectedLanguage: language, t } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [result, setResult] = useState<ExpiryResult | null>(null);
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
        setResult(null);
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
      setResult(null);
      setError(null);
    }
  }, [webcamRef]);

  const preprocessImage = useCallback(async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(base64);
          return;
        }

        const MAX_DIM = 1200; // Slightly reduced for performance
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 1. Grayscale & High Contrast
        const contrast = 65; 
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          let val = factor * (gray - 128) + 128;
          data[i] = data[i+1] = data[i+2] = val > 255 ? 255 : (val < 0 ? 0 : val);
        }
        
        // 2. Optimized Sharpening (5*center - top - bottom - left - right)
        const sw = canvas.width;
        const sh = canvas.height;
        const src = new Uint8ClampedArray(data); // Copy for source
        
        for (let y = 1; y < sh - 1; y++) {
          for (let x = 1; x < sw - 1; x++) {
            const off = (y * sw + x) * 4;
            const top = ((y - 1) * sw + x) * 4;
            const bot = ((y + 1) * sw + x) * 4;
            const lft = (y * sw + (x - 1)) * 4;
            const rgt = (y * sw + (x + 1)) * 4;

            const res = 5 * src[off] - src[top] - src[bot] - src[lft] - src[rgt];
            const val = res > 255 ? 255 : (res < 0 ? 0 : res);
            
            data[off] = data[off + 1] = data[off + 2] = val;
            data[off + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);

        resolve(canvas.toDataURL('image/jpeg', 0.85)); // Slightly lower quality for faster upload
      };
      img.onerror = () => resolve(base64);
    });
  }, []);

  const handleScan = async () => {
    if (!image) return;

    setIsScanning(true);
    setError(null);

    try {
      const enhancedImage = await preprocessImage(image);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = enhancedImage.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: "image/jpeg",
              },
            },
            {
              text: `SYSTEM: You are a strict Medical Packaging OCR Specialist. 
Analyze the image for a medicine pack. YOUR ACCURACY IS LIFE-CRITICAL.

CRITICAL INSTRUCTIONS:
1. MEDICINE NAME: Identify the exact brand or generic name.
2. EXPIRY DATE (EXP): Look for "EXP", "E:", "Use By", "Best Before". 
3. MANUFACTURING DATE (MFG): Look for "MFG", "MFD", "PKD". 
4. BE EXTREMELY SKEPTICAL: If the date is blurry, partially covered, or ambiguous, you MUST set "foundExpiry" to false and "expiryDate" to null. 
5. NO GUESSING: Never derive an expiry date from the manufacturing date unless there is clear "Best for X months" text. 
6. If "foundExpiry" is false, provide a "typicalShelfLife" (e.g. 24 months) and explain in "reasoning" exactly why the date was not clearly findable.
7. Provide bounding boxes [ymin, xmin, ymax, xmax] for "medicineName" and "expiryDate" (if found).

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}.

RETURN JSON ONLY:
{
  "medicineName": "string",
  "foundExpiry": boolean (ONLY true if 100% visible),
  "expiryDate": "YYYY-MM-DD" or null,
  "mfgDate": "YYYY-MM-DD" or null,
  "confidenceScore": number (0-100),
  "purpose": "What it treats",
  "typicalShelfLife": "string",
  "reasoning": "Detailed explanation of findings (e.g. 'MFG found at bottom left, EXP was blurry near top')",
  "highlights": {
    "nameBox": [ymin, xmin, ymax, xmax],
    "expiryBox": [ymin, xmin, ymax, xmax]
  }
}

If no medicine is visible, return {"error": "NO_MEDICINE"}.
            
CRITICAL: The "purpose" and "reasoning" fields MUST be written in ${language}.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text);

      if (data.error === "NO_MEDICINE") {
        setError("No medicine container detected. Please center the pack.");
      } else {
        const expDate = data.expiryDate ? new Date(data.expiryDate) : null;
        const today = new Date();
        const diffDays = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

        let status: 'expired' | 'warning' | 'valid' | 'estimated' = 'valid';
        if (!data.foundExpiry) status = 'estimated';
        else if (diffDays !== null && diffDays <= 0) status = 'expired';
        else if (diffDays !== null && diffDays < 90) status = 'warning';

        setResult({
          detectedDate: data.expiryDate,
          mfgDate: data.mfgDate,
          status,
          daysLeft: diffDays,
          medicineName: data.medicineName,
          purpose: data.purpose,
          typicalShelfLife: data.typicalShelfLife,
          reasoning: data.reasoning,
          confidence: data.confidenceScore,
          highlights: data.highlights
        });
      }
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try a clearer, brighter photo.");
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setIsLiveMode(false);
    setSaveSuccess(false);
    setIsSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveToInventory = async () => {
    if (!result || !auth.currentUser) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    const path = `users/${auth.currentUser.uid}/medicines`;
    try {
      await addDoc(collection(db, path), {
        userId: auth.currentUser.uid,
        medicineName: result.medicineName || "Unknown Medicine",
        detectedDate: result.detectedDate,
        mfgDate: result.mfgDate,
        status: result.status,
        purpose: result.purpose,
        typicalShelfLife: result.typicalShelfLife,
        reasoning: result.reasoning,
        confidence: result.confidence,
        daysLeft: result.daysLeft,
        scannedAt: serverTimestamp(),
      });
      setSaveSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSaving(false);
    }
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh]"
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-900">{t.expiryChecker}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.aiVisionScan}</p>
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
                    className="w-full h-40 border-2 border-brand/20 rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-brand/[0.02] group hover:border-brand/40 transition-all shadow-sm"
                  >
                    <div className="w-16 h-16 bg-brand rounded-3xl flex items-center justify-center text-white shadow-lg shadow-brand/20 group-hover:scale-110 transition-transform">
                      <Video size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-900">{t.liveCameraScan}</p>
                      <p className="text-xs text-slate-400 font-medium">{t.realTimeDetection}</p>
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
                    <p className="text-sm font-bold text-slate-900">{t.chooseFromDevice}</p>
                  </div>
                </div>
              ) : isLiveMode ? (
                <div className="space-y-4">
                  <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 aspect-square shadow-2xl border-4 border-white">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: cameraFacingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                      }}
                      onUserMediaError={() => setError("Camera access denied or not available. Please check permissions.")}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Scanner Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-brand/50 rounded-3xl relative">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand rounded-tl-xl animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand rounded-tr-xl animate-pulse" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand rounded-bl-xl animate-pulse" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand rounded-br-xl animate-pulse" />
                        
                        {/* Scanning Line */}
                        <motion.div 
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="absolute left-2 right-2 h-0.5 bg-brand shadow-[0_0_15px_rgba(37,99,235,0.8)] z-10"
                        />
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 flex flex-col gap-2">
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
                  {/* Image Preview */}
                  <div className="relative group rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-lg aspect-square bg-slate-100 p-4">
                    <img src={image!} alt="Medicine preview" className="w-full h-full object-contain rounded-2xl" />
                    
                    {/* Highlighting Overlay */}
                    {result?.highlights && (
                      <div className="absolute inset-0 pointer-events-none p-4">
                         <div className="relative w-full h-full">
                            {result.highlights.nameBox && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute border-2 border-brand/60 bg-brand/10 rounded-lg shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all"
                                style={{
                                  top: `${result.highlights.nameBox[0]/10}%`,
                                  left: `${result.highlights.nameBox[1]/10}%`,
                                  height: `${(result.highlights.nameBox[2] - result.highlights.nameBox[0])/10}%`,
                                  width: `${(result.highlights.nameBox[3] - result.highlights.nameBox[1])/10}%`
                                }}
                              >
                                 <span className="absolute -top-5 left-0 text-[8px] bg-brand text-white px-1.5 py-0.5 font-bold rounded-md uppercase tracking-tighter">Detected Name</span>
                              </motion.div>
                            )}
                            {result.highlights.expiryBox && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute border-2 border-amber-500/60 bg-amber-500/10 rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all"
                                style={{
                                  top: `${result.highlights.expiryBox[0]/10}%`,
                                  left: `${result.highlights.expiryBox[1]/10}%`,
                                  height: `${(result.highlights.expiryBox[2] - result.highlights.expiryBox[0])/10}%`,
                                  width: `${(result.highlights.expiryBox[3] - result.highlights.expiryBox[1])/10}%`
                                }}
                              >
                                <span className="absolute -top-5 left-0 text-[8px] bg-amber-500 text-white px-1.5 py-0.5 font-bold rounded-md uppercase tracking-tighter">Detected Expiry</span>
                              </motion.div>
                            )}
                         </div>
                      </div>
                    )}

                    <button 
                      onClick={reset}
                      className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-md text-white rounded-xl hover:bg-black/70 transition-all z-20"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Result Section */}
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
                            <Camera size={20} className="absolute top-3.5 left-3.5 text-brand" />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 tracking-tight text-lg">{t.analyzingPack}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t.analyzingLabels}</p>
                        </div>
                      </motion.div>
                    ) : result ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 shadow-sm",
                          result.status === 'expired' ? "bg-red-50 border-red-100" :
                          result.status === 'warning' ? "bg-amber-50 border-amber-100" :
                          result.status === 'estimated' ? "bg-blue-50 border-blue-100" :
                          "bg-emerald-50 border-emerald-100"
                        )}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                            result.status === 'expired' ? "bg-red-500 shadow-red-200" :
                            result.status === 'warning' ? "bg-amber-500 shadow-amber-200" :
                            result.status === 'estimated' ? "bg-blue-500 shadow-blue-200" :
                            "bg-emerald-500 shadow-emerald-200"
                          )}>
                            {result.status === 'expired' ? <AlertTriangle size={24} /> : 
                             result.status === 'estimated' ? <Calendar size={24} /> : <CheckCircle size={24} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-display font-bold text-slate-900 text-lg tracking-tight">
                                {result.status === 'expired' ? t.expired : 
                                 result.status === 'warning' ? t.expiringSoon : 
                                 result.status === 'estimated' ? t.estimated : t.safeToUse}
                              </h4>
                              {result.confidence && (
                                <span className={cn(
                                  "text-[9px] font-black px-2 py-0.5 rounded-full border",
                                  result.confidence > 80 ? "bg-emerald-100 border-emerald-200 text-emerald-700" : 
                                  result.confidence > 50 ? "bg-amber-100 border-amber-200 text-amber-700" : 
                                  "bg-red-100 border-red-200 text-red-700"
                                )}>
                                  {result.confidence}% SURE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">
                              {result.medicineName !== "Unknown" ? result.medicineName : "Medicine Detected"}
                            </p>
                          </div>
                        </div>

                        {result.purpose && (
                          <div className="mb-4 p-3 bg-white/40 rounded-2xl border border-white/50 text-xs text-slate-600 leading-relaxed italic">
                            <span className="font-bold text-slate-900 not-italic block mb-0.5">{t.indications}:</span>
                            {result.purpose}
                          </div>
                        )}

                        {result.reasoning && (
                          <div className="mb-4 p-3 bg-brand/5 rounded-2xl border border-brand/10 text-[11px] text-brand/80 font-medium">
                            <span className="font-bold block mb-0.5 uppercase tracking-widest text-[9px]">{t.aiVerification}</span>
                            {result.reasoning}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className={cn(
                             "p-4 rounded-3xl border shadow-sm backdrop-blur-sm",
                             result.mfgDate ? "bg-white/60 border-white/50" : "bg-slate-50/50 border-slate-100"
                           )}>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                              {t.mfgDate}
                            </p>
                            <p className="font-bold text-slate-700">
                              {result.mfgDate || "Not Detected"}
                            </p>
                          </div>
                          <div className={cn(
                             "p-4 rounded-3xl border shadow-sm backdrop-blur-sm",
                             result.detectedDate ? "bg-red-50/30 border-red-100/50" : "bg-slate-50/50 border-slate-100"
                           )}>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                              {t.expDate}
                            </p>
                            <p className="font-bold text-red-600">
                              {result.detectedDate || "Not Detected"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/60 p-4 rounded-3xl border border-white/50 shadow-sm backdrop-blur-sm flex flex-col justify-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 whitespace-nowrap">
                              {result.status === 'estimated' ? "Typical Life" : "Analysis"}
                            </p>
                            <p className="font-bold text-slate-900 text-sm truncate">
                              {result.status === 'estimated' ? result.typicalShelfLife : "Visual Link Found"}
                            </p>
                          </div>
                          <div className="bg-white/60 p-4 rounded-3xl border border-white/50 shadow-sm backdrop-blur-sm">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                              {t.daysLeft}
                            </p>
                            <p className={cn(
                              "font-bold text-lg",
                              result.status === 'expired' ? "text-red-600" : 
                              result.status === 'warning' ? "text-amber-600" : 
                              result.status === 'estimated' ? "text-blue-600" : "text-emerald-600"
                            )}>
                              {result.status === 'expired' ? t.expired.toUpperCase() : 
                               result.status === 'estimated' ? t.estimated.toUpperCase() : `${result.daysLeft || '?'}`}
                            </p>
                          </div>
                        </div>

                        {result.status === 'estimated' && (
                          <div className="mt-4 p-3 bg-blue-100/50 rounded-2xl border border-blue-200/50 flex gap-2 items-start">
                            <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-blue-700 font-medium">
                              Exact expiry date not found in image. Showing typical shelf life for this medicine type. 
                              Please check the side/bottom of the pack manually.
                            </p>
                          </div>
                        )}

                        <div className="mt-6 flex flex-col gap-2">
                          <button
                            onClick={handleSaveToInventory}
                            disabled={isSaving || saveSuccess}
                            className={cn(
                              "w-full py-4 rounded-3xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]",
                              saveSuccess 
                                ? "bg-emerald-500 text-white shadow-emerald-200 cursor-default" 
                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                            )}
                          >
                            {isSaving ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : saveSuccess ? (
                              <>
                                <CheckCircle size={20} />
                                {t.savedToCabinet}
                              </>
                            ) : (
                              <>
                                <Save size={20} />
                                {t.saveToInventory}
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    ) : error ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-5 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-3 shadow-sm"
                      >
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div>
                          <p className="text-sm text-red-600 font-bold">{t.analysisFailed}</p>
                          <p className="text-xs text-red-500 mt-1">{error}</p>
                        </div>
                      </motion.div>
                    ) : (
                      <button 
                        onClick={handleScan}
                        className="w-full bg-brand text-white py-5 rounded-3xl font-bold hover:bg-brand-dark transition-all active:scale-[0.98] shadow-2xl shadow-brand/30 flex items-center justify-center gap-3 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Hash size={20} className="relative z-10" />
                        <span className="relative z-10 text-lg">{t.analyzeImage}</span>
                      </button>
                    )}
                  </AnimatePresence>
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

export default React.memo(MedicineScanner);
