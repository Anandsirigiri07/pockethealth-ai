import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Send, 
  User, 
  Stethoscope, 
  TestTube, 
  History, 
  Pill, 
  Hospital, 
  ClipboardList,
  Sparkles,
  Info,
  ShieldCheck,
  LogOut,
  AlertCircle,
  MapPin,
  Calendar,
  ArrowLeft,
  Languages,
  Globe,
  Apple,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { chatWithPocketHealth, Message } from '@/src/lib/gemini';
import { Language } from '@/src/lib/translations';
import { useLanguage } from '@/src/lib/LanguageContext';
import DisclaimerModal from '@/src/components/DisclaimerModal';
import { auth, logout } from '@/src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import Login from '@/src/components/Login';
import EmergencyPanel from '@/src/components/EmergencyPanel';
import LocationViewer from '@/src/components/LocationViewer';
import MedicineScanner from '@/src/components/MedicineScanner';
import MedicineInventory from '@/src/components/MedicineInventory';
import LabTranslator from '@/src/components/LabTranslator';
import MedicalImageExplainer from '@/src/components/MedicalImageExplainer';
import NutritionScanner from '@/src/components/NutritionScanner';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [isMedicalImageOpen, setIsMedicalImageOpen] = useState(false);
  const [isNutritionOpen, setIsNutritionOpen] = useState(false);
  const { selectedLanguage, setSelectedLanguage, t } = useLanguage();
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [shareId, setShareId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('shareId');
    if (id) {
      setShareId(id);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const activeUser = user;

  useEffect(() => {
    const hasAccepted = localStorage.getItem('pockethealth_disclaimer_accepted');
    if (!hasAccepted && activeUser) {
      setIsDisclaimerOpen(true);
    }
  }, [activeUser]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('pockethealth_disclaimer_accepted', 'true');
    setIsDisclaimerOpen(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!activeUser) {
      setExpiringSoonCount(0);
      return;
    }

    const q = query(
      collection(db, `users/${activeUser.uid}/medicines`),
      where('status', 'in', ['warning', 'expired'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpiringSoonCount(snapshot.size);
    }, (err) => {
      console.warn("Firestore access error:", err);
    });

    return () => unsubscribe();
  }, [activeUser]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const newMessage: Message = { 
      id: Math.random().toString(36).substring(2, 11),
      role: 'user', 
      text,
      timestamp: Date.now()
    };
    const updatedMessages = [...messages, newMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Maintain focus on input for keyboard users
    inputRef.current?.focus();

    try {
      const response = await chatWithPocketHealth(updatedMessages, selectedLanguage);
      setMessages(prev => [...prev, { 
        id: Math.random().toString(36).substring(2, 11),
        role: 'model', 
        text: response,
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Math.random().toString(36).substring(2, 11),
        role: 'model', 
        text: "I'm sorry, I encountered an error. Please try again. If the issue persists, check your connection.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      // Re-focus after loading
      inputRef.current?.focus();
    }
  };


  const modes = [
    { id: 'opinion', label: t.secondOpinion, icon: Stethoscope, prompt: 'I want a second opinion on a medical condition my doctor mentioned.' },
    { id: 'lab', label: t.labTranslator, icon: TestTube, action: () => setIsLabOpen(true) },
    { id: 'risk', label: t.riskNarrator, icon: History, prompt: 'I want to know my future health risks based on my lifestyle.' },
    { id: 'meds', label: t.medicationCheck, icon: Pill, prompt: 'Can you check if these medications are safe to take together?' },
    { id: 'hospital', label: t.hospitalGuide, icon: Hospital, prompt: 'I am planning to visit a hospital and need a guide on what to expect.' },
    { id: 'expiry', label: t.medicineScanner, icon: Calendar, action: () => setIsScannerOpen(true) },
    { id: 'inventory', label: t.medicineCabinetMode, icon: Pill, action: () => setIsInventoryOpen(true) },
    { id: 'sos', label: t.emergencyMap, icon: AlertCircle, action: () => setIsEmergencyOpen(true) },
    { id: 'scan', label: t.medicalImageExplainer, icon: Stethoscope, action: () => setIsMedicalImageOpen(true) },
    { id: 'nutrition', label: t.nutritionScanner, icon: Apple, action: () => setIsNutritionOpen(true) },
    { id: 'symptoms', label: t.symptomAnalyser, icon: ClipboardList, prompt: 'I have been logging my symptoms and want you to find patterns.' },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-teal-600"
        >
          <Heart size={48} fill="currentColor" />
        </motion.div>
      </div>
    );
  }

  if (shareId) {
    return <LocationViewer shareId={shareId} />;
  }

  if (!user) {
    return <Login />;
  }

  const getDailyTip = () => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return t.healthTips[dayOfYear % t.healthTips.length];
  };

  const dailyTip = getDailyTip();

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-mesh-light shadow-2xl overflow-hidden relative sm:border-x border-slate-200/50">
      <a href="#chat-input" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-brand focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to chat input
      </a>

      {/* Header */}
      <header className="px-6 py-5 glass-morphism sticky top-0 z-[40] shrink-0" role="banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="p-3 bg-white hover:bg-slate-50 text-slate-600 transition-all rounded-2xl border border-slate-100 shadow-sm active:scale-95"
                aria-label="Back to home"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200" aria-hidden="true">
              <Heart size={24} fill="currentColor" className="animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl leading-tight text-slate-900 tracking-tight">{t.appName}</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-success rounded-full" />
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{t.alwaysConnected}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative group">
              <div className="flex items-center gap-1 px-3 py-2 bg-white/50 backdrop-blur-md hover:bg-white text-slate-600 transition-all rounded-xl border border-slate-200/50 cursor-pointer shadow-sm">
                <Languages size={16} className="text-brand" />
                <select 
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                  className="bg-transparent text-[11px] font-black outline-none border-none cursor-pointer appearance-none pr-1 uppercase tracking-tight"
                >
                  <option value="English">ENG</option>
                  <option value="Hindi">हिन्दी</option>
                  <option value="Kannada">ಕನ್ನಡ</option>
                  <option value="Telugu">తెలుగు</option>
                  <option value="Chinese">中文</option>
                  <option value="Japanese">日本語</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => setIsInventoryOpen(true)}
              className={cn(
                "p-3 transition-all rounded-2xl border relative shadow-sm",
                expiringSoonCount > 0 
                ? "bg-amber-50 text-amber-600 border-amber-200" 
                : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
              )}
            >
              <Pill size={20} />
              {expiringSoonCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce-slow">
                  {expiringSoonCount}
                </span>
              )}
            </button>
            <button 
              onClick={logout}
              className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all rounded-2xl border border-slate-100 shadow-sm"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <DisclaimerModal 
        isOpen={isDisclaimerOpen} 
        onAccept={handleAcceptDisclaimer} 
      />

      <EmergencyPanel 
        isOpen={isEmergencyOpen} 
        onClose={() => setIsEmergencyOpen(false)} 
      />

      <MedicineScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />

      <MedicineInventory 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
      />

      <LabTranslator 
        isOpen={isLabOpen} 
        onClose={() => setIsLabOpen(false)} 
      />

      <MedicalImageExplainer 
        isOpen={isMedicalImageOpen} 
        onClose={() => setIsMedicalImageOpen(false)} 
      />

      <NutritionScanner 
        isOpen={isNutritionOpen} 
        onClose={() => setIsNutritionOpen(false)} 
      />

      {/* Main Content Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth custom-scrollbar"
        id="chat-log"
      >
        <AnimatePresence initial={false} mode="wait">
          {messages.length === 0 && !isLoading ? (
            <motion.div 
              key="home-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {/* Hero Section */}
              <div className="relative pt-4 text-center">
                <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-indigo-100/50">
                   ⚡ {t.aiPowered}
                </div>
                <h2 className="text-4xl font-display font-extrabold text-slate-900 mb-4 tracking-tight leading-[1.1]">
                  {t.howCanIHelp}
                </h2>
                <p className="text-slate-500 text-base max-w-sm mx-auto leading-relaxed font-medium">
                  {t.appSubtitle}
                </p>
              </div>

              {/* Modes Grid */}
              <div className="grid grid-cols-2 gap-4">
                {modes.map((mode, i) => (
                  <motion.button
                    key={mode.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => {
                      if ('action' in mode && mode.action) {
                        mode.action();
                      } else if ('prompt' in mode && mode.prompt) {
                        handleSend(mode.prompt);
                      }
                    }}
                    className="group relative p-6 bg-white border border-slate-100 rounded-[2.5rem] text-left transition-all hover:border-brand/30 hover:bg-brand/[0.01] active:scale-[0.98] premium-shadow hover:shadow-indigo-100 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-[0.03] transition-all group-hover:scale-110 duration-500">
                      <mode.icon size={100} />
                    </div>
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all mb-4 shadow-sm border border-transparent",
                      mode.id === 'sos' ? "bg-red-50 text-red-600 group-hover:bg-red-100" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                    )}>
                      <mode.icon size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">Featured</p>
                      <span className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{mode.label}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Daily Insight Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden group shadow-2xl shadow-indigo-900/20"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Sparkles size={120} />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-500/20 backdrop-blur-xl rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Heart size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Daily Wellness Insight</p>
                </div>
                <p className="text-xl font-display font-bold leading-snug relative z-10">
                  "{dailyTip.text}"
                </p>
                <div className="mt-6 flex items-center gap-2 text-indigo-400 font-bold text-xs">
                  <span>Learn more about this</span>
                  <ArrowLeft size={14} className="rotate-180" />
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id || `msg-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "flex max-w-[90%] gap-3",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center mt-1 overflow-hidden shadow-sm",
                      msg.role === 'user' ? "bg-white text-slate-400 border border-slate-200" : "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    )}>
                      {msg.role === 'user' ? (
                        activeUser?.photoURL ? <img src={activeUser.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={20} />
                      ) : <Sparkles size={20} />}
                    </div>
                    <div className={cn(
                      "p-6 shadow-sm relative",
                      msg.role === 'user' 
                        ? "chat-bubble-user" 
                        : "chat-bubble-ai"
                    )}>
                      <div className="markdown-body prose-sm max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                      {idx === messages.length - 1 && msg.role === 'model' && (
                        <div className="mt-5 pt-5 border-t border-slate-100 text-[10px] text-slate-400 flex items-start gap-2 font-medium">
                          <ShieldCheck size={14} className="mt-0.5 text-indigo-500 shrink-0" />
                          <span className="leading-tight">{t.medicalDisclaimer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start mb-4"
                >
                  <div className="flex max-w-[85%] gap-3">
                    <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center bg-indigo-600 text-white mt-1 shadow-lg shadow-indigo-200">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                    <div className="chat-bubble-ai p-6 flex items-center gap-2 h-14">
                      <div className="flex gap-1.5">
                        <motion.span animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                        <motion.span animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                        <motion.span animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Input Area */}
      <footer className="p-6 pb-8 sticky bottom-0 z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1 group">
              <input
                id="chat-input"
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.askPlaceholder}
                className="w-full bg-white border border-slate-200 rounded-[2.5rem] py-5 pl-8 pr-14 text-sm focus:border-indigo-400 focus:ring-8 focus:ring-indigo-50 shadow-[0_15px_50px_rgba(0,0,0,0.1)] transition-all outline-none font-medium placeholder:text-slate-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all",
                  input.trim() && !isLoading 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95" 
                    : "bg-slate-50 text-slate-200"
                )}
              >
                <Send size={18} />
              </button>
            </div>
            
            {messages.length > 0 && (
              <button 
                type="button"
                onClick={() => setMessages([])}
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-200 shadow-xl flex-shrink-0"
              >
                <History size={22} />
              </button>
            )}
          </form>
          {messages.length === 0 && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-6 p-5 rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/50 shadow-sm relative overflow-hidden group"
            >
                <div className="flex items-start gap-4 relative z-10">
                  <div className="text-2xl group-hover:scale-110 transition-transform duration-500">{dailyTip.icon}</div>
                  <div className="flex-1">
                    <h4 className={cn("text-[10px] font-black uppercase tracking-widest mb-1", dailyTip.color)}>
                      {t.dailyWisdom} • {dailyTip.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                     {dailyTip.text}
                   </p>
                 </div>
                </div>
            </motion.div>
          )}
        </div>
      </footer>
    </div>
  );
}
