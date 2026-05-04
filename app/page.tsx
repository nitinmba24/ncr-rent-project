'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer } from '@react-google-maps/api';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Map as MapIcon, X, Layers, Search, Home, Info } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const center = { lat: 28.6139, lng: 77.2090 };
// Defined outside component to prevent library reload bugs
const LIBRARIES: ("visualization")[] = ["visualization"];

export default function NCRRentMap() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES
  });

  const [pins, setPins] = useState<any[]>([]);
  const [seekers, setSeekers] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeFlow, setActiveFlow] = useState<'NONE' | 'SELECTION' | 'TRUTH' | 'SEEKER'>('NONE');
  const [seekerStep, setSeekerStep] = useState<'HOW_IT_WORKS' | 'PLACING' | 'FORM'>('HOW_IT_WORKS');
  const [showTruthForm, setShowTruthForm] = useState(false);
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);

  const [truthData, setTruthData] = useState({ rent_amount: '', comment: '' });
  const [seekerData, setSeekerData] = useState({
    look_for: 'Room in a Flat', budget: '', bhk_pref: 'Any', timeline: 'Flexible',
    lifestyle: '', email: '', phone: ''
  });

  useEffect(() => { fetchPins(); fetchSeekers(); }, []);
  async function fetchPins() { const { data } = await supabase.from('rent_pins').select('*'); if (data) setPins(data); }
  async function fetchSeekers() { const { data } = await supabase.from('seeker_pins').select('*'); if (data) setSeekers(data); }

  const avgRent = useMemo(() => {
    if (pins.length === 0) return 0;
    return pins.reduce((acc, pin) => acc + pin.rent_amount, 0) / pins.length;
  }, [pins]);

  const heatmapPoints = useMemo(() => {
    if (!isLoaded) return [];
    return pins.map(p => new google.maps.LatLng(p.lat, p.lng));
  }, [pins, isLoaded]);

  const handleSaveTruth = async () => {
    if (!tempCoords || !truthData.rent_amount) return alert("Enter rent!");
    await supabase.from('rent_pins').insert([{
        rent_amount: parseInt(truthData.rent_amount), lat: tempCoords.lat, lng: tempCoords.lng,
        comment: truthData.comment, truth_score: 100
    }]);
    resetFlow(); fetchPins();
  };

  const handleSaveSeeker = async () => {
    if (!tempCoords || !seekerData.budget) return alert("Enter budget!");
    await supabase.from('seeker_pins').insert([{
        lat: tempCoords.lat, lng: tempCoords.lng, look_for: seekerData.look_for,
        budget: parseInt(seekerData.budget), bhk_pref: seekerData.bhk_pref,
        move_timeline: seekerData.timeline, lifestyle: seekerData.lifestyle, 
        contact_email: seekerData.email, contact_phone: seekerData.phone
    }]);
    resetFlow(); fetchSeekers();
  };

  const resetFlow = () => {
    setActiveFlow('NONE'); setSeekerStep('HOW_IT_WORKS');
    setShowTruthForm(false); setTempCoords(null);
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center font-black text-2xl">NCR.RENT</div>;

  return (
    <div className="relative w-full h-screen bg-white">
      {/* 📊 SIDEBAR WITH AVG RENT */}
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
          <div className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-red-600 animate-pulse' : 'bg-zinc-300'}`} />
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
        {showHeatmap ? (
          <HeatmapLayer data={heatmapPoints} options={{ radius: 30, opacity: 0.6 }} />
        ) : (
          <>
            {pins.map(p => (
              <Marker key={p.id} position={{lat: p.lat, lng: p.lng}} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png" }} label={{text: `₹${(p.rent_amount/1000).toFixed(0)}k`, color: 'black', fontSize: '10px', fontWeight: '900', className: 'marker-label-yellow'}} />
            ))}
            {seekers.map(s => (
              <Marker key={s.id} position={{lat: s.lat, lng: s.lng}} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }} />
            ))}
          </>
        )}
      </GoogleMap>

      {/* 🔘 BOTTOM BAR TRIGGER */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100]">
        <button onClick={() => setActiveFlow('SELECTION')} className="bg-black text-white px-10 py-5 rounded-full shadow-2xl flex items-center gap-4 hover:scale-105 border border-white/20 active:scale-95 transition-all">
          <div className="bg-red-600 p-1.5 rounded-lg animate-pulse"><Plus size={18} /></div>
          <span className="font-black text-[10px] uppercase">Find Flat or Tenants — Tap to Start</span>
        </button>
      </div>

      {/* MODALS REMOVED FOR BREVITY - INCLUDE PREVIOUS SELECTION/FORM MODALS HERE */}
      <style jsx>{`
        :global(.marker-label-yellow) { margin-top: -35px; background: #fbbf24; color: black; padding: 4px 8px; border-radius: 6px; border: 1px solid black; }
      `}</style>
    </div>
  );
}