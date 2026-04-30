import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Calendar,
  Pill,
  Clock,
  Info,
  Loader2
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';

interface Medicine {
  id: string;
  medicineName: string;
  detectedDate: string | null;
  mfgDate: string | null;
  status: 'expired' | 'warning' | 'valid' | 'estimated';
  purpose?: string;
  typicalShelfLife?: string;
  scannedAt: any;
  daysLeft?: number;
}

interface MedicineInventoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MedicineInventory({ isOpen, onClose }: MedicineInventoryProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'expired' | 'warning'>('all');

  useEffect(() => {
    if (!auth.currentUser || !isOpen) return;

    const path = `users/${auth.currentUser.uid}/medicines`;
    const q = query(
      collection(db, path),
      orderBy('scannedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Medicine[];
      setMedicines(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/medicines/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = m.medicineName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'all') return matchesSearch;
    return matchesSearch && m.status === filter;
  });

  const expiringCount = medicines.filter(m => m.status === 'warning').length;
  const expiredCount = medicines.filter(m => m.status === 'expired').length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xl font-display font-bold text-slate-900">Medicine Cabinet</h3>
              <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
                <Pill size={12} className="text-brand" />
                {medicines.length} Medicines tracked
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all rounded-full"
            >
              <X size={24} />
            </button>
          </div>

          {/* Stats / Reminders */}
          {(expiringCount > 0 || expiredCount > 0) && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex gap-4 overflow-x-auto no-scrollbar">
              {expiredCount > 0 && (
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200">
                  <AlertTriangle size={14} />
                  {expiredCount} Expired
                </div>
              )}
              {expiringCount > 0 && (
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold border border-amber-200">
                  <Clock size={14} />
                  {expiringCount} Near Expiry
                </div>
              )}
            </div>
          )}

          {/* Search & Filter */}
          <div className="p-4 space-y-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search medicines..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                />
             </div>
             <div className="flex gap-2">
                {(['all', 'warning', 'expired'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border capitalize",
                      filter === f 
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {f}
                  </button>
                ))}
             </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                 <Loader2 className="text-brand animate-spin" size={32} />
                 <p className="text-slate-400 text-sm font-medium">Loading cabinet...</p>
              </div>
            ) : filteredMedicines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <Pill size={32} />
                 </div>
                 <p className="text-slate-900 font-bold mb-1">No Medicines Found</p>
                 <p className="text-slate-500 text-xs leading-relaxed">
                   Scan your medicine packets to keep track of their expiry dates and usage.
                 </p>
              </div>
            ) : (
              filteredMedicines.map((med, idx) => (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "group relative p-4 rounded-3xl border transition-all flex items-start gap-4",
                    med.status === 'expired' ? "bg-red-50/30 border-red-100/50 hover:bg-red-50/50" :
                    med.status === 'warning' ? "bg-amber-50/30 border-amber-100/50 hover:bg-amber-50/50" :
                    "bg-white border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    med.status === 'expired' ? "bg-red-100 text-red-600" :
                    med.status === 'warning' ? "bg-amber-100 text-amber-600" :
                    "bg-emerald-100 text-emerald-600"
                  )}>
                    {med.status === 'expired' ? <AlertTriangle size={22} /> : 
                     med.status === 'warning' ? <Clock size={22} /> : <CheckCircle size={22} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-slate-900 truncate pr-2">{med.medicineName}</h4>
                      <button 
                        onClick={() => handleDelete(med.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                       <span className={cn(
                         "uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                         med.status === 'expired' ? "bg-red-100 text-red-700" :
                         med.status === 'warning' ? "bg-amber-100 text-amber-700" :
                         "bg-emerald-100 text-emerald-700"
                       )}>
                         {med.status}
                       </span>
                       <span className="text-slate-400">•</span>
                       <span className="text-slate-500 flex items-center gap-1">
                          <Calendar size={10} />
                          EXP: {med.detectedDate || "Estimated"}
                       </span>
                    </div>
                    {med.purpose && (
                       <p className="mt-2 text-[10px] text-slate-500 leading-tight italic truncate">
                         {med.purpose}
                       </p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
          
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
             <Info size={14} className="text-brand" />
             <p className="text-[10px] text-slate-500 font-medium">
               Medications are tracked based on your scans. Always check physical packaging before use.
             </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
