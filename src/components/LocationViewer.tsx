import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion } from 'motion/react';
import { Heart, MapPin, Clock, User, AlertCircle, Share2, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const markerShadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

export default function LocationViewer({ shareId }: { shareId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'locationShares', shareId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const docData = docSnap.data();
        // Check expiry client-side too
        if (docData.expiresAt.toDate() < new Date()) {
          setError("This location share link has expired.");
          setData(null);
        } else {
          setData(docData);
          setError(null);
        }
      } else {
        setError("Location share link not found or invalid.");
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      handleFirestoreError(err, OperationType.GET, `locationShares/${shareId}`);
      setError("Unable to access location share. It may have expired or been deleted.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-teal-600"
        >
          <MapPin size={48} />
        </motion.div>
        <p className="text-slate-500 font-medium animate-pulse">Connecting to live location...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-display font-bold text-slate-900 mb-2">Link Unavailable</h2>
        <p className="text-slate-500 max-w-xs mx-auto mb-6">{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-teal-700 transition-all active:scale-95"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const coords: [number, number] = [data.lat, data.lon];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="p-4 bg-white border-b shadow-sm z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white">
            <Heart size={20} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-display font-bold text-slate-900">PocketHealth AI</h1>
            <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Live Health Share</p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-red-50 text-red-600 rounded-full flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wide">Live</span>
        </div>
      </header>

      <div className="flex-1 relative">
        <MapContainer 
          center={coords} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ChangeView center={coords} />
          <Marker position={coords} icon={DefaultIcon}>
            <Popup>
              <div className="font-bold">{data.userName}'s Current Location</div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Info Card */}
        <div className="absolute bottom-6 left-6 right-6 z-[400]">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{data.userName}</h3>
                  <p className="text-xs text-slate-500">Is sharing their location with you</p>
                </div>
              </div>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lon}`, '_blank')}
                className="bg-teal-600 text-white p-3 rounded-2xl shadow-lg shadow-teal-200 active:scale-95 transition-all"
              >
                <Navigation size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock size={16} className="text-slate-400" />
                <div className="text-xs">
                  <p className="text-slate-400 font-medium">Last updated</p>
                  <p className="font-bold">{data.updatedAt.toDate().toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Share2 size={16} className="text-slate-400" />
                <div className="text-xs">
                  <p className="text-slate-400 font-medium">Expires at</p>
                  <p className="font-bold">{data.expiresAt.toDate().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      <footer className="p-4 bg-white text-center border-t">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
          Secured by PocketHealth AI • Do not share this link with unauthorized persons
        </p>
      </footer>
    </div>
  );
}
