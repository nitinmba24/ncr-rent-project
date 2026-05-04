'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer } from '@react-google-maps/api';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Map as MapIcon, X, Share2, 
  Navigation, PartyPopper, Layers, 
  ShieldCheck, Search, Home, ChevronRight, Info, Heart
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
  const [showTruthForm, setShowTruthForm] = useState(false);
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");

  // SEEKER DATA (Exact Mirror of Video)
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

  // 📊 CALCULATE AVG RENT (Old Sidebar Feature)
  const avgRent = useMemo(() => {
    if (pins.length === 0) return 0;
    const total = pins.reduce((acc, pin) => acc + pin.rent_amount, 0);
    return total / pins.length;
  }, [pins]);

  const heatmapData = useMemo(() => {
    if (!isLoaded || typeof window === 'undefined' || !(window as any).google) return [];
    return pins.map(p => ({ location: new (window as any).google.maps.LatLng(p.lat, p.lng), weight: 1 }));
  }, [pins, isLoaded]);

  const handleSaveSeeker = async () => {
    if (!tempCoords || !seekerData.budget) return alert("Budget is required!");
    const { error } = await supabase.from('seeker_pins').insert([{
        lat: tempCoords.lat, lng: tempCoords.lng, look_for: seekerData.look_for,
        budget: parseInt(seekerData.budget), bhk_pref: seekerData.bhk_pref,
        move_timeline: seekerData.timeline, food_pref: seekerData.food,
        smoking_pref: seekerData.smoking, gender: seekerData.gender,
        flatmate_gender: seekerData.flatmate_gender, parking_req: seekerData.parking,
        lifestyle: seekerData.lifestyle, contact_email: seekerData.email, contact_phone: seekerData.phone
    }]);
    if (!error) { resetFlow(); setNotifMsg("SEEKER PIN DROPPED!"); setShowSuccess(true); fetchSeekers(); }
  };

  const resetFlow = () => {
    setActiveFlow('NONE'); setSeekerStep('HOW_IT_WORKS');
    setShowTruthForm(false); setTempCoords(null);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center font-black italic text-2xl uppercase">NCR.RENT</div>;

  return (
    <div className={`relative w-full h-screen bg-white ${activeFlow !== 'NONE' ? 'cursor-crosshair' : ''}`}>
      
      {/* 📊 RESTORED OLD SIDEBAR (image_a6eaa0.jpg style) */}
      <div className="absolute top-6 left-6 z-20 bg-zinc-900/95 p-6 rounded-[2rem] border border-white/10 shadow-2xl w-80">
        <h1 className="text-2xl font-black text-white italic flex items-center gap-2 mb-4">
          <MapIcon className="text-red-500" /> NCR.RENT
        </h1>
        <div className="grid grid-cols-2 gap-4 mb-6 font-black italic border-t border-white/5 pt-4">
          <div><p className="text-[10px] text-zinc-500 uppercase">Pins</p><p className="text-white text-xl">{pins.length}</p></div>
          <div><p className="text-[10px] text-zinc-500 uppercase">Avg Rent</p><p className="text-green-400 text-xl">₹{(avgRent/1000).toFixed(1)}k</p></div>
        </div>
        <button onClick={() => setShowHeatmap(!showHeatmap)} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase bg-white text-black shadow-lg">
          <span className="flex items-center gap-2"><Layers size={14} /> Heatmap Mode</span>
          <div className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-red-600 animate-pulse' : 'bg-zinc-700'}`} />
        </button>
      </div>

      <GoogleMap 
        mapContainerStyle={{ width: '100vw', height: '100vh' }} 
        center={center} zoom={11} 
        options={{ disableDefaultUI: true }}
        onClick={(e) => {
          const coords = { lat: e.latLng!.lat(), lng: e.latLng!.lng() };
          if (activeFlow === 'TRUTH') { setTempCoords(coords); setShowTruthForm(true); }
          else if (activeFlow === 'SEEKER' && seekerStep === 'PLACING') { setTempCoords(coords); setSeekerStep('FORM'); }
        }}
      >
        {pins.map(p => <Marker key={p.id} position={{lat: p.lat, lng: p.lng}} label={{text: `₹${(p.rent_amount/1000).toFixed(0)}k`, color: 'white', fontSize: '10px', fontWeight: '900', className: 'marker-label'}} />)}
        {seekers.map(s => <Marker key={s.id} position={{lat: s.lat, lng: s.lng}} icon={{url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"}} />)}
        {tempCoords && <Marker position={tempCoords} icon={{url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"}} />}
      </GoogleMap>

      {/* 🏁 1. SELECTION MODAL (Fixed Clicks) */}
      <AnimatePresence>
        {activeFlow === 'SELECTION' && (
          <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm shadow-3xl text-white relative">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-sm font-black uppercase italic tracking-widest">Find Flat or Tenants</h2>
                <button onClick={() => setActiveFlow('NONE')} className="p-2 hover:bg-white/5 rounded-full"><X size={20} className="text-zinc-500" /></button>
              </div>
              <div className="space-y-4">
                <button onClick={() => setActiveFlow('TRUTH')} className="w-full bg-white/5 hover:bg-white/10 p-5 rounded-3xl flex items-center gap-4 transition-all border border-white/5 text-left">
                  <div className="p-3 bg-zinc-800 rounded-2xl"><Home className="text-red-500" size={24} /></div>
                  <div><p className="font-black italic text-sm uppercase">I have a flat</p><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Report Truth / Find Roommate</p></div>
                </button>
                <button onClick={() => { setActiveFlow('SEEKER'); setSeekerStep('HOW_IT_WORKS'); }} className="w-full bg-white/5 hover:bg-white/10 p-5 rounded-3xl flex items-center gap-4 transition-all border border-white/5 text-left">
                  <div className="p-3 bg-zinc-800 rounded-2xl"><Search className="text-blue-400" size={24} /></div>
                  <div><p className="font-black italic text-sm uppercase">I'm looking for a flat</p><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Match with verified pins</p></div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📝 2. SEEKER FORM (EXACT MIRROR OF VIDEO ScreenRecorderProject15.mkv) */}
      <AnimatePresence>
        {activeFlow === 'SEEKER' && seekerStep === 'FORM' && (
          <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="bg-[#0f172a] text-white p-6 rounded-3xl w-full max-w-lg shadow-3xl my-auto text-xs">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                <h2 className="text-base font-bold">Drop a Seeker Pin</h2>
                <button onClick={() => setActiveFlow('NONE')}><X size={20}/></button>
              </div>
              
              <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Look For (Video Style) */}
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase font-black mb-2 tracking-widest italic">I'm looking for:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Whole Flat', 'Room in a Flat'].map(t => (
                      <button key={t} onClick={() => setSeekerData({...seekerData, look_for: t})} className={`p-2 rounded-lg text-[9px] font-black border transition-all ${seekerData.look_for === t ? 'bg-emerald-600 border-emerald-500' : 'bg-zinc-800 border-zinc-700'}`}>{t.toUpperCase()}</button>
                    ))}
                  </div>
                </div>

                {/* Budget + Stats */}
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                  <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Budget per room (₹/month)*</p>
                  <input type="number" placeholder="e.g. 15000" className="bg-transparent w-full font-bold outline-none text-white text-base" onChange={(e) => setSeekerData({...seekerData, budget: e.target.value})} />
                  <p className="text-[8px] text-zinc-500 mt-2 italic flex items-center gap-1"><Info size={10}/> Median rent in 1km radius: 1BHK ₹11k (15 pins) | 2BHK ₹18k (11 pins)</p>
                </div>

                {/* BHK Preference */}
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase font-black mb-2 tracking-widest italic">BHK Preference</p>
                  <div className="flex gap-2">
                    {['1', '2', '3', 'Any'].map(b => (
                      <button key={b} onClick={() => setSeekerData({...seekerData, bhk_pref: b})} className={`flex-1 p-2 rounded-lg text-[10px] font-black ${seekerData.bhk_pref === b ? 'bg-zinc-100 text-black' : 'bg-zinc-800'}`}>{b}</button>
                    ))}
                  </div>
                </div>

                {/* Timeline (From Video) */}
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase font-black mb-2 tracking-widest italic">Move in Timeline</p>
                  <div className="flex gap-2">
                    {['ASAP', 'Next month', 'Flexible'].map(t => (
                      <button key={t} onClick={() => setSeekerData({...seekerData, timeline: t})} className={`flex-1 p-2 rounded-lg text-[10px] font-black ${seekerData.timeline === t ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{t.toUpperCase()}</button>
                    ))}
                  </div>
                </div>

                {/* Smoking (From Video) */}
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase font-black mb-2 tracking-widest italic">Smoking Preference</p>
                  <div className="flex gap-2">
                    {['Smoker', 'Non-smoker', 'No preference'].map(s => (
                      <button key={s} onClick={() => setSeekerData({...seekerData, smoking: s})} className={`flex-1 p-2 rounded-lg text-[10px] font-black ${seekerData.smoking === s ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{s.toUpperCase()}</button>
                    ))}
                  </div>
                </div>

                {/* Parking (From Video) */}
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase font-black mb-2 tracking-widest italic">Parking Required?</p>
                  <div className="flex gap-2">
                    {['Yes', 'No preference'].map(p => (
                      <button key={p} onClick={() => setSeekerData({...seekerData, parking: p})} className={`flex-1 p-2 rounded-lg text-[10px] font-black ${seekerData.parking === p ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{p.toUpperCase()}</button>
                    ))}
                  </div>
                </div>

                {/* Lifestyle & Contact */}
                <textarea placeholder="Tell us about your lifestyle (e.g. Night owl, WFH...)" className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-xs h-20 outline-none font-bold" onChange={(e) => setSeekerData({...seekerData, lifestyle: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="email" placeholder="Email" className="bg-zinc-800 p-3 rounded-xl text-xs font-bold outline-none" onChange={(e) => setSeekerData({...seekerData, email: e.target.value})} />
                  <input type="tel" placeholder="Phone" className="bg-zinc-800 p-3 rounded-xl text-xs font-bold outline-none" onChange={(e) => setSeekerData({...seekerData, phone: e.target.value})} />
                </div>
              </div>

              <button onClick={handleSaveSeeker} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-xl mt-6 text-[10px] uppercase tracking-widest shadow-xl">Drop Seeker Pin</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔘 TRIGGER BUTTON */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100]">
        <button onClick={() => setActiveFlow('SELECTION')} className="bg-black text-white px-10 py-5 rounded-full shadow-2xl flex items-center gap-4 border border-white/20 active:scale-95 transition-all">
          <div className="bg-red-600 p-1.5 rounded-lg"><Plus size={18} /></div>
          <span className="font-black italic tracking-widest text-[10px] uppercase">Find Flat or Tenants — Tap to Start</span>
        </button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        :global(.marker-label) { margin-top: -35px; background: rgba(0,0,0,0.9); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}