'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer } from '@react-google-maps/api';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Map as MapIcon, X, Share2, Copy, 
  Navigation, PartyPopper, Layers, 
  ShieldCheck, Search, Home, Info, ChevronRight
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
  
  // Flow States
  const [activeFlow, setActiveFlow] = useState<'NONE' | 'SELECTION' | 'TRUTH' | 'SEEKER'>('NONE');
  const [seekerStep, setSeekerStep] = useState<'HOW_IT_WORKS' | 'PLACING' | 'FORM'>('HOW_IT_WORKS');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // Form Data States
  const [truthData, setTruthData] = useState({ rent_amount: '', maintenance_fee: '', comment: '' });
  const [seekerData, setSeekerData] = useState({ 
    budget: '', bhk_pref: '2BHK', timeline: 'Flexible', food: 'Any', lifestyle: '', email: '', phone: '' 
  });

  useEffect(() => { 
    fetchPins();
    fetchSeekers();
  }, []);

  async function fetchPins() {
    const { data } = await supabase.from('rent_pins').select('*');
    if (data) setPins(data);
  }

  async function fetchSeekers() {
    const { data } = await supabase.from('seeker_pins').select('*');
    if (data) setSeekers(data);
  }

  const heatmapData = useMemo(() => {
    if (!isLoaded || typeof window === 'undefined' || !(window as any).google) return [];
    return pins.map(p => ({ location: new (window as any).google.maps.LatLng(p.lat, p.lng), weight: 1 }));
  }, [pins, isLoaded]);

  // Handle Seeker Submission
  const handleSaveSeeker = async () => {
    if (!tempCoords || !seekerData.budget) return alert("Please enter your budget.");
    const { error } = await supabase.from('seeker_pins').insert([{
        lat: tempCoords.lat, lng: tempCoords.lng,
        budget: parseInt(seekerData.budget),
        bhk_pref: seekerData.bhk_pref,
        move_timeline: seekerData.timeline,
        food_pref: seekerData.food,
        lifestyle: seekerData.lifestyle,
        contact_email: seekerData.email,
        contact_phone: seekerData.phone
    }]);
    if (!error) {
      setActiveFlow('NONE'); setTempCoords(null);
      setNotificationMsg("SEEKER PIN DROPPED!"); setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchSeekers();
    }
  };

  const handleSaveTruth = async () => {
    if (!tempCoords || !truthData.rent_amount) return alert("Enter rent amount.");
    const { error } = await supabase.from('rent_pins').insert([{
        rent_amount: parseInt(truthData.rent_amount),
        lat: tempCoords.lat, lng: tempCoords.lng,
        maintenance_fee: parseInt(truthData.maintenance_fee) || 0,
        comment: truthData.comment, truth_score: 100
    }]);
    if (!error) {
      setActiveFlow('NONE'); setTempCoords(null);
      setNotificationMsg("TRUTH PINNED!"); setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchPins();
    }
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center font-black italic text-4xl uppercase">NCR.RENT</div>;

  return (
    <div className={`relative w-full h-screen bg-white ${activeFlow !== 'NONE' ? 'cursor-crosshair' : ''}`}>
      
      {/* 📊 SIDEBAR */}
      <div className="absolute top-6 left-6 z-20 bg-zinc-900 p-6 rounded-[2rem] shadow-2xl w-80 border border-white/10">
        <h1 className="text-2xl font-black text-white tracking-tighter italic flex items-center gap-2 mb-4">
          <MapIcon className="text-red-500" /> NCR.RENT
        </h1>
        <div className="grid grid-cols-2 gap-4 mb-6 font-black italic border-t border-white/5 pt-4">
          <div><p className="text-[10px] text-zinc-500 uppercase">Truth Pins</p><p className="text-white text-xl">{pins.length}</p></div>
          <div><p className="text-[10px] text-zinc-500 uppercase">Seekers</p><p className="text-blue-400 text-xl">{seekers.length}</p></div>
        </div>
        <button onClick={() => setShowHeatmap(!showHeatmap)} className={`w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase transition-all bg-white text-black shadow-lg`}>
          <span><Layers size={14} className="inline mr-2"/> {showHeatmap ? 'Standard View' : 'Heatmap Mode'}</span>
          <div className={`w-2.5 h-2.5 rounded-full ${showHeatmap ? 'bg-red-600 animate-pulse' : 'bg-zinc-300'}`} />
        </button>
      </div>

      <GoogleMap 
        mapContainerStyle={{ width: '100vw', height: '100vh' }} 
        center={center} zoom={11} 
        options={{ disableDefaultUI: true }}
        onClick={(e) => {
          if (activeFlow === 'TRUTH') {
            setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() });
          } else if (activeFlow === 'SEEKER' && seekerStep === 'PLACING') {
            setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() });
            setSeekerStep('FORM');
          }
        }}
      >
        {showHeatmap ? (
          <HeatmapLayer data={heatmapData} options={{ radius: 30, opacity: 0.6 }} />
        ) : (
          <>
            {pins.map(pin => (
              <Marker key={pin.id} position={{ lat: pin.lat, lng: pin.lng }} label={{ text: `₹${(pin.rent_amount / 1000).toFixed(0)}k`, color: 'white', fontSize: '11px', fontWeight: '900', className: 'marker-label' }} />
            ))}
            {seekers.map(s => (
              <Marker key={s.id} position={{ lat: s.lat, lng: s.lng }} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }} />
            ))}
          </>
        )}
        {tempCoords && <Marker position={tempCoords} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png" }} />}
      </GoogleMap>

      {/* 🏁 MAIN SELECTION MODAL (Tap to Start) */}
      <AnimatePresence>
        {activeFlow === 'SELECTION' && (
          <div className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-3xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white italic">FIND FLAT OR TENANTS</h2>
                <button onClick={() => setActiveFlow('NONE')}><X className="text-zinc-500" /></button>
              </div>
              <div className="space-y-4">
                <button onClick={() => setActiveFlow('TRUTH')} className="w-full bg-white text-black p-6 rounded-3xl flex items-center gap-4 hover:scale-[1.02] transition-all group">
                  <div className="p-3 bg-zinc-100 rounded-2xl group-hover:bg-red-100"><Home className="text-red-600" /></div>
                  <div className="text-left"><p className="font-black italic">I HAVE A FLAT</p><p className="text-[10px] font-bold text-zinc-500 uppercase">Report truth, find tenants</p></div>
                  <ChevronRight className="ml-auto text-zinc-300" />
                </button>
                <button onClick={() => { setActiveFlow('SEEKER'); setSeekerStep('HOW_IT_WORKS'); }} className="w-full bg-white/5 border border-white/10 text-white p-6 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all group">
                  <div className="p-3 bg-zinc-800 rounded-2xl group-hover:bg-blue-900"><Search className="text-blue-400" /></div>
                  <div className="text-left"><p className="font-black italic">I'M LOOKING FOR A FLAT</p><p className="text-[10px] font-bold text-zinc-500 uppercase">Set budget, get matched</p></div>
                  <ChevronRight className="ml-auto text-zinc-600" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ℹ️ SEEKER FLOW: HOW IT WORKS */}
      <AnimatePresence>
        {activeFlow === 'SEEKER' && seekerStep === 'HOW_IT_WORKS' && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-white/20 p-10 rounded-[3rem] w-full max-w-lg text-white">
               <h2 className="text-4xl font-black italic mb-8 tracking-tighter">HERE'S HOW IT WORKS</h2>
               <div className="space-y-6 mb-10">
                 <div className="flex gap-4"><span className="text-blue-500 font-black">01.</span><p className="font-bold text-zinc-300">Drop a pin where you want to live.</p></div>
                 <div className="flex gap-4"><span className="text-blue-500 font-black">02.</span><p className="font-bold text-zinc-300">Tell us your budget and what you are looking for.</p></div>
                 <div className="flex gap-4"><span className="text-blue-500 font-black">03.</span><p className="font-bold text-zinc-300">We'll match you with available flats and people nearby.</p></div>
               </div>
               <button onClick={() => setSeekerStep('PLACING')} className="w-full bg-blue-600 py-6 rounded-2xl font-black italic text-xl shadow-[0_0_30px_rgba(37,99,235,0.4)]">GOT IT, LET'S GO</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📍 SEEKER FLOW: PLACING PIN */}
      {activeFlow === 'SEEKER' && seekerStep === 'PLACING' && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-10 py-5 rounded-full font-black italic flex items-center gap-3 border-2 border-white/20 shadow-2xl animate-pulse">
           TAP ANYWHERE ON THE MAP TO PLACE YOUR PIN
        </div>
      )}

      {/* 📝 SEEKER FLOW: THE FORM */}
      <AnimatePresence>
        {activeFlow === 'SEEKER' && seekerStep === 'FORM' && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-white p-8 rounded-[2.5rem] w-full max-w-xl shadow-3xl my-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic tracking-tighter">DROP A SEEKER PIN</h2>
                <button onClick={() => setActiveFlow('NONE')}><X size={24} className="text-zinc-400" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase">Budget per room</p>
                    <input type="number" placeholder="e.g. 15000" className="w-full bg-transparent font-black text-lg outline-none" onChange={(e) => setSeekerData({...seekerData, budget: e.target.value})} />
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase">BHK Preference</p>
                    <select className="w-full bg-transparent font-black outline-none" onChange={(e) => setSeekerData({...seekerData, bhk_pref: e.target.value})}>
                      <option>1BHK</option><option>2BHK</option><option>3BHK</option><option>Any</option>
                    </select>
                  </div>
                </div>
                <textarea placeholder="Tell us about your lifestyle (Night owl, work from home, pet lover...)" className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl h-24 outline-none font-bold" onChange={(e) => setSeekerData({...seekerData, lifestyle: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="email" placeholder="Your Email" className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 font-bold outline-none" onChange={(e) => setSeekerData({...seekerData, email: e.target.value})} />
                  <input type="tel" placeholder="Phone Number" className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 font-bold outline-none" onChange={(e) => setSeekerData({...seekerData, phone: e.target.value})} />
                </div>
                <button onClick={handleSaveSeeker} className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl shadow-xl italic tracking-widest text-lg">DROP SEEKER PIN</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔘 TRIGGER BUTTON (Bottom Center) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4">
        <button 
          onClick={() => setActiveFlow('SELECTION')}
          className="bg-zinc-900 text-white px-12 py-6 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center gap-4 hover:scale-105 transition-all group border border-white/10"
        >
          <div className="bg-red-600 p-2 rounded-lg animate-pulse"><Plus size={20} /></div>
          <span className="font-black italic tracking-widest text-sm uppercase">Find Flat or Tenants — Tap to Start</span>
        </button>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-white/80 px-4 py-1 rounded-full backdrop-blur-sm shadow-sm border border-zinc-100">
           Built for Transparency in Delhi NCR
        </p>
      </div>

      {/* 🏁 BOTTOM TICKER */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-zinc-950 py-2 overflow-hidden border-t border-white/5">
        <div className="marquee-content whitespace-nowrap text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
          ● REAL-TIME DATA: GURGAON SEC 54 (₹62K) ● SEEKER ALERT: 15 PEOPLE LOOKING IN NOIDA SEC 150 ● DATA QUALITY: CROWDSOURCED ● 
        </div>
      </div>

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