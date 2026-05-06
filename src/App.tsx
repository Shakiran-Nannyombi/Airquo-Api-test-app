/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { stageManager } from "./services/StageManager";
import { stateManager } from "./services/StateManager";
import { mapManager } from "./services/MapManager";
import { AirQoMeasurement } from "./services/AirQoService";
import { 
  Wind, 
  Map as MapIcon, 
  Info, 
  Layers, 
  AlertTriangle,
  Activity,
  Heart,
  TrendingDown,
  TrendingUp,
  Search,
  Crosshair,
  ShieldAlert,
  ChevronRight,
  X,
  Navigation,
  MapPin,
  ArrowRight,
  Route as RouteIcon
} from "lucide-react";
import { 
  AqGood, 
  AqModerate, 
  AqUnhealthyForSensitiveGroups, 
  AqUnhealthy, 
  AqVeryUnhealthy, 
  AqHazardous, 
  AqNoValue 
} from '@airqo/icons-react';
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { MapLayer, SiteStatistics, RouteResult } from "./types";
import { routeModule } from "./modules/RouteModule";
import { getAQILevel } from "./lib/aqi";

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<AirQoMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('heatmap');
  const [searchQuery, setSearchQuery] = useState("");
  const [showHealthTips, setShowHealthTips] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSite, setSelectedSite] = useState<AirQoMeasurement | null>(null);
  
  // Routing State
  const [routeView, setRouteView] = useState<'monitoring' | 'routing'>('monitoring');
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeResults, setRouteResults] = useState<RouteResult[]>([]);

  useEffect(() => {
    const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const airqoKey = import.meta.env.VITE_AIRQO_API_KEY;

    if (!googleKey || !airqoKey) {
      setHasApiKey(false);
      setLoading(false);
      return;
    }

    if (mapRef.current) {
      stageManager.init(mapRef.current).then(() => {
        setLoading(false);
      }).catch(err => {
        console.error("Stage Manager Init Failed:", err);
        setFetchError(err.message || "An unexpected error occurred during initialization.");
        setLoading(false);
      });
    }

    const unsubscribe = stateManager.subscribe<AirQoMeasurement[]>("measurements", (data) => {
      if (data) setMeasurements(data);
    });

    return () => unsubscribe();
  }, []);

  const toggleLayer = () => {
    const next: MapLayer = activeLayer === 'heatmap' ? 'markers' : 'heatmap';
    setActiveLayer(next);
    setRouteResults([]);
    routeModule.clear();
    stateManager.set("showHeatmap", next === 'heatmap');
    stateManager.set("showMarkers", next === 'markers');
  };

  const handleRouteSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    setCalculatingRoute(true);
    try {
      const results = await routeModule.calculateRoute(origin, destination);
      setRouteResults(results);
      setActiveLayer('route');
      stateManager.set("showHeatmap", false);
      stateManager.set("showMarkers", false);
    } catch (error: any) {
      console.error(error);
      setFetchError(error.message || "Failed to calculate route.");
    } finally {
      setCalculatingRoute(false);
    }
  };

  const clearRoute = () => {
    routeModule.clear();
    setRouteResults([]);
    setOrigin("");
    setDestination("");
    setActiveLayer('heatmap');
    stateManager.set("showHeatmap", true);
  };

  const getAQIDisplay = (pm25: number) => {
    const aqi = getAQILevel(pm25);
    const iconSize = 24;
    const modalIconSize = 48;

    let icon = <AqNoValue size={iconSize} color="#64748b" />;
    let modalIcon = <AqNoValue size={modalIconSize} color="#64748b" />;

    switch (aqi.label) {
      case 'Good':
        icon = <AqGood size={iconSize} color={aqi.color} />;
        modalIcon = <AqGood size={modalIconSize} color={aqi.color} />;
        break;
      case 'Moderate':
        icon = <AqModerate size={iconSize} color={aqi.color} />;
        modalIcon = <AqModerate size={modalIconSize} color={aqi.color} />;
        break;
      case 'Sensitive Groups':
        icon = <AqUnhealthyForSensitiveGroups size={iconSize} color={aqi.color} />;
        modalIcon = <AqUnhealthyForSensitiveGroups size={modalIconSize} color={aqi.color} />;
        break;
      case 'Unhealthy':
        icon = <AqUnhealthy size={iconSize} color={aqi.color} />;
        modalIcon = <AqUnhealthy size={modalIconSize} color={aqi.color} />;
        break;
      case 'Very Unhealthy':
        icon = <AqVeryUnhealthy size={iconSize} color={aqi.color} />;
        modalIcon = <AqVeryUnhealthy size={modalIconSize} color={aqi.color} />;
        break;
      case 'Hazardous':
        icon = <AqHazardous size={iconSize} color={aqi.color} />;
        modalIcon = <AqHazardous size={modalIconSize} color={aqi.color} />;
        break;
    }

    return { 
      ...aqi, 
      icon, 
      modalIcon,
      // Map hex color to tailwind class if needed, or use inline
      tailwindBg: aqi.label === 'Hazardous' ? 'bg-slate-900' : 
                   aqi.label === 'Very Unhealthy' ? 'bg-purple-600' :
                   aqi.label === 'Unhealthy' ? 'bg-rose-600' :
                   aqi.label === 'Sensitive Groups' ? 'bg-orange-500' :
                   aqi.label === 'Moderate' ? 'bg-amber-400' : 'bg-emerald-500'
    };
  };

  const stats = useMemo<SiteStatistics>(() => {
    if (measurements.length === 0) return { averagePM25: 0, totalDevices: 0, highestSite: null, lowestSite: null };
    
    let sum = 0;
    let highest = measurements[0];
    let lowest = measurements[0];

    measurements.forEach(m => {
      const val = m.pm2_5.value;
      sum += val;
      if (val > highest.pm2_5.value) highest = m;
      if (val < lowest.pm2_5.value) lowest = m;
    });

    return {
      averagePM25: sum / measurements.length,
      totalDevices: measurements.length,
      highestSite: { name: highest.siteDetails?.location_name || highest.siteDetails?.name || "Unknown", value: highest.pm2_5.value },
      lowestSite: { name: lowest.siteDetails?.location_name || lowest.siteDetails?.name || "Unknown", value: lowest.pm2_5.value }
    };
  }, [measurements]);

  const filteredMeasurements = useMemo(() => {
    if (!searchQuery) return measurements;
    return measurements.filter(m => 
      (m.siteDetails?.location_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.siteDetails?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [measurements, searchQuery]);

  const goToSite = (m: AirQoMeasurement) => {
    const map = mapManager.getMap();
    setSelectedSite(m);
    if (map && m.siteDetails?.approximate_latitude) {
      map.panTo({ lat: m.siteDetails.approximate_latitude, lng: m.siteDetails.approximate_longitude });
      map.setZoom(16);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Configuration Required</h1>
        <p className="text-slate-400 text-center max-w-md">
          Please provide <code className="bg-slate-800 px-2 py-1 rounded">VITE_AIRQO_API_KEY</code> to enable monitoring.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans text-slate-200">
      {/* LEFT SIDEBAR: Static Data Area */}
      <AnimatePresence mode="wait">
        {!loading && sidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 384, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="flex-shrink-0 bg-slate-900 border-r border-white/10 flex flex-col overflow-hidden relative z-20"
          >
            {/* Header & Stats Container */}
            <div className="p-6 space-y-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <Wind className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-white tracking-tighter leading-none">AIRPULSE</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Metropolitan Pulse</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
              </div>

              {/* Sidebar Tabs */}
              <div className="flex bg-white/5 p-1 rounded-2xl">
                <button 
                  onClick={() => setRouteView('monitoring')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    routeView === 'monitoring' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Live Nodes
                </button>
                <button 
                  onClick={() => setRouteView('routing')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    routeView === 'routing' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <RouteIcon className="w-3.5 h-3.5" />
                  Cleaner Path
                </button>
              </div>

              {routeView === 'routing' ? (
                /* Routing Controls */
                <form onSubmit={handleRouteSearch} className="space-y-4">
                  <div className="space-y-2 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-slate-800" />
                    
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-emerald-500 bg-slate-900 z-10" />
                      <input 
                        type="text"
                        placeholder="Start point..."
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500/30 transition-all text-white placeholder:text-slate-600 font-medium"
                      />
                    </div>
                    
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 z-10" />
                      <input 
                        type="text"
                        placeholder="Destination..."
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500/30 transition-all text-white placeholder:text-slate-600 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      disabled={calculatingRoute}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white p-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[2px] transition-all flex items-center justify-center gap-2"
                    >
                      {calculatingRoute ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Navigation className="w-4 h-4" />
                          Find Cleaner Route
                        </>
                      )}
                    </button>
                    {routeResults.length > 0 && (
                      <button 
                        type="button"
                        onClick={clearRoute}
                        className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                /* Monitor Bento Stats */
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                    <Activity className="w-4 h-4 text-emerald-500/50 mb-2" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Avg PM 2.5</p>
                    <p className="text-2xl font-black text-white leading-none mt-1">{stats.averagePM25.toFixed(1)}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl overflow-hidden">
                    <TrendingDown className="w-4 h-4 text-emerald-400 mb-2" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Safest</p>
                    <p className="text-xs font-bold text-white truncate mt-1">{stats.lowestSite?.name || "N/A"}</p>
                  </div>
                </div>
              )}

              {/* General Search (Shared or hidden in routing) */}
              {routeView === 'monitoring' && (
                <div className="space-y-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Search neighborhoods..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/30 transition-all text-white placeholder:text-slate-600 font-medium"
                    />
                  </div>
                  
                  <button 
                    onClick={toggleLayer}
                    className="w-full bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    <Layers className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                      Visualize: {activeLayer === 'heatmap' ? 'Markers' : 'Heatmap'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Content Body */}
            {routeView === 'routing' && routeResults.length > 0 ? (
              /* Route Results List */
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Route Options</h3>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-1 rounded">Ranked by Air Quality</span>
                </div>
                {routeResults.map((res, i) => {
                  const level = getAQIDisplay(res.score);
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "p-5 rounded-3xl border transition-all relative overflow-hidden group",
                        i === 0 ? "bg-white/5 border-emerald-500/30" : "bg-white/[0.02] border-white/5"
                      )}
                    >
                      {i === 0 && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                          Healthiest
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{level.emoji}</span>
                            <span className={cn("text-[10px] font-black uppercase tracking-tighter", level.text)}>
                              {level.label} Air
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-white">Route Alternative {i + 1}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                              <span>{(res.route.distanceMeters / 1000).toFixed(1)} km</span>
                              <div className="w-1 h-1 rounded-full bg-slate-800" />
                              <span>{Math.round(parseInt(res.route.durationMillis) / 60000)} mins</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Exposure</p>
                          <p className="text-2xl font-black text-white italic">{res.score.toFixed(1)}</p>
                          <p className="text-[9px] font-bold text-slate-600">µg/m³</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Network Nodes List */
              <>
                <div className="px-6 py-3 border-y border-white/5 bg-white/[0.01] flex justify-between items-center text-slate-500">
                  <span className="text-[10px] font-black uppercase tracking-widest">Network Nodes</span>
                  <span className="text-[10px] font-mono tabular-nums">{filteredMeasurements.length} LIVE</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                  {filteredMeasurements.map((m, i) => {
                    const level = getAQIDisplay(m.pm2_5.value);
                    return (
                      <div 
                        key={i} 
                        onClick={() => goToSite(m)}
                        className="p-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer border border-transparent hover:border-white/5"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{level.emoji}</span>
                              <h4 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                                {m.siteDetails?.location_name || m.siteDetails?.name || `Sensor ${i}`}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 mt-1 whitespace-nowrap overflow-hidden">
                              <span className="text-[9px] text-slate-500 font-mono uppercase truncate max-w-[120px]">
                                {m.siteDetails?.city || "Kampala"}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-800 flex-shrink-0" />
                              <span className={cn("text-[9px] font-bold uppercase tracking-tighter truncate", level.text)}>
                                {level.label}
                              </span>
                            </div>
                          </div>
                          <div className={cn("px-2.5 py-1 rounded-lg text-xs font-black text-white tabular-nums", level.tailwindBg, level.glow)}>
                            {m.pm2_5.value.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Health Footer */}
            <div className="p-4 flex-shrink-0 border-t border-white/5">
              <button 
                onClick={() => setShowHealthTips(true)}
                className="w-full bg-slate-800 hover:bg-emerald-600 text-white p-3.5 rounded-2xl flex items-center gap-4 transition-all group"
              >
                <div className="bg-emerald-500 p-2 rounded-xl group-hover:bg-white group-hover:text-emerald-600 transition-colors">
                  <Heart className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 leading-none mb-1">Health Advisory</p>
                  <p className="text-sm font-black tracking-tighter">SAFETY GUIDE</p>
                </div>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* RIGHT SIDE: Dedicated Map Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-slate-950">
        {/* Toggle Dashboard Button (Hidden when open) */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-6 left-6 z-30 bg-slate-900 border border-white/10 p-3.5 rounded-2xl text-emerald-400 shadow-2xl hover:bg-slate-800 transition-colors pointer-events-auto flex items-center gap-2"
          >
            <ChevronRight className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest pr-2">Dashboard</span>
          </button>
        )}

        {/* Legend Overlay */}
        <div className="absolute top-6 right-6 z-20 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-[24px] shadow-2xl space-y-3 min-w-[160px] pointer-events-auto">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">PM 2.5 Scale</p>
            {[
              { label: 'Good', range: '0-12', color: 'bg-emerald-500' },
              { label: 'Moderate', range: '12-35', color: 'bg-amber-400' },
              { label: 'Sensitive', range: '35-55', color: 'bg-orange-500' },
              { label: 'Unhealthy', range: '55-150', color: 'bg-rose-600' },
              { label: 'Hazardous', range: '150+', color: 'bg-purple-600' },
            ].map(lvl => (
              <div key={lvl.label} className="flex items-center justify-between gap-4 text-[10px]">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-2.5 h-2.5 rounded-sm", lvl.color)} />
                  <span className="font-bold text-slate-300">{lvl.label}</span>
                </div>
                <span className="font-mono text-slate-500 text-[9px]">{lvl.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map Instance */}
        <div id="map" ref={mapRef} className="absolute inset-0 z-0" />
      </main>

      {/* OVERLAY MODALS */}
      <AnimatePresence>
        {selectedSite && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSite(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] cursor-pointer"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[151] px-6"
            >
              {(() => {
                const level = getAQIDisplay(selectedSite.pm2_5.value);
                return (
                  <div className="bg-slate-900 border border-white/10 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Header: Visual Indicator */}
                    <div className={cn("p-8 flex flex-col items-center gap-4 transition-colors", level.tailwindBg)}>
                      <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                        {level.modalIcon}
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-1">Current Condition</p>
                        <h2 className="text-3xl font-black text-white italic tracking-tighter">{level.label} {level.emoji}</h2>
                      </div>
                      <button 
                        onClick={() => setSelectedSite(null)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-6 text-left">
                      <div className="flex justify-between items-end">
                        <div className="flex-1 min-w-0 pr-4 text-left">
                          <h3 className="text-xl font-bold text-white truncate">{selectedSite.siteDetails.location_name || selectedSite.siteDetails.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-slate-500">
                            <Navigation className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{selectedSite.siteDetails.city}, {selectedSite.siteDetails.district}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">PM 2.5</p>
                          <p className="text-4xl font-black text-white leading-none">
                            {selectedSite.pm2_5.value.toFixed(1)}
                            <span className="text-xs font-medium text-slate-500 ml-1">µg/m³</span>
                          </p>
                        </div>
                      </div>

                      {/* Health Tips Section */}
                      {selectedSite.health_tips && selectedSite.health_tips.length > 0 && (
                        <div className="bg-white/5 border border-white/5 p-5 rounded-2xl relative overflow-hidden group">
                          <div className={cn("absolute inset-y-0 left-0 w-1", level.tailwindBg)} />
                          <div className="flex items-center gap-2 mb-2">
                            <ShieldAlert className={cn("w-4 h-4", level.text)} />
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Health Recommendation</h4>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed font-medium italic">
                            "{selectedSite.health_tips[0].description}"
                          </p>
                        </div>
                      )}

                      {/* Footnote */}
                      <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3 h-3" />
                          Last Update: {new Date(selectedSite.time).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <AqNoValue size={12} color="#475569" />
                          Sensor ID: {selectedSite.device_id.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}

        {showHealthTips && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHealthTips(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] cursor-pointer"
            />
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-[101] px-6"
            >
              <div className="bg-slate-900 border border-white/10 rounded-[40px] shadow-3xl overflow-hidden">
                <div className="bg-emerald-500 p-10 flex items-center gap-8">
                  <div className="bg-white/20 p-5 rounded-[32px]">
                    <Heart className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter italic">PROTECTION GUIDE</h2>
                    <p className="text-emerald-100 text-sm opacity-80 font-medium">Smart health recommendations based on live data</p>
                  </div>
                </div>
                
                <div className="p-10 space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-all">
                      <ShieldAlert className="w-7 h-7 text-amber-400 mb-4" />
                      <h4 className="text-sm font-black text-white mb-2 uppercase tracking-widest">High Risk Groups</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">Children and elderly should minimize outdoor exposure when PM 2.5 levels exceed 35 µg/m³.</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-all">
                      <Wind className="w-7 h-7 text-emerald-400 mb-4" />
                      <h4 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Outdoor Habits</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">Early morning remains the safest window for exercise. Avoid main traffic arteries during rush hours.</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-between items-center bg-white/[0.02] -mx-10 -mb-10 p-10 px-10">
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Sensor Data Synchronized
                    </div>
                    <button 
                      onClick={() => setShowHealthTips(false)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[2px] transition-all"
                    >
                      Dismiss Advisory
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(loading || !!fetchError) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center text-center p-6"
          >
            {fetchError ? (
              <div className="max-w-md">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-6 mx-auto shadow-2xl shadow-red-500/20" />
                <h2 className="text-2xl font-black text-white mb-3 italic tracking-tight uppercase">Data Protocol Failure</h2>
                <p className="text-slate-400 text-sm mb-8 font-medium">{fetchError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-white text-slate-950 px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[3px] hover:scale-105 transition-transform"
                >
                  Initialize System
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full"
                  />
                  <Wind className="w-10 h-10 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-10 text-slate-300 text-xs font-black uppercase tracking-[0.5em] animate-pulse italic">Connecting to Metro Grid...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

