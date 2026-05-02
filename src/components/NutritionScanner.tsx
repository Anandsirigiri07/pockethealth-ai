import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  X, 
  Loader2, 
  Apple, 
  Upload,
  RefreshCw,
  Video,
  FileSearch,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  User,
  Check,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { analyzeNutrition } from '@/src/lib/gemini';
import { useLanguage } from '@/src/lib/LanguageContext';

interface NutritionScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NutritionProfile {
  goal: string;
  dietaryType: string;
  allergies: string;
  ageGroup: string;
}

function NutritionScanner({ isOpen, onClose }: NutritionScannerProps) {
  const { selectedLanguage: language, t } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  
  const [profile, setProfile] = useState<NutritionProfile>(() => {
    const saved = localStorage.getItem('pockethealth_nutrition_profile');
    return saved ? JSON.parse(saved) : {
      goal: '',
      dietaryType: '',
      allergies: '',
      ageGroup: ''
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    if (isOpen && !profile.goal) {
      setShowProfileSetup(true);
    }
  }, [isOpen, profile.goal]);

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
      const result = await analyzeNutrition(image, profile, language);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try a clearer photo of the food label.");
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

  const saveProfile = (newProfile: NutritionProfile) => {
    setProfile(newProfile);
    localStorage.setItem('pockethealth_nutrition_profile', JSON.stringify(newProfile));
    setShowProfileSetup(false);
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
            className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20"
          >
            {/* Header */}
            <div className="p-8 border-b flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-brand to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand/20">
                  <Apple size={28} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-2xl text-slate-900 tracking-tight">{t.nutritionScanner}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">{t.foodAnalysis} • {language}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowProfileSetup(true)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-brand active:scale-95"
                  title="Profile Setup"
                >
                  <User size={20} />
                </button>
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-95"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {showProfileSetup ? (
                <ProfileSetup 
                  initialProfile={profile} 
                  onSave={saveProfile} 
                  onCancel={() => profile.goal ? setShowProfileSetup(false) : onClose()} 
                  t={t}
                />
              ) : !image && !isLiveMode ? (
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
                      <p className="font-bold text-slate-900 text-xl">{t.takePhotoLabel}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">Scan meal or food label</p>
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
                      <p className="text-xl font-bold text-slate-900">{t.uploadFoodImage}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">Select from your library</p>
                    </div>
                  </div>
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
                      className="w-full h-full object-cover brightness-110 contrast-110"
                    />
                    
                    {/* Scanner UI */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-[15%] border-2 border-white/30 rounded-[2rem] flex items-center justify-center">
                        <div className="w-full h-0.5 bg-brand/50 shadow-[0_0_20px_rgba(37,99,235,1)] animate-scan-slow" />
                      </div>
                    </div>

                    <div className="absolute top-6 right-6 flex gap-2">
                       <button 
                        onClick={() => setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
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
                    <p className="text-[10px] font-black uppercase tracking-widest">Focus on the ingredients or meal</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {!analysis ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-100 aspect-square md:aspect-[16/10]"
                    >
                      <img src={image!} alt="Food Preview" className="w-full h-full object-contain" />
                      <button 
                        onClick={reset}
                        className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-xl text-white rounded-2xl hover:bg-red-500 transition-all z-20"
                      >
                        <X size={20} />
                      </button>
                    </motion.div>
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
                        <h4 className="font-bold text-slate-900 text-xl">{t.nutritionResults}</h4>
                      </div>
                      
                      <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 shadow-inner relative overflow-hidden group">
                        <div className="markdown-body prose-sm max-w-none relative z-10">
                          <ReactMarkdown>{analysis}</ReactMarkdown>
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
                            <Loader2 size={32} />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-900 text-2xl tracking-tight">{t.analyzingFood}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Checking goal alignment: {profile.goal}</p>
                        </div>
                      </motion.div>
                    ) : !analysis ? (
                      <button 
                        onClick={handleAnalyze}
                        className="w-full bg-brand text-white py-6 rounded-[2rem] font-bold hover:bg-brand-dark transition-all active:scale-[0.98] shadow-2xl shadow-brand/30 flex items-center justify-center gap-3 relative overflow-hidden group"
                      >
                        <Sparkles size={24} className="relative z-10" />
                        <span className="relative z-10 text-xl">Analyze Nutrition</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={reset}
                          className="bg-slate-900 text-white py-5 rounded-[2rem] font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-3"
                        >
                          <RefreshCw size={20} />
                          <span>Analyze Another</span>
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
                      <AlertCircle size={24} className="text-red-500" />
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
            {!showProfileSetup && (
              <div className="p-8 border-t bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target</p>
                    <p className="text-xs font-bold text-slate-600">{profile.goal || "Not set"}</p>
                  </div>
                </div>
                <button 
                  onClick={image || isLiveMode ? reset : onClose}
                  className="py-4 px-10 rounded-2xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                  {image || isLiveMode ? t.goBack : t.close}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProfileSetup({ initialProfile, onSave, onCancel, t }: { initialProfile: NutritionProfile, onSave: (p: NutritionProfile) => void, onCancel: () => void, t: any }) {
  const [tempProfile, setTempProfile] = useState(initialProfile);

  const goals = [
    { id: 'Weight loss', label: t.weightLoss },
    { id: 'Muscle gain', label: t.muscleGain },
    { id: 'Diabetes management', label: t.diabetesMgmt },
    { id: 'Heart health', label: t.heartHealth },
    { id: 'General wellness', label: t.wellness }
  ];

  const diets = [
    { id: 'Vegetarian', label: t.veg },
    { id: 'Vegan', label: t.vegan },
    { id: 'Non-vegetarian', label: t.nonVeg },
    { id: 'Jain', label: t.jain },
    { id: 'Keto', label: t.keto }
  ];

  const ages = [
    { id: 'Child', label: t.child },
    { id: 'Teen', label: t.teen },
    { id: 'Adult', label: t.adult },
    { id: 'Senior', label: t.senior }
  ];

  const isComplete = tempProfile.goal && tempProfile.dietaryType && tempProfile.ageGroup;

  return (
    <div className="space-y-8 pb-4">
      <div className="text-center">
        <h4 className="text-2xl font-bold text-slate-900">{t.setProfile}</h4>
        <p className="text-sm text-slate-500 mt-2">Help AI tailor its advice to your body and goals.</p>
      </div>

      <div className="space-y-6">
        {/* Goal */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.healthGoal}</label>
          <div className="flex flex-wrap gap-2">
            {goals.map(g => (
              <button
                key={g.id}
                onClick={() => setTempProfile({...tempProfile, goal: g.id})}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border",
                  tempProfile.goal === g.id 
                    ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                    : "bg-white text-slate-600 border-slate-100 hover:border-brand/30"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Diet */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.dietaryType}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {diets.map(d => (
              <button
                key={d.id}
                onClick={() => setTempProfile({...tempProfile, dietaryType: d.id})}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border text-center",
                  tempProfile.dietaryType === d.id 
                    ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                    : "bg-white text-slate-600 border-slate-100 hover:border-brand/30"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.ageGroup}</label>
          <div className="grid grid-cols-2 gap-2">
            {ages.map(a => (
              <button
                key={a.id}
                onClick={() => setTempProfile({...tempProfile, ageGroup: a.id})}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border text-center",
                  tempProfile.ageGroup === a.id 
                    ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                    : "bg-white text-slate-600 border-slate-100 hover:border-brand/30"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.allergies}</label>
          <input 
            type="text"
            placeholder="e.g. Dairy, Peanuts, Gluten"
            value={tempProfile.allergies}
            onChange={(e) => setTempProfile({...tempProfile, allergies: e.target.value})}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-brand/30 outline-none transition-all font-medium"
          />
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-3">
        <button 
          onClick={() => onSave(tempProfile)}
          disabled={!isComplete}
          className={cn(
            "w-full py-5 rounded-3xl font-bold transition-all shadow-xl flex items-center justify-center gap-3",
            isComplete 
              ? "bg-brand text-white shadow-brand/30 hover:scale-[1.02]" 
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {isComplete ? <Check size={20} /> : <div className="w-5 h-5" />}
          <span>{t.saveProfile}</span>
          <ChevronRight size={18} className={cn("transition-transform", isComplete ? "translate-x-0" : "translate-x-2")} />
        </button>
        <button 
          onClick={onCancel}
          className="w-full py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default React.memo(NutritionScanner);
