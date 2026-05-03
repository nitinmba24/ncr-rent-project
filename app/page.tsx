'use client';
import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer, Circle } from '@react-google-maps/api';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
// Added Share2 icon
import { Plus, Map as MapIcon, X, ShieldCheck, Building2, Wallet, Train, Activity, CheckCircle2, Navigation, PartyPopper, Share2, Copy } from 'lucide-react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const calculateMedian = (pins: any[]) => {
  if (pins.length === 0) return 0;
  const prices = pins.map(p => p.rent_amount).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
};

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
  const [notificationMsg, setNotificationMsg] = useState("TRUTH PINNED SUCCESSFULLY!"); // Dynamic message
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

  // --- NEW: SHARE LOGIC ---
  const handleShare = async () => {
    const shareData = {
      title: 'NCR.RENT - The Truth in Housing',
      text: 'Check out this crowdsourced rent map for Delhi NCR!',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback for Desktop: Copy to Clipboard
      navigator.clipboard.writeText(window.location.href);
      setNotificationMsg("URL COPIED TO CLIPBOARD!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleSavePin = async () => {
    if (!tempCoords || !formData.rent_amount) return alert("Enter rent amount!");

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

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-black text-white font-black italic text-4xl uppercase">NCR.RENT</div>;

  return (
    <div className={`relative w-full h-screen bg-zinc-950 overflow-hidden ${isPlacing ? 'cursor-crosshair' : ''}`}>
      
      {/* 🏆 GLOBAL SUCCESS/SHARE NOTIFICATION */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-[60] bg-white text-black px-8 py-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] font-black italic flex items-center gap-3 border border-zinc-200"
          >
            {notificationMsg.includes("PINNED") ? <PartyPopper /> : <Copy />} {notificationMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AREA INSIGHTS (SIDEBAR) */}
      <div className="absolute top-6 left-6 z-20 bg-zinc-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl w-80">
        <div className="flex justify-between items-start">
          <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 italic">
            <MapIcon className="text-red-500" /> NCR.RENT
          </h1>
          {/* THE NEW SHARE BUTTON */}
          <button 
            onClick={handleShare}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
            title="Share Project"
          >
            <Share2 size={18} className="text-zinc-400" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5 font-black italic">
          <div><p className="text-[9px] text-zinc-500 uppercase">Verified Pins</p><p className="text-white text-lg">{pins.length}</p></div>
          <div><p className="text-[9px] text-zinc-500 uppercase">Median Rent</p><p className="text-green-400 text-lg">₹{(calculateMedian(pins)/1000).toFixed(1)}k</p></div>
        </div>
      </div>

      {/* PLACEMENT INSTRUCTION */}
      <AnimatePresence>
        {isPlacing && !showForm && (
          <motion.div 
            initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-8 py-4 rounded-full shadow-2xl font-black italic flex items-center gap-3 border-2 border-white/20"
          >
            <Navigation className="animate-bounce" /> CLICK ON THE MAP TO SET LOCATION
          </motion.div>
        )}
      </AnimatePresence>

      <GoogleMap 
        mapContainerStyle={{ width: '100vw', height: '100vh' }} 
        center={center} zoom={11} 
        options={{ styles: darkMapStyle, disableDefaultUI: true }}
        onClick={(e) => {
          if (isPlacing) {
            setTempCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() });
            setShowForm(true); 
          }
        }}
      >
        {showMetroRadius && (
          <Circle center={{lat: 28.4595, lng: 77.0734}} radius={1200} options={{fillColor: '#3b82f6', fillOpacity: 0.1, strokeColor: '#3b82f6', strokeWeight: 1}} />
        )}
        {showHeatmap ? (
          <HeatmapLayer data={pins.map(p => ({ location: new google.maps.LatLng(p.lat, p.lng), weight: 1 }))} />
        ) : (
          pins.map(pin => (
            <Marker key={pin.id} position={{ lat: pin.lat, lng: pin.lng }} onClick={() => setSelectedPin(pin)}
              label={{ text: `₹${pin.rent_amount / 1000}k`, color: 'white', fontSize: '10px', fontWeight: '900' }}
            />
          ))
        )}
        {tempCoords && <Marker position={tempCoords} icon={{ url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }} />}
      </GoogleMap>

      {/* THE FORM */}
      <AnimatePresence>
        {showForm && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-3xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black text-white italic tracking-tighter">THE TRUTH FORM</h2>
                <button onClick={() => {setShowForm(false); setIsPlacing(false);}}><X className="text-zinc-500" /></button>
              </div>
              <div className="space-y-4">
                <input type="number" placeholder="Monthly Rent (₹)" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-red-500" onChange={(e) => setFormData({...formData, rent_amount: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <select className="bg-zinc-800 border border-white/10 p-4 rounded-xl text-white outline-none" onChange={(e) => setFormData({...formData, bhk_type: e.target.value})}>
                    <option value="1BHK">1 BHK</option><option value="2BHK">2 BHK</option><option value="3BHK">3 BHK</option>
                  </select>
                  <input type="number" placeholder="Maint. (₹)" className="bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none" onChange={(e) => setFormData({...formData, maintenance_fee: e.target.value})} />
                </div>
                <textarea placeholder="Comments..." className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none h-24 resize-none" onChange={(e) => setFormData({...formData, comment: e.target.value})} />
                <button onClick={handleSavePin} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all">SUBMIT TRUTH PIN</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOAT ACTION BUTTON */}
      <button 
        onClick={() => { setIsPlacing(true); setTempCoords(null); }}
        className={`absolute bottom-12 right-10 z-20 px-10 py-5 rounded-full shadow-2xl flex items-center gap-3 transition-all font-black text-white uppercase italic text-sm ${isPlacing ? 'bg-zinc-500' : 'bg-red-600 hover:bg-red-500'}`}
      >
        {isPlacing ? 'CANCEL PLACEMENT' : <><Plus /> PIN MY RENT</>}
      </button>

      {/* TICKER */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-md border-t border-white/5 py-2 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block text-xs font-bold uppercase tracking-widest text-zinc-400">
          ● LIVE DATA FEED: NEW PIN IN GURGAON SECTOR 43 (₹55K) | MARKET ALERT: HIGH VOLATILITY IN SOUTH DELHI | PEER VERIFIED: NOIDA SEC 150 (₹42K) ●
        </div>
      </div>
    </div>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#09090b" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#71717a" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#18181b" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];