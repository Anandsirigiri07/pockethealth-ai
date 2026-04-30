import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhoneCall, MapPin, X, Navigation, AlertCircle, ExternalLink, Loader2, Crosshair, Share2, Copy, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';

// ... (marker icon setup) ...
const markerIcon = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const markerShadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// ... (other icons) ...
const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pharmacyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Location {
  id: number;
  lat: number;
  lon: number;
  name: string;
  type: 'hospital' | 'pharmacy';
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 14);
  return null;
}

interface EmergencyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmergencyPanel({ isOpen, onClose }: EmergencyPanelProps) {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Live Sharing State
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shareDocRef = useRef<any>(null);
  const shareInterval = useRef<any>(null);

  const emergencyNumbers = [
    { label: 'Ambulance', number: '102', description: 'National Ambulance Service' },
    { label: 'Emergency (All-in-one)', number: '112', description: 'Single Emergency Response Number' },
    { label: 'Medical Helpline', number: '108', description: 'Disaster management/Emergency' },
  ];

  const fetchNearbyFacilities = async (lat: number, lon: number) => {
    try {
      const query = `
        [out:json];
        (
          node["amenity"="hospital"](around:5000,${lat},${lon});
          node["amenity"="pharmacy"](around:5000,${lat},${lon});
          way["amenity"="hospital"](around:5000,${lat},${lon});
          way["amenity"="pharmacy"](around:5000,${lat},${lon});
        );
        out center;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      const foundLocations: Location[] = data.elements.map((el: any) => ({
        id: el.id,
        lat: el.lat || el.center.lat,
        lon: el.lon || el.center.lon,
        name: el.tags.name || (el.tags.amenity === 'hospital' ? 'Unnamed Hospital' : 'Unnamed Pharmacy'),
        type: el.tags.amenity as 'hospital' | 'pharmacy'
      }));
      
      setLocations(foundLocations);
    } catch (err) {
      console.error("Failed to fetch facilities:", err);
      setError("Could not load nearby facilities. Please try again later.");
    }
  };

  const fallbackToIPLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);
        setCoords([lat, lon]);
        fetchNearbyFacilities(lat, lon);
        setError(null);
      } else {
        setError("Could not determine your location. Please try again.");
      }
    } catch {
      setError("Location unavailable. Check your internet connection and try again.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    setError(null);
    
    if (!navigator.geolocation) {
      // No browser geolocation - fall back to IP
      fallbackToIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords([latitude, longitude]);
        fetchNearbyFacilities(latitude, longitude);
        setIsLocating(false);
        
        // If we are already sharing, update the doc immediately
        if (isSharing && shareDocRef.current) {
          updateDoc(shareDocRef.current, {
            lat: latitude,
            lon: longitude,
            updatedAt: serverTimestamp()
          }).catch(console.error);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        // Fall back to IP-based location instead of showing error
        console.log("Falling back to IP-based geolocation...");
        fallbackToIPLocation();
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (isOpen && !coords) {
      handleGetLocation();
    }
  }, [isOpen]);

  const handleSOSCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const getDirections = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  };

  const startSharing = async () => {
    if (!coords || !auth.currentUser) return;
    
    setIsSharing(true);
    try {
      const shareData = {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous User',
        lat: coords[0],
        lon: coords[1],
        updatedAt: serverTimestamp(),
        // Expires in 1 hour
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      };
      
      const docRef = await addDoc(collection(db, 'locationShares'), shareData);
      shareDocRef.current = docRef;
      
      const shareUrl = `${window.location.origin}${window.location.pathname}?shareId=${docRef.id}`;
      setShareLink(shareUrl);

      // Set up interval to update location every 30 seconds
      shareInterval.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          updateDoc(docRef, {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            updatedAt: serverTimestamp()
          }).catch(console.error);
        });
      }, 30000);

    } catch (err) {
      console.error(err);
      setError("Failed to start location sharing.");
      setIsSharing(false);
    }
  };

  const stopSharing = () => {
    if (shareInterval.current) {
      clearInterval(shareInterval.current);
      shareInterval.current = null;
    }
    setIsSharing(false);
    setShareLink(null);
    shareDocRef.current = null;
  };

  const copyToClipboard = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white rounded-t-[2.5rem] shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[95vh]"
          >
            <div className="p-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full my-2" />
            </div>

            <div className="px-6 pb-6 pt-2 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                    <AlertCircle size={24} />
                  </div>
                  <h2 className="font-display font-bold text-2xl text-slate-900">Emergency SOS</h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Emergency Call Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                {emergencyNumbers.map((item) => (
                  <button
                    key={item.number}
                    onClick={() => handleSOSCall(item.number)}
                    className="bg-red-600 hover:bg-red-700 p-3 rounded-2xl flex flex-col items-center justify-center text-white transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
                  >
                    <PhoneCall size={20} className="mb-1" />
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                    <span className="text-[10px] opacity-90">{item.number}</span>
                  </button>
                ))}
              </div>

              {/* Live Sharing Component */}
              <div className="mb-6">
                {!isSharing ? (
                  <button
                    onClick={startSharing}
                    disabled={!coords}
                    className="w-full bg-brand hover:bg-brand-dark disabled:bg-slate-200 text-white p-5 rounded-[2rem] flex items-center justify-center gap-3 font-bold transition-all active:scale-[0.98] shadow-xl shadow-brand/20 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Share2 size={20} className="relative z-10" />
                    <span className="relative z-10">Start Live Location Share</span>
                  </button>
                ) : (
                  <div className="bg-brand/[0.02] border border-brand/20 rounded-[2.5rem] p-6 shadow-inner relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        <span className="text-sm font-bold text-slate-900 tracking-tight uppercase">Sharing Live</span>
                      </div>
                      <button 
                        onClick={stopSharing}
                        className="text-[10px] font-bold text-red-600 px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
                      >
                        STOP SHARE
                      </button>
                    </div>
                    
                    {shareLink && (
                      <div className="flex items-center gap-2 bg-white rounded-2xl border border-brand/10 p-1 pl-4 shadow-sm">
                        <div className="flex-1 overflow-hidden text-[11px] text-slate-500 font-medium truncate">
                          {shareLink}
                        </div>
                        <button
                          onClick={copyToClipboard}
                          className="bg-brand text-white p-2.5 rounded-xl hover:bg-brand-dark transition-all active:scale-90"
                        >
                          {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-4 text-center font-bold uppercase tracking-widest leading-relaxed">
                      Secure Link • Self-Destructs in 1 hr
                    </p>
                  </div>
                )}
              </div>

              {/* Map Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-slate-900">
                    <div className="w-8 h-8 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                      <MapPin size={16} />
                    </div>
                    <h3 className="font-bold text-xl tracking-tight">Nearby Facilities</h3>
                  </div>
                  <button 
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="text-[10px] font-black tracking-widest uppercase text-brand hover:text-brand-dark flex items-center gap-2 bg-brand/5 px-4 py-2 rounded-full transition-all border border-brand/10"
                  >
                    {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />}
                    {isLocating ? 'Scanning...' : 'Update'}
                  </button>
                </div>
                
                <div className="h-80 w-full rounded-3xl overflow-hidden border border-slate-200 relative shadow-inner">
                  {!coords && !isLocating && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-[50]">
                      <MapPin size={32} className="text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">Location required</p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 z-[50] p-6 text-center">
                      <AlertCircle size={32} className="text-red-400 mb-2" />
                      <p className="text-sm text-red-600 font-bold">{error}</p>
                    </div>
                  )}

                  {isLocating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-[50]">
                      <div className="relative">
                        <Loader2 size={48} className="text-brand animate-spin mb-4" />
                        <MapPin size={22} className="absolute top-3.5 left-3.5 text-brand" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 tracking-tight">Calibrating Location...</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Satellite Precision</p>
                    </div>
                  )}

                  {coords && (
                    <MapContainer 
                      center={coords} 
                      zoom={14} 
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <ChangeView center={coords} />
                      
                      <Marker position={coords}>
                        <Popup>Your Location</Popup>
                      </Marker>

                      {locations.map((loc) => (
                        <Marker 
                          key={loc.id} 
                          position={[loc.lat, loc.lon]}
                          icon={loc.type === 'hospital' ? hospitalIcon : pharmacyIcon}
                        >
                          <Popup>
                            <div className="p-1 min-w-[150px]">
                              <p className="font-bold text-slate-900 mb-1 leading-tight">{loc.name}</p>
                              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
                                {loc.type}
                              </p>
                              <button
                                onClick={() => getDirections(loc.lat, loc.lon)}
                                className="w-full bg-brand text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-brand/20 active:scale-95 transition-all"
                              >
                                <Navigation size={12} /> Get Directions
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  )}
                </div>
                <div className="flex gap-5 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" /> Hospital
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_5px_rgba(37,99,235,0.5)]" /> Pharmacy
                  </div>
                </div>
                
                {/* Quick Action Navigation Buttons */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button
                    onClick={() => {
                      const url = coords 
                        ? `https://www.google.com/maps/search/hospitals/@${coords[0]},${coords[1]},15z` 
                        : 'https://www.google.com/maps/search/hospitals+near+me/';
                      window.open(url, '_blank');
                    }}
                    className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-3xl border border-slate-100 hover:border-brand/30 hover:bg-brand/5 transition-all text-slate-900 font-bold text-xs shadow-sm"
                  >
                    <Navigation size={18} className="text-brand" />
                    Hospitals
                  </button>
                  <button
                    onClick={() => {
                      const url = coords 
                        ? `https://www.google.com/maps/search/pharmacies/@${coords[0]},${coords[1]},15z` 
                        : 'https://www.google.com/maps/search/pharmacy+near+me/';
                      window.open(url, '_blank');
                    }}
                    className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-3xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-slate-900 font-bold text-xs shadow-sm"
                  >
                    <ExternalLink size={18} className="text-blue-500" />
                    Pharmacies
                  </button>
                </div>

                {/* Results List */}
                {locations.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <h4 className="font-bold text-slate-900 mb-2 px-1">Nearby Results ({locations.length})</h4>
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      {locations.map(loc => (
                        <div key={loc.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex-1 pr-4">
                            <h5 className="font-bold text-slate-900 text-sm mb-1">{loc.name}</h5>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                              {loc.type}
                            </span>
                          </div>
                          <button
                            onClick={() => getDirections(loc.lat, loc.lon)}
                            className="bg-brand/10 text-brand hover:bg-brand hover:text-white p-3 rounded-xl transition-colors shrink-0"
                          >
                            <Navigation size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex gap-4 items-start">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="text-sm text-amber-900 leading-relaxed">
                  <p className="font-bold text-lg mb-1">Before you leave...</p>
                  <p className="text-amber-800/80">
                    Ensure you have your identification (Aadhaar), previous medical records, and current medications. If you're alone, inform a family member of your destination.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
