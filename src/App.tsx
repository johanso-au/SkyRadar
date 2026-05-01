/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGeolocation } from './hooks/useGeolocation';
import { useADSBFetch } from './hooks/useADSBFetch';
import { RadarDisplay } from './components/RadarDisplay';
import { RadarSweep } from './components/RadarSweep';
import { Compass, Radio, MapPin, Gauge, Settings2, Info, ChevronDown, X, ExternalLink, Plane, Navigation, Activity } from 'lucide-react';
import { AircraftHistory } from './hooks/useADSBFetch';

export default function App() {
  // --- CORE STATE ---
  const { latitude: geoLat, longitude: geoLon, error: geoError, loading: geoLoading } = useGeolocation();
  const [manualLat, setManualLat] = useState<number | null>(null);
  const [manualLon, setManualLon] = useState<number | null>(null);
  
  // --- UI TOGGLES ---
  const [isContactsOpen, setIsContactsOpen] = useState(true);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRetroMode, setIsRetroMode] = useState(false); // Toggle for 320x240 view
  
  // --- RADAR CONFIG ---
  const [rangeKm, setRangeKm] = useState(50);
  const [rotation, setRotation] = useState(0); // 0 = North up
  const [radarSize, setRadarSize] = useState(600);
  const [showSweep, setShowSweep] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftHistory | null>(null);

  /**
   * DATA RESOLUTION
   * Combines manual overrides with browser geolocation.
   * Feeds coordinates into the ADS-B poller.
   */
  const latitude = manualLat ?? geoLat;
  const longitude = manualLon ?? geoLon;
  
  // Range in NM for API (1 km = 0.54 NM)
  const rangeNm = Math.round(rangeKm * 0.54);
  const { aircraft, loading: apiLoading, error: apiError, debugData } = useADSBFetch(latitude, longitude, rangeNm);

  useEffect(() => {
    if (geoLat !== null && manualLat === null) setManualLat(geoLat);
    if (geoLon !== null && manualLon === null) setManualLon(geoLon);
  }, [geoLat, geoLon]);

  useEffect(() => {
    const handleResize = () => {
      const minDim = Math.min(window.innerWidth - 64, window.innerHeight - 300, 800);
      setRadarSize(Math.max(300, minDim));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (geoLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-green-500 font-mono flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Radio className="animate-pulse" size={48} />
          <p className="text-xl tracking-widest uppercase">Initializing Radar System...</p>
          <p className="text-sm opacity-50 italic">Acquiring GPS Signal</p>
        </div>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className="min-h-screen bg-[#050505] text-red-500 font-mono flex items-center justify-center p-8">
        <div className="max-w-md text-center border border-red-900/50 p-8 rounded-lg bg-red-950/10">
          <Info size={48} className="mx-auto mb-4" />
          <h2 className="text-2xl mb-2 font-bold">SYSTEM ERROR</h2>
          <p className="mb-4">{geoError}</p>
          <p className="text-xs opacity-70">Please ensure location services are enabled and permissions are granted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#050608] text-[#3fb37f] font-mono selection:bg-[#3fb37f]/30 p-4 overflow-x-hidden flex items-center justify-center`}>
      
      {isRetroMode ? (
        <div className="w-[320px] h-[240px] bg-[#0c140c] border-[6px] border-[#2a2a2a] relative overflow-hidden flex items-center justify-center shadow-[0_0_100px_rgba(63,179,127,0.4)] rounded-[40px]/[20px] crt-effect crt-flicker">
           {/* Scanline & Vignette Overlay */}
           <div className="absolute inset-0 pointer-events-none z-[300] shadow-[inset_0_0_50px_rgba(0,0,0,1)]" />
           
           <div className="absolute top-2 left-4 text-[6px] font-retro text-[#3fb37f] opacity-80 z-[100] tracking-tighter">
             P1: ADSB_SCAN
           </div>
           
           <div className="absolute top-2 right-4 z-[100]">
             <button 
               onClick={() => setIsRetroMode(false)}
               className="text-[6px] font-retro border border-[#3fb37f]/50 bg-[#3fb37f]/10 hover:bg-[#3fb37f]/30 px-1 py-0.5 rounded uppercase"
             >
               QUIT
             </button>
           </div>
           
           {/* Radar Screen Area */}
           <div className="relative transform scale-110">
             <RadarDisplay 
               userLoc={{ lat: latitude || 0, lon: longitude || 0 }}
               aircraft={aircraft}
               rangeKm={rangeKm}
               rotation={rotation}
               size={210}
               showSweep={showSweep}
               onSelectAircraft={(a) => setSelectedAircraft(a)}
               isRetro={true}
             />
             {showSweep && <RadarSweep size={210} />}
           </div>
           
           {/* Data Readout */}
           <div className="absolute bottom-2 left-4 text-[5px] font-retro text-[#3fb37f] opacity-50 z-50 flex flex-col gap-0.5">
             <div>LAT: {latitude?.toFixed(2)}</div>
             <div>LON: {longitude?.toFixed(2)}</div>
             <div>RANGE: {rangeKm}K</div>
           </div>

           <div className="absolute bottom-2 right-4 text-[5px] font-retro text-[#3fb37f] opacity-50 z-50">
             V4.2 OSS
           </div>
        </div>
      ) : (
        <div className="max-w-[1400px] w-full mx-auto grid grid-cols-1 md:grid-cols-12 md:grid-rows-12 gap-3 h-full min-h-[calc(100vh-2rem)]">
        
        {/* HEADER AREA: Bento Box 1 */}
        <div className="md:col-span-8 md:row-span-1 bg-[#0c1116] border border-[#3fb37f]/30 rounded-lg flex items-center justify-between px-6 shadow-[0_0_15px_rgba(63,179,127,0.1)] py-4 relative z-50">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 bg-[#3fb37f] rounded-full ${apiLoading ? 'animate-pulse' : ''}`}></div>
            <h1 className="text-sm md:text-lg font-bold tracking-widest uppercase">ADS-B.FI // SKYSCAN V4.2</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex text-[10px] gap-6 opacity-80 uppercase font-mono">
              <span>LAT: {latitude?.toFixed(4)}° {latitude && latitude > 0 ? 'N' : 'S'}</span>
              <span>LON: {longitude?.toFixed(4)}° {longitude && longitude > 0 ? 'E' : 'W'}</span>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${isSettingsOpen ? 'bg-[#3fb37f] text-black border-[#3fb37f]' : 'bg-[#1a222a] text-[#3fb37f] border-[#3fb37f]/30 hover:border-[#3fb37f]'}`}
              >
                <Settings2 size={16} />
                <span className="text-xs font-bold uppercase tracking-tighter">Settings</span>
                <ChevronDown size={14} className={`transform transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-72 bg-[#0c1116] border border-[#3fb37f]/40 rounded-lg shadow-2xl p-5 z-[100] overflow-hidden"
                  >
                    <div className="text-[10px] font-bold border-b border-[#3fb37f]/20 pb-2 mb-4 uppercase flex items-center gap-2">
                       <Settings2 size={12} /> System Configuration
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-2 bg-black/40 border border-[#fbbf24]/20 rounded cursor-pointer select-none" onClick={() => setIsRetroMode(!isRetroMode)}>
                        <span className="text-[10px] uppercase font-bold text-[#fbbf24]">Retro Mode (320x240)</span>
                        <input type="checkbox" checked={isRetroMode} readOnly className="accent-[#fbbf24]" />
                      </div>

                      <div>
                        <label className="text-[10px] block mb-2 opacity-60 uppercase tracking-tighter">Orientation (North Offset)</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="0" 
                            max="359" 
                            value={rotation} 
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="w-full accent-[#3fb37f] bg-[#1a222a] h-1 rounded-full appearance-none cursor-pointer" 
                          />
                          <span className="text-xs w-10 tabular-nums">{rotation.toString().padStart(3, '0')}°</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] block mb-2 opacity-60 uppercase tracking-tighter">Scan Radius: {rangeKm}KM</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="5" 
                            max="250" 
                            step="5"
                            value={rangeKm} 
                            onChange={(e) => setRangeKm(Number(e.target.value))}
                            className="w-full accent-[#3fb37f] bg-[#1a222a] h-1 rounded-full appearance-none cursor-pointer" 
                          />
                          <span className="text-xs w-10 tabular-nums">{rangeKm}K</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-black/40 border border-[#3fb37f]/20 rounded cursor-pointer select-none" onClick={() => setShowSweep(!showSweep)}>
                        <span className="text-[10px] uppercase font-bold">Sweep Viz</span>
                        <input type="checkbox" checked={showSweep} readOnly className="accent-[#3fb37f]" />
                      </div>

                      <div className="pt-2 border-t border-[#3fb37f]/10">
                        <label className="text-[10px] block mb-2 opacity-60 uppercase tracking-tighter">Manual Location</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="number"
                            placeholder="LAT"
                            value={manualLat || ''}
                            onChange={(e) => setManualLat(parseFloat(e.target.value))}
                            className="w-full bg-black border border-[#3fb37f]/20 rounded px-2 py-1.5 text-xs outline-none"
                          />
                          <input 
                            type="number"
                            placeholder="LON"
                            value={manualLon || ''}
                            onChange={(e) => setManualLon(parseFloat(e.target.value))}
                            className="w-full bg-black border border-[#3fb37f]/20 rounded px-2 py-1.5 text-xs outline-none"
                          />
                        </div>
                        <button 
                          onClick={() => { setManualLat(geoLat); setManualLon(geoLon); }}
                          className="mt-2 w-full text-[8px] bg-[#3fb37f]/20 hover:bg-[#3fb37f]/40 py-2 rounded transition-colors flex items-center justify-center gap-1 uppercase"
                        >
                          <MapPin size={10} /> Sync with GPS
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* INFO PANEL & STATUS: Bento Box 2 */}
        <div className="md:col-span-4 md:row-span-5 bg-[#0c1116] border border-[#3fb37f]/30 rounded-lg p-5 flex flex-col gap-4 overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="text-xs font-bold border-b border-[#3fb37f]/20 pb-2 flex justify-between uppercase shrink-0">
            <span>{selectedAircraft ? 'AIRCRAFT TRACE' : 'SYSTEM STATUS'}</span>
            <span className={selectedAircraft ? 'text-yellow-500' : 'text-[#3fb37f]'}>[{selectedAircraft ? 'LOCKED' : 'SCANNING'}]</span>
          </div>

          <AnimatePresence mode="wait">
            {selectedAircraft ? (
              <motion.div 
                key={selectedAircraft.hex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col gap-4"
              >
                <div className="flex gap-4 items-start bg-[#1a222a] p-3 border border-[#3fb37f]/20 rounded">
                  <div className="w-12 h-12 bg-black border border-[#3fb37f]/40 flex items-center justify-center text-2xl relative">
                    ✈️
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#3fb37f] rounded-full animate-ping"></div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <h3 className="text-[#3fb37f] font-bold text-lg leading-none truncate">
                        {selectedAircraft.flight?.trim() || selectedAircraft.hex}
                      </h3>
                      <button onClick={() => setSelectedAircraft(null)} className="p-1 hover:bg-white/10 rounded">
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-[9px] opacity-60 uppercase font-mono mt-1">
                      HEX: {selectedAircraft.hex} // TYPE: {selectedAircraft.t || 'UNK'}
                    </p>
                    <p className="text-[10px] text-white/90 font-bold mt-1 mb-1">
                      REG: {selectedAircraft.r || 'NOT REGISTERED'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/40 p-3 border border-[#3fb37f]/10 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Navigation size={10} className="text-[#3fb37f]/60" />
                      <span className="text-[8px] opacity-40 uppercase tracking-widest">Origin</span>
                    </div>
                    <p className="text-sm font-bold text-white">{selectedAircraft.origin || '-'}</p>
                  </div>
                  <div className="bg-black/40 p-3 border border-[#3fb37f]/10 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={10} className="text-[#3fb37f]/60" />
                      <span className="text-[8px] opacity-40 uppercase tracking-widest">Destination</span>
                    </div>
                    <p className="text-sm font-bold text-white">{selectedAircraft.dest || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#1a222a] p-2 border border-[#3fb37f]/10 rounded">
                    <p className="text-[7px] opacity-40 uppercase">Altitude</p>
                    <p className="text-xs font-bold tabular-nums">{(selectedAircraft.alt_baro || 0).toLocaleString()} FT</p>
                  </div>
                  <div className="bg-[#1a222a] p-2 border border-[#3fb37f]/10 rounded">
                    <p className="text-[7px] opacity-40 uppercase">Ground Spd</p>
                    <p className="text-xs font-bold tabular-nums">{selectedAircraft.gs || 0} KTS</p>
                  </div>
                  <div className="bg-[#1a222a] p-2 border border-[#3fb37f]/10 rounded">
                    <p className="text-[7px] opacity-40 uppercase">Heading</p>
                    <p className="text-xs font-bold tabular-nums">{(selectedAircraft.track || 0).toString().padStart(3, '0')}°</p>
                  </div>
                </div>

                <div className="mt-auto space-y-2">
                   <div className="flex justify-between items-center bg-[#3fb37f]/5 p-2 rounded border border-[#3fb37f]/20">
                     <span className="text-[9px] uppercase font-bold flex items-center gap-1">
                       <Activity size={10} /> Sig Strength
                     </span>
                     <span className="text-[9px] text-[#3fb37f]">100% // RSSI -42dBm</span>
                   </div>
                   <a 
                    href={`https://adsb.fi/aircraft/${selectedAircraft.hex}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-[#3fb37f] text-black py-2.5 rounded font-bold text-xs uppercase tracking-widest hover:bg-[#3fb37f]/80 transition-colors"
                   >
                     Live Trace Details <ExternalLink size={12} />
                   </a>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-10 italic">
                <Compass size={40} className="mb-4 animate-[spin_10s_linear_infinite]" />
                <p className="text-xs">SYSTEM ACTIVE // IDLE<br/>AWAITING TARGET SELECTION</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* RADAR SCREEN: Bento Box 3 */}
        <div className="md:col-span-8 md:row-span-11 bg-[#07090c] border border-[#3fb37f]/50 rounded-lg relative overflow-hidden flex items-center justify-center shadow-inner min-h-[400px]">
          <div className="relative">
            {latitude !== null && longitude !== null && (
              <RadarDisplay 
                userLoc={{ lat: latitude, lon: longitude }}
                aircraft={aircraft}
                rangeKm={rangeKm}
                rotation={rotation}
                size={radarSize}
                showSweep={showSweep}
                onSelectAircraft={(a) => setSelectedAircraft(a)}
              />
            )}
            {showSweep && <RadarSweep size={radarSize} />}
          </div>
          
          <div className="absolute bottom-4 right-4 text-[10px] opacity-30 uppercase tracking-widest hidden md:block">
            Scanning Localized Airspace // Sync Level 100%
          </div>
          
          {apiError && (
             <div className="absolute top-4 left-4 bg-red-950/20 border border-red-500/50 p-2 text-[10px] text-red-500">
               CRITICAL ERROR: {apiError}
             </div>
          )}
        </div>

        {/* CONTACT LIST: Bento Box 4 */}
        <div className={`md:col-span-4 transition-all duration-300 bg-[#0c1116] border border-[#3fb37f]/30 rounded-lg p-4 flex flex-col ${isContactsOpen ? (isDiagnosticsOpen ? 'md:row-span-3' : 'md:row-span-6') : 'md:row-span-1 h-12 overflow-hidden'}`}>
          <button 
            onClick={() => setIsContactsOpen(!isContactsOpen)}
            className="flex items-center justify-between w-full text-xs font-bold border-b border-[#3fb37f]/20 pb-2 mb-3 tracking-widest uppercase hover:text-white transition-colors"
          >
            <span>AIR CONTACTS [{aircraft.length}]</span>
            <ChevronDown size={14} className={`transform transition-transform ${isContactsOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isContactsOpen && (
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              <div className="grid grid-cols-4 text-[9px] opacity-60 mb-2 border-b border-[#3fb37f]/10 pb-1 uppercase font-bold sticky top-0 bg-[#0c1116]">
                <span>FLIGHT</span><span>ALT</span><span>SPD</span><span>REG</span>
              </div>
              {aircraft.length === 0 ? (
                <div className="text-[10px] opacity-40 italic py-4 text-center">NO CONTACTS TRACED</div>
              ) : (
                aircraft.slice(0, 40).map((a) => (
                  <div 
                    key={a.hex} 
                    onClick={() => setSelectedAircraft(a)}
                    className={`grid grid-cols-4 text-[10px] py-1.5 px-1 cursor-pointer border-b border-[#3fb37f]/5 transition-colors group ${selectedAircraft?.hex === a.hex ? 'bg-[#3fb37f]/20 border-l-2 border-l-[#3fb37f]' : 'hover:bg-[#3fb37f]/10'}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[#3fb37f] group-hover:text-white uppercase truncate">{a.flight?.trim() || a.hex}</span>
                      {(a.origin || a.dest) && (
                        <span className="text-[7px] opacity-40 truncate">{a.origin || '-'} → {a.dest || '-'}</span>
                      )}
                    </div>
                    <span className="tabular-nums opacity-80">{(a.alt_baro || a.alt_geom || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                    <span className="tabular-nums opacity-80">{a.gs || '--'}</span>
                    <span className="opacity-60 truncate uppercase">{a.r || '---'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* DIAGNOSTICS: Bento Box 5 */}
        <div className={`md:col-span-4 transition-all duration-300 bg-[#0c1116] border border-blue-500/30 rounded-lg p-4 flex flex-col ${isDiagnosticsOpen ? 'md:row-span-3' : 'md:row-span-1 h-12 overflow-hidden'}`}>
          <button 
            onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
            className="flex items-center justify-between w-full text-xs font-bold border-b border-blue-500/20 pb-2 mb-3 tracking-widest uppercase text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>TELEMETRY DIAGNOSTICS</span>
            <ChevronDown size={14} className={`transform transition-transform ${isDiagnosticsOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDiagnosticsOpen && (
            <>
              <div className="flex-1 overflow-auto custom-scrollbar text-[8px] font-mono whitespace-pre bg-black/40 p-2 rounded border border-blue-500/10 mb-2">
                {debugData ? JSON.stringify(debugData, null, 2) : 'AWAITING TELEMETRY...'}
              </div>
              <div className="text-[8px] opacity-40 uppercase flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Last Sync: {new Date().toLocaleTimeString()}</span>
                  <span className={apiError ? 'text-red-500' : 'text-green-500'}>Status: {apiError ? 'ERROR' : 'OK'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SELECTED AIRCRAFT DETAIL: REMOVED OLD PANEL */}
      </div>
    )}

      {/* Grid Pattern Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]" style={{ backgroundImage: 'radial-gradient(#3fb37f 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  );
}

