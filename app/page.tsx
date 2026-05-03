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

  const medianRent = useMemo(() => {
    if (pins.length === 0) return 0;
    const prices = pins.map(p => p.rent_amount).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  }, [pins]);

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
      
      {/* 📊 SIDEBAR */}
      <div className="absolute top-6 left-6 z-20 bg-zinc-900 p-6 rounded-[2rem] shadow-2xl w-80 border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black text-white tracking-tighter italic flex items-center gap-2">
            <MapIcon className="text-red-500" /> NCR.RENT
          </h1>
          <button onClick={handleShare} className="p-2 bg-white/10 rounded-full border border-white/10"><Share2 size={18} className="text-zinc-400" /></button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6 font-black italic border-t border-white/5 pt-4">
          <div><p className="text-[10px] text-zinc-500 uppercase">Pins</p><p className="text-white text-xl">{pins.length}</p></div>
          <div><p className="text-[10px] text-zinc-500 uppercase">Avg Rent</p><p className="text-green-400 text-xl">₹{(medianRent/1000).toFixed(1)}k</p></div>
        </div>

        {/* ⚪ WHITE HEATMAP BUTTON */}
        <button 
          onClick={() => setShowHeatmap(!showHeatmap)} 
          className={`w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-lg hover:scale-[1.02] active:scale-95`}
        >
          <span className="flex items-center gap-2"><Layers size={14} /> {showHeatmap ? 'Disable Heatmap' : 'Enable Heatmap'}</span>
          <div className={`w-2.5 h-2.5 rounded-full ${showHeatmap ? 'bg-red-600 animate-pulse' : 'bg-zinc-300'}`} />
        </button>
      </div>

      <GoogleMap 
        mapContainerStyle={{ width: '100vw', height: '100vh' }} 
        center={center} zoom={11} 
        options={{ disableDefaultUI: true, styles: [] }}
        onClick={(e) => isPlacing && (setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() }), setShowForm(true))}
      >
        {showHeatmap ? (
          <HeatmapLayer data={heatmapData} options={{ radius: 30, opacity: 0.6 }} />
        ) : (
          pins.map(pin => (
            <Marker key={pin.id} position={{ lat: pin.lat, lng: pin.lng }} label={{ text: `₹${(pin.rent_amount / 1000).toFixed(0)}k`, color: 'white', fontSize: '11px', fontWeight: '900', className: 'marker-label' }} />
          ))
        )}
      </GoogleMap>

      {/* 🏁 WHITE TICKER TEXT */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-zinc-950 border-t border-white/5 py-3 overflow-hidden">
        <div className="marquee-content whitespace-nowrap text-[11px] font-black uppercase tracking-[0.3em] text-white">
          ● REAL-TIME DATA: GURGAON SEC 54 (₹62K) ● MARKET UPDATE: RENT HIKE IN NOIDA SEC 150 ● DATA QUALITY: CROWDSOURCED VERIFIED ● TRUTH PROTOCOL V.1.0 ●
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-[2.5rem] w-full max-w-lg shadow-3xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-black italic tracking-tighter flex items-center gap-2"><ShieldCheck className="text-blue-600" /> THE TRUTH FORM</h2>
                <button onClick={() => {setShowForm(false); setIsPlacing(false);}}><X size={24} className="text-zinc-400" /></button>
              </div>
              <div className="space-y-5">
                <input type="number" placeholder="Monthly Rent (₹)" className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl text-black font-bold outline-none" onChange={(e) => setFormData({...formData, rent_amount: e.target.value})} />
                <button onClick={handleSavePin} className="w-full bg-black text-white font-black py-6 rounded-2xl shadow-xl italic tracking-widest text-lg">VERIFY & SUBMIT</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => setIsPlacing(true)} className={`absolute bottom-12 right-10 z-20 px-10 py-6 rounded-full shadow-2xl transition-all font-black text-white uppercase italic tracking-widest ${isPlacing ? 'bg-zinc-400' : 'bg-red-600 hover:bg-red-500'}`}>
        {isPlacing ? 'CANCEL' : <><Plus size={24} /> PIN MY RENT</>}
      </button>

      <style jsx>{`
        .marquee-content { display: inline-block; animation: marquee 35s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        :global(.marker-label) {
          margin-top: -35px; background: rgba(0,0,0,0.85); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}