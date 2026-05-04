'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer } from '@react-google-maps/api';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Map as MapIcon, X, Share2, Copy, 
  Navigation, PartyPopper, Layers, 
  ShieldCheck, Search, Home, ChevronRight, Info
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
  const [seekers, setSeekers] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  const [activeFlow, setActiveFlow] = useState<'NONE' | 'SELECTION' | 'TRUTH' | 'SEEKER'>('NONE');
  const [seekerStep, setSeekerStep] = useState<'HOW_IT_WORKS' | 'PLACING' | 'FORM'>('HOW_IT_WORKS');
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Expanded Data State to match video exactly
  const [seekerData, setSeekerData] = useState({
    look_for: 'Room in a Flat',
    budget: '',
    bhk_pref: 'Any',
    timeline: 'Flexible',
    food: 'Any',
    smoking: 'Non-smoker',
    gender: 'Male',
    flatmate_gender: 'Any',
    parking: 'No preference',
    lifestyle: '',
    email: '',
    phone: ''
  });

  useEffect(() => { fetchPins(); fetchSeekers(); }, []);
  async function fetchPins() { const { data } = await supabase.from('rent_pins').select('*'); if (data) setPins(data); }
  async function fetchSeekers() { const { data } = await supabase.from('seeker_pins').select('*'); if (data) setSeekers(data); }

  const handleSaveSeeker = async () => {
    if (!tempCoords || !seekerData.budget) return alert("Please fill mandatory fields.");
    const { error } = await supabase.from('seeker_pins').insert([{
        lat: tempCoords.lat, lng: tempCoords.lng,
        look_for: seekerData.look_for,
        budget: parseInt(seekerData.budget),
        bhk_pref: seekerData.bhk_pref,
        move_timeline: seekerData.timeline,
        food_pref: seekerData.food,
        smoking_pref: seekerData.smoking,
        gender: seekerData.gender,
        flatmate_gender: seekerData.flatmate_gender,
        parking_req: seekerData.parking,
        lifestyle: seekerData.lifestyle,
        contact_email: seekerData.email,
        contact_phone: seekerData.phone
    }]);
    if (!error) {
      setActiveFlow('NONE'); setTempCoords(null); setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchSeekers();
    }
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center font-black italic text-2xl uppercase">NCR.RENT</div>;

  return (
    <div className={`relative w-full h-screen bg-white ${activeFlow !== 'NONE' ? 'cursor-crosshair' : ''}`}>
      
      {/* 📊 MINI SIDEBAR */}
      <div className="absolute top-4 left-4 z-20 bg-zinc-900/95 p-4 rounded-3xl shadow-2xl w-72 border border-white/10">
        <h1 className="text-xl font-black text-white italic flex items-center gap-2 mb-3">
          <MapIcon size={18} className="text-red-500" /> NCR.RENT
        </h1>
        <div className="grid grid-cols-2 gap-2 mb-4 font-bold italic border-t border-white/5 pt-3">
          <div><p className="text-[8px] text-zinc-500 uppercase">Pins</p><p className="text-white text-sm">{pins.length}</p></div>
          <div><p className="text-[8px] text-zinc-500 uppercase">Seekers</p><p className="text-blue-400 text-sm">{seekers.length}</p></div>
        </div>
        <button onClick={() => setShowHeatmap(!showHeatmap)} className="w-full flex items-center justify-between p-3 rounded-xl text-[9px] font-black uppercase bg-white text-black">
          <span><Layers size={12} className="inline mr-1"/> Heatmap</span>
          <div className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-red-600 animate-pulse' : 'bg-zinc-300'}`} />
        </button>
      </div>

      <GoogleMap 
        mapContainerStyle={{ width: '100vw', height: '100vh' }} 
        center={center} zoom={12} 
        options={{ disableDefaultUI: true }}
        onClick={(e) => {
          if (activeFlow === 'SEEKER' && seekerStep === 'PLACING') {
            setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() });
            setSeekerStep('FORM');
          }
        }}
      >
        {pins.map(p => <Marker key={p.id} position={{lat: p.lat, lng: p.lng}} label={{text: `₹${(p.rent_amount/1000).toFixed(0)}k`, color: 'white', fontSize: '10px', fontWeight: '900', className: 'marker-label'}} />)}
        {seekers.map(s => <Marker key={s.id} position={{lat: s.lat, lng: s.lng}} icon={{url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"}} />)}
      </GoogleMap>

      {/* 🏁 1. SELECTION DIALOG (Match video exactly) */}
      <AnimatePresence>
        {activeFlow === 'SELECTION' && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-white/10 p-6 rounded-[2rem] w-full max-w-sm shadow-3xl text-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest">Find Flat or Tenants</h2>
                <button onClick={() => setActiveFlow('NONE')}><X size={18} className="text-zinc-500" /></button>
              </div>
              <div className="space-y-3">
                <button onClick={() => setActiveFlow('TRUTH')} className="w-full bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center gap-3 transition-all border border-white/5">
                  <Home className="text-red-500" size={20} />
                  <div className="text-left text-xs"><p className="font-bold">I have a flat</p><p className="text-[9px] text-zinc-500 uppercase">Find a roommate or flatmate</p></div>
                </button>
                <button onClick={() => { setActiveFlow('SEEKER'); setSeekerStep('HOW_IT_WORKS'); }} className="w-full bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center gap-3 transition-all border border-white/5">
                  <Search className="text-blue-400" size={20} />
                  <div className="text-left text-xs"><p className="font-bold">I'm looking for a flat</p><p className="text-[9px] text-zinc-500 uppercase">Get matched with pins nearby</p></div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📝 2. SEEKER FORM (Exact Copy of Video Details) */}
      <AnimatePresence>
        {activeFlow === 'SEEKER' && seekerStep === 'FORM' && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="bg-[#0f172a] text-white p-6 rounded-3xl w-full max-w-lg shadow-3xl my-auto text-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Drop a Seeker Pin</h2>
                <button onClick={() => setActiveFlow('NONE')}><X size={20}/></button>
              </div>
              
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Look For */}
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase mb-2">I'm looking for:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Whole Flat', 'Room in a Flat'].map(t => (
                      <button key={t} onClick={() => setSeekerData({...seekerData, look_for: t})} className={`p-2 rounded-lg text-xs font-bold border ${seekerData.look_for === t ? 'bg-emerald-600 border-emerald-500' : 'bg-zinc-800 border-zinc-700'}`}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700">
                  <p className="text-[10px] text-zinc-400 uppercase">Budget per room (₹/month)*</p>
                  <input type="number" placeholder="e.g. 15000" className="bg-transparent w-full mt-1 font-bold outline-none text-white" onChange={(e) => setSeekerData({...seekerData, budget: e.target.value})} />
                  <p className="text-[9px] text-zinc-500 mt-2 italic flex items-center gap-1"><Info size={10}/> Median rent in 1km radius: 1BHK: ₹11k | 2BHK: ₹18k</p>
                </div>

                {/* BHK Preference */}
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase mb-2">BHK Preference</p>
                  <div className="flex gap-2">
                    {['1', '2', '3', 'Any'].map(b => (
                      <button key={b} onClick={() => setSeekerData({...seekerData, bhk_pref: b})} className={`flex-1 p-2 rounded-lg text-xs font-bold ${seekerData.bhk_pref === b ? 'bg-zinc-100 text-black' : 'bg-zinc-800'}`}>{b}</button>
                    ))}
                  </div>
                </div>

                {/* Food & Smoking */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase mb-2">Food preference</p>
                    <select className="bg-zinc-800 w-full p-2 rounded-lg text-xs outline-none" onChange={(e) => setSeekerData({...seekerData, food: e.target.value})}>
                      <option>Any</option><option>Veg</option><option>Non-veg</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase mb-2">Smoking Okay?</p>
                    <select className="bg-zinc-800 w-full p-2 rounded-lg text-xs outline-none" onChange={(e) => setSeekerData({...seekerData, smoking: e.target.value})}>
                      <option>Non-smoker</option><option>Smoker</option><option>No preference</option>
                    </select>
                  </div>
                </div>

                {/* Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase mb-2">You are</p>
                    <select className="bg-zinc-800 w-full p-2 rounded-lg text-xs outline-none" onChange={(e) => setSeekerData({...seekerData, gender: e.target.value})}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase mb-2">Flatmate Preference</p>
                    <select className="bg-zinc-800 w-full p-2 rounded-lg text-xs outline-none" onChange={(e) => setSeekerData({...seekerData, flatmate_gender: e.target.value})}>
                      <option>Any</option><option>Male</option><option>Female</option>
                    </select>
                  </div>
                </div>

                <textarea placeholder="Lifestyle (e.g. Night owl, work from home...)" className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-xs h-20 outline-none" onChange={(e) => setSeekerData({...seekerData, lifestyle: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-2">
                  <input type="email" placeholder="Email" className="bg-zinc-800 p-3 rounded-xl text-xs outline-none" onChange={(e) => setSeekerData({...seekerData, email: e.target.value})} />
                  <input type="tel" placeholder="Phone" className="bg-zinc-800 p-3 rounded-xl text-xs outline-none" onChange={(e) => setSeekerData({...seekerData, phone: e.target.value})} />
                </div>
              </div>

              <button onClick={handleSaveSeeker} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl mt-6 text-xs uppercase tracking-widest shadow-lg">Drop Seeker Pin</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏁 BOTTOM BAR (Spoonfeed: Centered and sleek) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setActiveFlow('SELECTION')} className="bg-black text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition-all border border-white/20">
          <div className="bg-red-600 p-1.5 rounded-lg"><Plus size={16} /></div>
          <span className="font-bold text-[10px] uppercase tracking-tighter">Find Flat or Tenants — Tap to Start</span>
        </button>
      </div>

      <style jsx>{`
        .marker-label { margin-top: -30px; background: black; padding: 2px 6px; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
      `}</style>
    </div>
  );
}