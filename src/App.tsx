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
  Globe
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

  const healthTips = [
    { title: "Stay Hydrated", text: "Aim for 8 glasses of water daily to maintain cognitive function and skin health.", icon: "💧", color: "text-blue-500" },
    { title: "Digital Detox", text: "Power down all screens at least 30 minutes before sleep for better melatonin production.", icon: "🌙", color: "text-indigo-500" },
    { title: "Mindful Minutes", text: "Take 5 minutes today for deep breathing to lower cortisol and reduce stress levels.", icon: "🧘", color: "text-emerald-500" },
    { title: "Posture Check", text: "Ensure your screen is at eye level and keep your feet flat on the floor while working.", icon: "📐", color: "text-amber-500" },
    { title: "Vitamin D Boost", text: "Spend 10 minutes in natural sunlight today to support bone health and immune system.", icon: "☀️", color: "text-orange-500" },
    { title: "Protein Power", text: "Include a protein source in every meal to help stabilize blood sugar and maintain muscle.", icon: "🍳", color: "text-red-500" },
    { title: "Steps Matter", text: "Try to take a 10-minute walk after lunch to improve digestion and metabolism.", icon: "🚶", color: "text-teal-500" }
  ];

  const getDailyTip = () => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return t.healthTips[dayOfYear % t.healthTips.length];
  };

  const dailyTip = getDailyTip();

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-slate-50 shadow-2xl overflow-hidden relative sm:border-x border-slate-200">
      <a href="#chat-input" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-brand focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to chat input
      </a>

      {/* Header */}
      <header className="px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-[40] shrink-0" role="banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all rounded-xl border border-slate-200 active:scale-95"
                aria-label="Back to home"
                title="Back to home"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20" aria-hidden="true">
              <Heart size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-slate-900 tracking-tight">{t.appName}</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t.alwaysConnected}</p>
              </div>
            </div>
          </div>
          
            <div className="flex items-center gap-1.5">
              <div className="relative group mr-1">
                <div className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all rounded-xl border border-slate-200 cursor-pointer">
                  <Languages size={16} className="text-brand" />
                  <select 
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                    className="bg-transparent text-[11px] font-bold outline-none border-none cursor-pointer appearance-none pr-1 uppercase tracking-tight"
                    aria-label="Select Language"
                  >
                    <option value="English">ENG</option>
                    <option value="Hindi">हिन्दी</option>
                    <option value="Kannada">ಕನ್ನಡ</option>
                    <option value="Telugu">తెలుగు</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={() => setIsInventoryOpen(true)}
                className={cn(
                  "p-2.5 transition-all rounded-xl border relative",
                  expiringSoonCount > 0 
                  ? "bg-amber-50 text-amber-600 border-amber-200" 
                  : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                )}
                aria-label="Medicine Cabinet"
                title="Medicine Cabinet"
              >
                <Pill size={18} />
                {expiringSoonCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce-slow">
                    {expiringSoonCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setIsEmergencyOpen(true)}
              className="p-2.5 bg-brand/5 hover:bg-brand/10 text-brand transition-all rounded-xl border border-brand/10"
              aria-label="Find nearby care"
              title="Nearby Care"
            >
              <MapPin size={18} />
            </button>
            <button 
              onClick={() => setIsEmergencyOpen(true)}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 transition-all rounded-xl border border-red-100"
              aria-label="Emergency SOS"
              title="Emergency SOS"
            >
              <AlertCircle size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="group relative">
              <button 
                onClick={logout}
                className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all rounded-xl border border-transparent hover:border-slate-200"
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
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

      {/* Main Chat Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
        aria-live="polite"
        aria-atomic="false"
        id="chat-log"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && !isLoading && (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-10 px-4 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-brand to-cyan-400 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-6 relative group">
                <Heart size={40} fill="currentColor" />
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-[10px] font-bold py-1 px-2 rounded-full border-2 border-white shadow-sm">{t.aiPowered}</div>
              </div>
              <h2 className="text-3xl font-display font-bold text-slate-900 mb-3 tracking-tight">{t.howCanIHelp}</h2>
              <p className="text-slate-500 text-sm max-w-sm mb-10 leading-relaxed font-medium">
                {t.appSubtitle}
              </p>
              
              <div className="w-full grid grid-cols-2 gap-4" aria-label="Quick start options">
                {modes.map((mode, i) => (
                  <motion.button
                    key={mode.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      if ('action' in mode && mode.action) {
                        mode.action();
                      } else if ('prompt' in mode && mode.prompt) {
                        handleSend(mode.prompt);
                      }
                    }}
                    className="group p-5 bg-white border border-slate-100 rounded-3xl text-left hover:border-brand/40 hover:bg-brand/[0.02] transition-all active:scale-[0.98] shadow-sm hover:shadow-xl hover:shadow-brand/5 flex flex-col gap-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-10 transition-opacity">
                      <mode.icon size={60} />
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                      mode.id === 'sos' ? "bg-red-50 text-red-600" : "bg-brand/5 text-brand"
                    )}>
                      <mode.icon size={22} />
                    </div>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-brand">{mode.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id || `msg-${idx}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex w-full mb-4",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "flex max-w-[85%] gap-3",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center mt-1 overflow-hidden shadow-sm",
                  msg.role === 'user' ? "bg-white text-slate-400 border border-slate-200" : "bg-brand text-white"
                )}>
                  {msg.role === 'user' ? (
                    activeUser?.photoURL ? <img src={activeUser.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={18} />
                  ) : <Sparkles size={18} />}
                </div>
                <div className={cn(
                  "p-4 shadow-sm relative",
                  msg.role === 'user' 
                    ? "chat-bubble-user" 
                    : "chat-bubble-ai"
                )}>
                  <div className="markdown-body prose-sm max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  {idx === messages.length - 1 && msg.role === 'model' && (
                    <div className="mt-4 pt-4 border-t border-slate-100/50 text-[10px] text-slate-400 flex items-start gap-1 font-medium">
                      <ShieldCheck size={12} className="mt-0.5 text-brand" aria-hidden="true" />
                      <span>{t.medicalDisclaimer}</span>
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
                <div className="w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center bg-brand text-white mt-1 shadow-md shadow-brand/20">
                  <Sparkles size={18} className="animate-spin duration-700" />
                </div>
                <div className="chat-bubble-ai p-4 flex items-center gap-2 h-12">
                  <div className="flex gap-1">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-2 h-2 bg-brand/40 rounded-full" />
                    <motion.span animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-brand/40 rounded-full" />
                    <motion.span animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-brand/40 rounded-full" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Input Area */}
      <footer className="p-6 pb-8 bg-white border-t border-slate-100 z-[40]">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center gap-3 pt-2"
        >
          <div className="relative flex-1 group">
            <input
              id="chat-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.askPlaceholder}
              className="w-full bg-slate-100 border border-transparent rounded-[2rem] py-4 pl-6 pr-14 text-sm focus:bg-white focus:border-brand/30 focus:ring-4 focus:ring-brand/5 shadow-inner transition-all outline-none font-medium placeholder:text-slate-400"
              disabled={isLoading}
              aria-label="Chat input"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all",
                input.trim() && !isLoading 
                  ? "bg-brand text-white shadow-lg shadow-brand/20 hover:scale-105 active:scale-95" 
                  : "text-slate-300"
              )}
            >
              <Send size={20} />
            </button>
          </div>
          <button 
            type="button"
            onClick={() => setMessages([])}
            className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 flex-shrink-0"
            title={t.resetChat}
          >
            <History size={20} />
          </button>
        </form>
        <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="mt-6 p-4 rounded-3xl bg-gradient-to-br from-white to-brand/5 border border-brand/10 shadow-sm relative overflow-hidden group"
        >
            <div className="flex items-start gap-4 relative z-10">
              <div className="text-2xl group-hover:scale-110 transition-transform duration-500">{dailyTip.icon}</div>
              <div className="flex-1">
                <h4 className={cn("text-xs font-black uppercase tracking-widest mb-1", dailyTip.color)}>
                  {t.dailyWisdom} • {dailyTip.title}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed leading-tight">
                 {dailyTip.text}
               </p>
             </div>
           </div>
           <div className="absolute -bottom-4 -right-4 text-brand/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ShieldCheck size={80} />
           </div>
        </motion.div>
      </footer>
    </div>
  );
}
