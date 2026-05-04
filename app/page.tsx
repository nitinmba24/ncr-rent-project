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
  
  // Flow Management
  const [activeFlow, setActiveFlow] = useState<'NONE' | 'SELECTION' | 'TRUTH' | 'SEEKER'>('NONE');
  const [seekerStep, setSeekerStep] = useState<'HOW_IT_WORKS' | 'PLACING' | 'FORM'>('HOW_IT_WORKS');
  const [showTruthForm, setShowTruthForm] = useState(false);
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");

  const [truthData, setTruthData] = useState({ rent_amount: '', maintenance_fee: '', comment: '' });
  const [seekerData, setSeekerData] = useState({
    look_for: 'Room in a Flat', budget: '', bhk_pref: 'Any', timeline: 'Flexible',
    food: 'Any', smoking: 'Non-smoker', gender: 'Male', flatmate_gender: 'Any',
    parking: 'No preference', lifestyle: '', email: '', phone: ''
  });

  useEffect(() => { fetchPins(); fetchSeekers(); }, []);
  async function fetchPins() { const { data } = await supabase.from('rent_pins').select('*'); if (data) setPins(data); }
  async function fetchSeekers() { const { data } = await supabase.from('seeker_pins').select('*'); if (data) setSeekers(data); }

  const handleSaveTruth = async () => {
    if (!tempCoords || !truthData.rent_amount) return alert("Enter rent amount!");
    const { error } = await supabase.from('rent_pins').insert([{
        rent_amount: parseInt(truthData.rent_amount), lat: tempCoords.lat, lng: tempCoords.lng,
        maintenance_fee: parseInt(truthData.maintenance_fee) || 0, comment: truthData.comment, truth_score: 100
    }]);
    if (!error) {
      resetFlow(); setNotifMsg("TRUTH PINNED!"); setShowSuccess(true); fetchPins();
    }
  };

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
    if (!error) {
      resetFlow(); setNotifMsg("SEEKER PIN DROPPED!"); setShowSuccess(true); fetchSeekers();
    }
  };

  const resetFlow = () => {
    setActiveFlow('NONE'); setSeekerStep('HOW_IT_WORKS');
    setShowTruthForm(false); setTempCoords(null);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center font-black italic text-2xl uppercase">NCR.RENT</div>;

  return (
    <div className={`relative w-full h-screen bg-white ${activeFlow !== 'NONE' ? 'cursor-crosshair' : ''}`}>
      
      {/* 🔔 NOTIFICATION */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ y: -100 }} animate={{ y: 20 }} exit={{ y: -100 }} className="absolute top-10 left-1/2 -translate-x-1/2 z-[200] bg-zinc-900 text-white px-8 py-3 rounded-full font-black italic shadow-2xl border border-white/10 flex items-center gap-2">
            <PartyPopper size={18} /> {notifMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 SIDEBAR (Restored Command Center) */}
      <div className="absolute top-6 left-6 z-20 bg-zinc-900/95 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl w-80">
        <h1 className="text-2xl font-black text-white italic flex items-center gap-2 mb-4">
          <MapIcon className="text-red-500" /> NCR.RENT
        </h1>
        <div className="grid grid-cols-2 gap-4 mb-6 font-black italic border-t border-white/5 pt-4">
          <div><p className="text-[10px] text-zinc-500 uppercase">Pins</p><p className="text-white text-xl">{pins.length}</p></div>
          <div><p className="text-[10px] text-zinc-500 uppercase">Seekers</p><p className="text-blue-400 text-xl">{seekers.length}</p></div>
        </div>
        <button onClick={() => setShowHeatmap(!showHeatmap)} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase bg-white text-black">
          <span className="flex items-center gap-2"><Layers size={14} /> Heatmap Mode</span>
          <div className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-red-600 animate-pulse' : 'bg-zinc-700'}`} />
        </button>
      </div>

      <GoogleMap 
        mapContainerStyle={{ width: '100vw', height: '100vh' }} 
        center={center} zoom={11} 
        options={{ disableDefaultUI: true }}
        onClick={(e) => {
          if (activeFlow === 'TRUTH') { setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() }); setShowTruthForm(true); }
          else if (activeFlow === 'SEEKER' && seekerStep === 'PLACING') { setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() }); setSeekerStep('FORM'); }
        }}
      >
        {pins.map(p => <Marker key={p.id} position={{lat: p.lat, lng: p.lng}} label={{text: `₹${(p.rent_amount/1000).toFixed(0)}k`, color: 'white', fontSize: '10px', fontWeight: '900', className: 'marker-label'}} />)}
        {seekers.map(s => <Marker key={s.id} position={{lat: s.lat, lng: s.lng}} icon={{url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"}} />)}
        {tempCoords && <Marker position={tempCoords} icon={{url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"}} />}
      </GoogleMap>

      {/* 🏁 1. THE MAIN MODAL (Fixed Clicks) */}
      <AnimatePresence>
        {activeFlow === 'SELECTION' && (
          <div 
            className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setActiveFlow('NONE')} // Closes if you click the background
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm shadow-3xl text-white relative"
              onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-sm font-black uppercase tracking-widest italic">Find Flat or Tenants</h2>
                <button onClick={() => setActiveFlow('NONE')} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={20} className="text-zinc-500" /></button>
              </div>

              <div className="space-y-4">
                {/* BUTTON: I HAVE A FLAT */}
                <motion.button 
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); setActiveFlow('TRUTH'); }}
                  className="w-full bg-white/5 hover:bg-white/10 p-5 rounded-3xl flex items-center gap-4 transition-all border border-white/5 text-left pointer-events-auto"
                >
                  <div className="p-3 bg-zinc-800 rounded-2xl"><Home className="text-red-500" size={24} /></div>
                  <div><p className="font-black italic text-sm uppercase">I have a flat</p><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Report Truth / Find Roommate</p></div>
                </motion.button>

                {/* BUTTON: I'M LOOKING */}
                <motion.button 
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); setActiveFlow('SEEKER'); setSeekerStep('HOW_IT_WORKS'); }}
                  className="w-full bg-white/5 hover:bg-white/10 p-5 rounded-3xl flex items-center gap-4 transition-all border border-white/5 text-left pointer-events-auto"
                >
                  <div className="p-3 bg-zinc-800 rounded-2xl"><Search className="text-blue-400" size={24} /></div>
                  <div><p className="font-black italic text-sm uppercase">I'm looking for a flat</p><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Match with verified pins</p></div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📍 ACTION BAR: "TAP MAP" */}
      {activeFlow === 'TRUTH' && !showTruthForm && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-10 py-5 rounded-full font-black italic border-2 border-white/20 shadow-2xl animate-pulse">
          TAP ON THE MAP TO PIN YOUR RENT TRUTH
        </div>
      )}

      {/* ℹ️ SEEKER FLOW: HOW IT WORKS */}
      <AnimatePresence>
        {activeFlow === 'SEEKER' && seekerStep === 'HOW_IT_WORKS' && (
          <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-white/20 p-10 rounded-[3rem] w-full max-w-lg text-white">
               <h2 className="text-3xl font-black italic mb-8">HERE'S HOW IT WORKS</h2>
               <div className="space-y-6 mb-10 text-zinc-400 font-bold">
                 <p><span className="text-blue-500">01.</span> Drop a pin where you want to live.</p>
                 <p><span className="text-blue-500">02.</span> Tell us your budget and lifestyle.</p>
                 <p><span className="text-blue-500">03.</span> We match you with available pins nearby.</p>
               </div>
               <button onClick={() => setSeekerStep('PLACING')} className="w-full bg-blue-600 py-6 rounded-2xl font-black italic text-xl shadow-lg">GOT IT, LET'S GO</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📍 SEEKER: "TAP MAP" */}
      {activeFlow === 'SEEKER' && seekerStep === 'PLACING' && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-10 py-5 rounded-full font-black italic border-2 border-white/20 shadow-2xl animate-pulse">
          TAP ON THE MAP TO DROP YOUR SEEKER PIN
        </div>
      )}

      {/* 📝 TRUTH FORM */}
      <AnimatePresence>
        {showTruthForm && (
          <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-3xl text-black">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic tracking-tighter">THE TRUTH FORM</h2>
                <button onClick={() => setShowTruthForm(false)} className="p-2 hover:bg-zinc-50 rounded-full"><X size={24} className="text-zinc-400" /></button>
              </div>
              <div className="space-y-4">
                <input type="number" placeholder="Monthly Rent (₹)" className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl font-bold outline-none" onChange={(e) => setTruthData({...truthData, rent_amount: e.target.value})} />
                <textarea placeholder="Comments (Landlord, Water...)" className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl outline-none h-24 resize-none font-medium" onChange={(e) => setTruthData({...truthData, comment: e.target.value})} />
                <button onClick={handleSaveTruth} className="w-full bg-black text-white font-black py-6 rounded-2xl shadow-xl italic uppercase tracking-widest hover:bg-zinc-800 transition-colors">PIN THE TRUTH</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📝 SEEKER FORM (Scaled Down) */}
      <AnimatePresence>
        {activeFlow === 'SEEKER' && seekerStep === 'FORM' && (
          <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="bg-[#0f172a] text-white p-6 rounded-3xl w-full max-w-lg shadow-3xl my-auto text-sm">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                <h2 className="text-lg font-bold">Drop a Seeker Pin</h2>
                <button onClick={() => setActiveFlow('NONE')} className="p-2 hover:bg-white/5 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase font-black mb-2 tracking-widest">Looking For</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Whole Flat', 'Room in a Flat'].map(t => (
                      <button key={t} onClick={() => setSeekerData({...seekerData, look_for: t})} className={`p-2 rounded-lg text-[10px] font-black border ${seekerData.look_for === t ? 'bg-emerald-600 border-emerald-500' : 'bg-zinc-800 border-zinc-700'}`}>{t.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700">
                  <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Budget (₹/month)*</p>
                  <input type="number" placeholder="e.g. 15000" className="bg-transparent w-full mt-1 font-bold outline-none text-white text-base" onChange={(e) => setSeekerData({...seekerData, budget: e.target.value})} />
                </div>
                <textarea placeholder="Lifestyle (e.g. Night owl, WFH...)" className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-xs h-20 outline-none font-bold" onChange={(e) => setSeekerData({...seekerData, lifestyle: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="email" placeholder="Email" className="bg-zinc-800 p-3 rounded-xl text-xs font-bold outline-none" onChange={(e) => setSeekerData({...seekerData, email: e.target.value})} />
                  <input type="tel" placeholder="Phone" className="bg-zinc-800 p-3 rounded-xl text-xs font-bold outline-none" onChange={(e) => setSeekerData({...seekerData, phone: e.target.value})} />
                </div>
              </div>
              <button onClick={handleSaveSeeker} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl mt-6 text-xs uppercase tracking-widest">Drop Seeker Pin</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔘 TRIGGER BUTTON (Bottom Bar) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100]">
        <button onClick={() => setActiveFlow('SELECTION')} className="bg-black text-white px-10 py-5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 hover:scale-105 transition-all border border-white/20 active:scale-95">
          <div className="bg-red-600 p-1.5 rounded-lg animate-pulse"><Plus size={18} /></div>
          <span className="font-black italic tracking-widest text-[10px] uppercase">Find Flat or Tenants — Tap to Start</span>
        </button>
      </div>

      <style jsx>{`
        .marquee-content { display: inline-block; animation: marquee 35s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        :global(.marker-label) {
          margin-top: -35px; background: rgba(0,0,0,0.9); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}