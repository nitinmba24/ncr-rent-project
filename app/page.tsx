'use client';
import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer, Circle } from '@react-google-maps/api';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Map as MapIcon, X, Share2, Copy, 
  Navigation, PartyPopper, Info, Layers, 
  Building2, Wallet 
} from 'lucide-react';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const calculateMedian = (pins: any[]) => {
  if (pins.length === 0) return 0;
  const prices = pins.map(p => p.rent_amount).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
};

// Center of Delhi NCR
const center = { lat: 28.6139, lng: 77.2090 };

export default function NCRRentMap() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['visualization']
  });

  const [pins, setPins] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMetroRadius, setShowMetroRadius] = useState(false);
  
  const [isPlacing, setIsPlacing] = useState(false); 
  const [showForm, setShowForm] = useState(false);   
  const [showSuccess, setShowSuccess] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [formData, setFormData] = useState({
    rent_amount: '',
    bhk_type: '2BHK',
    cluster_tag: 'Corporate Professional',
    maintenance_fee: '',
    is_gated_society: true,
    comment: ''
  });

  useEffect(() => { fetchPins(); }, []);

  async function fetchPins() {
    const { data } = await supabase.from('rent_pins').select('*');
    if (data) setPins(data);
  }

  // Native Share / Clipboard Fallback
  const handleShare = async () => {
    const shareData = {
      title: 'NCR.RENT - Crowdsourced Truth in Housing',
      text: 'Check out the live rent map for Delhi NCR!',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
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
        bhk_type: formData.bhk_type,
        cluster_tag: formData.cluster_tag,
        maintenance_fee: parseInt(formData.maintenance_fee) || 0,
        is_gated_society: formData.is_gated_society,
        comment: formData.comment,
        truth_score: 100
    }]);

    if (!error) {
      setShowForm(false);
      setIsPlacing(false);
      setTempCoords(null);
      setNotificationMsg("TRUTH PINNED SUCCESSFULLY!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchPins();
    }
  };

  if (!isLoaded) return (
    <div className="h-screen w-full flex items-center justify-center bg-white text-black font-black italic text-4xl uppercase tracking-tighter">
      NCR.RENT
    </div>
  );

  return (
    <div className={`relative w-full h-screen bg-zinc-50 overflow-hidden ${isPlacing ? 'cursor-crosshair' : ''}`}>
      
      {/* 🔔 GLOBAL NOTIFICATIONS */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 text-white px-8 py-4 rounded-full shadow-2xl font-black italic flex items-center gap-3 border border-white/10"
          >
            {notificationMsg.includes("LINK") ? <Copy size={20} /> : <PartyPopper size={20} />} 
            {notificationMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 ANALYTICS SIDEBAR */}
      <div className="absolute top-6 left-6 z-20 bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-zinc-200 shadow-xl w-80">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black text-black tracking-tighter flex items-center gap-2 italic">
            <MapIcon className="text-red-600" /> NCR.RENT
          </h1>
          <button 
            onClick={handleShare}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors border border-zinc-200"
          >
            <Share2 size={18} className="text-zinc-600" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 font-black italic">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Live Pins</p>
            <p className="text-black text-xl">{pins.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Avg Rent</p>
            <p className="text-green-600 text-xl">₹{(calculateMedian(pins)/1000).toFixed(1)}k</p>
          </div>
        </div>

        {/* DATA TOGGLES */}
        <div className="mt-6 space-y-2">
           <button 
             onClick={() => setShowHeatmap(!showHeatmap)}
             className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${showHeatmap ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-zinc-50 text-zinc-600 border border-zinc-100'}`}
           >
             <span className="flex items-center gap-2"><Layers size={14} /> HEATMAP OVERLAY</span>
             <div className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-orange-500 animate-pulse' : 'bg-zinc-300'}`} />
           </button>
        </div>
      </div>

      {/* 📍 PLACEMENT HEADER */}
      <AnimatePresence>
        {isPlacing && !showForm && (
          <motion.div 
            initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-8 py-4 rounded-full shadow-2xl font-black italic flex items-center gap-3 border-2 border-white/20"
          >
            <Navigation className="animate-bounce" size={20} /> CLICK MAP TO DROP PIN
          </motion.div>
        )}
      </AnimatePresence>

      <GoogleMap 
        mapContainerStyle={{ width: '100vw', height: '100vh' }} 
        center={center} 
        zoom={11} 
        options={{ 
          disableDefaultUI: true,
          zoomControl: false,
          styles: [] // Empty array ensures Default Light Theme
        }}
        onClick={(e) => {
          if (isPlacing) {
            setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() });
            setShowForm(true); 
          }
        }}
      >
        {showHeatmap ? (
          <HeatmapLayer 
            data={pins.map(p => ({ location: new google.maps.LatLng(p.lat, p.lng), weight: 1 }))} 
            options={{ radius: 30, opacity: 0.6 }}
          />
        ) : (
          pins.map(pin => (
            <Marker 
              key={pin.id} 
              position={{ lat: pin.lat, lng: pin.lng }} 
              onClick={() => setSelectedPin(pin)}
              label={{ 
                text: `₹${(pin.rent_amount / 1000).toFixed(0)}k`, 
                color: 'white', 
                fontSize: '11px', 
                fontWeight: '900',
                className: 'marker-label'
              }}
            />
          ))
        )}
        {tempCoords && <Marker position={tempCoords} icon={{ url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }} />}
      </GoogleMap>

      {/* 📝 DATA ENTRY FORM */}
      <AnimatePresence>
        {showForm && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white border border-zinc-200 p-8 rounded-[2.5rem] w-full max-w-lg shadow-3xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-black italic tracking-tighter flex items-center gap-2">
                  <ShieldCheck className="text-blue-600" /> THE TRUTH FORM
                </h2>
                <button 
                  onClick={() => {setShowForm(false); setIsPlacing(false); setTempCoords(null);}}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-zinc-400" />
                </button>
              </div>
              
              <div className="space-y-5">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-400">₹</span>
                  <input 
                    type="number" 
                    placeholder="Monthly Rent" 
                    className="w-full bg-zinc-50 border border-zinc-200 p-5 pl-10 rounded-2xl text-black font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                    onChange={(e) => setFormData({...formData, rent_amount: e.target.value})} 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 border border-zinc-200 p-2 rounded-2xl">
                    <p className="text-[9px] font-black text-zinc-400 ml-3 uppercase">Config</p>
                    <select 
                      className="w-full bg-transparent p-2 text-black font-bold outline-none" 
                      onChange={(e) => setFormData({...formData, bhk_type: e.target.value})}
                    >
                      <option value="1BHK">1 BHK</option>
                      <option value="2BHK">2 BHK</option>
                      <option value="3BHK">3 BHK</option>
                    </select>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 p-2 rounded-2xl">
                    <p className="text-[9px] font-black text-zinc-400 ml-3 uppercase">Maint. (₹)</p>
                    <input 
                      type="number" 
                      className="w-full bg-transparent p-2 text-black font-bold outline-none" 
                      onChange={(e) => setFormData({...formData, maintenance_fee: e.target.value})} 
                    />
                  </div>
                </div>

                <textarea 
                  placeholder="Tell us the truth about the landlord, water, or electricity..." 
                  className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl text-black font-medium outline-none h-32 resize-none" 
                  onChange={(e) => setFormData({...formData, comment: e.target.value})} 
                />

                <button 
                  onClick={handleSavePin} 
                  className="w-full bg-black hover:bg-zinc-800 text-white font-black py-6 rounded-2xl shadow-xl transition-all uppercase italic tracking-widest text-lg"
                >
                  VERIFY & SUBMIT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚡ FLOAT ACTION BUTTON */}
      <button 
        onClick={() => { setIsPlacing(true); setTempCoords(null); }}
        className={`absolute bottom-12 right-10 z-20 px-10 py-6 rounded-full shadow-2xl flex items-center gap-3 transition-all font-black text-white uppercase italic tracking-widest ${isPlacing ? 'bg-zinc-400 scale-95' : 'bg-red-600 hover:bg-red-500 hover:scale-105'}`}
      >
        {isPlacing ? 'CANCEL' : <><Plus size={24} /> PIN MY RENT</>}
      </button>

      {/* 📊 FOOTER TICKER */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-md border-t border-zinc-200 py-3 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          ● VERIFIED: GURGAON SEC 54 - 2BHK (₹62K) ● ALERT: RENT HIKE OBSERVED IN NOIDA SEC 150 ● DATA QUALITY: 100% CROWDSOURCED ● TRUTH PROTOCOL ACTIVE ● 
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .marker-label {
          margin-top: -35px;
          background: rgba(0,0,0,0.8);
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}