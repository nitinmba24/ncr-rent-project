'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer } from '@react-google-maps/api';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Map as MapIcon, X, Share2, Copy, 
  Navigation, PartyPopper, Layers, 
  ShieldCheck 
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const center = { lat: 28.6139, lng: 77.2090 };

export default function NCRRentMap() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['visualization']
  });

  const [pins, setPins] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false); 
  const [showForm, setShowForm] = useState(false);   
  const [showSuccess, setShowSuccess] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [formData, setFormData] = useState({
    rent_amount: '',
    maintenance_fee: '',
    comment: ''
  });

  useEffect(() => { fetchPins(); }, []);

  async function fetchPins() {
    const { data } = await supabase.from('rent_pins').select('*');
    if (data) setPins(data);
  }

  // --- RE-RESTORED STATISTICS FOR MBA PRESENTATION ---
  const medianRent = useMemo(() => {
    if (pins.length === 0) return 0;
    const prices = pins.map(p => p.rent_amount).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  }, [pins]);

  // --- BUILD-SAFE HEATMAP DATA (Fixes the Window.Google error) ---
  const heatmapData = useMemo(() => {
    if (!isLoaded || typeof window === 'undefined' || !(window as any).google) return [];
    return pins.map(p => ({
      location: new (window as any).google.maps.LatLng(p.lat, p.lng),
      weight: 1
    }));
  }, [pins, isLoaded]);

  const handleShare = async () => {
    const shareData = {
      title: 'NCR.RENT - Truth in Housing',
      text: 'Check out the live rent map for Delhi NCR!',
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      setNotificationMsg("LINK COPIED TO CLIPBOARD!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleSavePin = async () => {
    if (!tempCoords || !formData.rent_amount) return alert("Please enter the rent amount.");
    const { error } = await supabase.from('rent_pins').insert([{
        rent_amount: parseInt(formData.rent_amount),
        lat: tempCoords.lat,
        lng: tempCoords.lng,
        maintenance_fee: parseInt(formData.maintenance_fee) || 0,
        comment: formData.comment,
        truth_score: 100
    }]);
    if (!error) {
      setShowForm(false); setIsPlacing(false); setTempCoords(null);
      setNotificationMsg("TRUTH PINNED SUCCESSFULLY!"); setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchPins();
    }
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center font-black italic text-4xl">NCR.RENT</div>;

  return (
    <div className={`relative w-full h-screen bg-white ${isPlacing ? 'cursor-crosshair' : ''}`}>
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ y: -100 }} animate={{ y: 20 }} exit={{ y: -100 }} className="absolute top-10 left-1/2 -translate-x-1/2 z-[60] bg-black text-white px-8 py-4 rounded-full font-black italic flex items-center gap-3">
            <PartyPopper size={20} /> {notificationMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 ANALYTICS SIDEBAR (RESTORED) */}
      <div className="absolute top-6 left-6 z-20 bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-zinc-200 shadow-xl w-80">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black text-black tracking-tighter flex items-center gap-2 italic">
            <MapIcon className="text-red-600" /> NCR.RENT
          </h1>
          <button onClick={handleShare} className="p-2 bg-zinc-100 rounded-full border border-zinc-200"><Share2 size={18} className="text-zinc-600" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4 font-black italic">
          <div><p className="text-[10px] text-zinc-500 uppercase">Pins</p><p className="text-black text-xl">{pins.length}</p></div>
          <div><p className="text-[10px] text-zinc-500 uppercase">Avg Rent</p><p className="text-green-600 text-xl">₹{(medianRent/1000).toFixed(1)}k</p></div>
        </div>
        <button onClick={() => setShowHeatmap(!showHeatmap)} className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold ${showHeatmap ? 'bg-orange-100 text-orange-700' : 'bg-zinc-50 text-zinc-600 border border-zinc-100'}`}>
          <span className="flex items-center gap-2"><Layers size={14} /> HEATMAP OVERLAY</span>
          <div className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-orange-500 animate-pulse' : 'bg-zinc-300'}`} />
        </button>
      </div>

      <GoogleMap 
        mapContainerStyle={{ width: '100vw', height: '100vh' }} 
        center={center} zoom={11} 
        options={{ disableDefaultUI: true }}
        onClick={(e) => isPlacing && (setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() }), setShowForm(true))}
      >
        {showHeatmap ? (
          <HeatmapLayer data={heatmapData} options={{ radius: 30, opacity: 0.6 }} />
        ) : (
          pins.map(pin => (
            <Marker key={pin.id} position={{ lat: pin.lat, lng: pin.lng }} label={{ text: `₹${(pin.rent_amount / 1000).toFixed(0)}k`, color: 'white', fontSize: '11px', fontWeight: '900' }} />
          ))
        )}
        {tempCoords && <Marker position={tempCoords} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }} />}
      </GoogleMap>

      <AnimatePresence>
        {showForm && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white border border-zinc-200 p-8 rounded-[2.5rem] w-full max-w-lg shadow-3xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-black italic tracking-tighter flex items-center gap-2"><ShieldCheck className="text-blue-600" /> THE TRUTH FORM</h2>
                <button onClick={() => {setShowForm(false); setIsPlacing(false);}}><X size={24} className="text-zinc-400" /></button>
              </div>
              <div className="space-y-5">
                <input type="number" placeholder="Monthly Rent (₹)" className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl text-black font-bold outline-none" onChange={(e) => setFormData({...formData, rent_amount: e.target.value})} />
                <input type="number" placeholder="Maintenance Fee (₹)" className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl text-black font-bold outline-none" onChange={(e) => setFormData({...formData, maintenance_fee: e.target.value})} />
                <textarea placeholder="Comments (Landlord, Water, Electricity...)" className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl text-black outline-none h-32 resize-none" onChange={(e) => setFormData({...formData, comment: e.target.value})} />
                <button onClick={handleSavePin} className="w-full bg-black text-white font-black py-6 rounded-2xl shadow-xl italic tracking-widest text-lg">VERIFY & SUBMIT</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => setIsPlacing(true)} className={`absolute bottom-12 right-10 z-20 px-10 py-6 rounded-full shadow-2xl transition-all font-black text-white uppercase italic tracking-widest ${isPlacing ? 'bg-zinc-400' : 'bg-red-600 hover:bg-red-500'}`}>
        {isPlacing ? 'CANCEL' : <><Plus size={24} /> PIN MY RENT</>}
      </button>

      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-md border-t border-zinc-200 py-3 overflow-hidden">
        <div className="marquee-content whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          ● VERIFIED: GURGAON SEC 54 - 2BHK (₹62K) ● ALERT: RENT HIKE OBSERVED IN NOIDA SEC 150 ● DATA QUALITY: 100% CROWDSOURCED ● TRUTH PROTOCOL ACTIVE ● 
        </div>
      </div>

      <style jsx>{`
        .marquee-content {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}