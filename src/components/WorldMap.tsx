import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Globe, Flag } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  'USA': [-95.7129, 37.0902],
  'Brazil': [-51.9253, -14.2350],
  'Japan': [138.2529, 36.2048],
  'Germany': [10.4515, 51.1657],
  'China': [104.1954, 35.8617],
  'India': [78.9629, 20.5937],
  'UK': [-3.4359, 55.3781],
  'Australia': [133.7751, -25.2744],
};

// Simplified representation of "Fog of War" Map using abstract territory cards
export function WorldMap({ onCountryClick }: { onCountryClick?: (country: string) => void }) {
  const { clients, selectClient } = useStore();

  const regions = [
    { id: 'na', name: 'North America', status: 'active', clients: clients.filter(c => c.country === 'USA').length },
    { id: 'sa', name: 'South America', status: 'active', clients: clients.filter(c => c.country === 'Brazil').length },
    { id: 'eu', name: 'Europe', status: 'active', clients: clients.filter(c => c.country === 'Germany').length },
    { id: 'as', name: 'Asia', status: 'active', clients: clients.filter(c => c.country === 'Japan').length },
    { id: 'af', name: 'Africa', status: 'unlocked', clients: 0 },
    { id: 'oc', name: 'Oceania', status: 'locked', clients: 0 },
  ];

  const countryMarkers = useMemo(() => {
    const groups: Record<string, { count: number; active: number; dormant: number; coordinates: [number, number] }> = {};
    clients.forEach(client => {
      const coordinates = COUNTRY_COORDS[client.country];
      if (coordinates) {
        if (!groups[client.country]) {
          groups[client.country] = { count: 0, active: 0, dormant: 0, coordinates };
        }
        groups[client.country].count++;
        if (client.isDormant) {
          groups[client.country].dormant++;
        } else {
          groups[client.country].active++;
        }
      }
    });
    return Object.entries(groups).map(([country, data]) => ({
      country,
      ...data
    }));
  }, [clients]);

  return (
    <div className="flex-1 p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-900 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-lg">
            <Globe className="w-6 h-6 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Territory Map</h1>
            <p className="text-sm text-slate-400">Expand your global reach to unlock new regions.</p>
          </div>
        </div>
        
        {/* Map Visualization */}
        <div className="w-full bg-slate-900/50 rounded-2xl border border-slate-800 mb-8 overflow-hidden relative">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span> Active
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span> Dormant
            </div>
          </div>
          <div className="aspect-video w-full max-h-[500px]">
            <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "100%" }}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const geoName = geo.properties.name;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#1e293b"
                        stroke="#334155"
                        strokeWidth={0.5}
                        onClick={() => {
                          if (onCountryClick) onCountryClick(geoName);
                        }}
                        className={onCountryClick ? "cursor-pointer" : ""}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: onCountryClick ? "#475569" : "#334155", outline: "none" },
                          pressed: { fill: "#1e293b", outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
              {countryMarkers.map(({ country, count, active, dormant, coordinates }) => {
                const isMostlyDormant = dormant > active;
                return (
                  <Marker 
                    key={country} 
                    coordinates={coordinates} 
                    onClick={() => {
                      if (onCountryClick) onCountryClick(country);
                    }} 
                    className="cursor-pointer outline-none group hover:scale-110 transition-transform"
                  >
                    <circle 
                      r={12} 
                      fill={isMostlyDormant ? "#f97316" : "#22d3ee"} 
                      className="opacity-40 animate-ping"
                    />
                    <circle 
                      r={8} 
                      fill={isMostlyDormant ? "#f97316" : "#22d3ee"} 
                      stroke="#0f172a"
                      strokeWidth={1.5}
                    />
                    <text textAnchor="middle" y={-18} style={{ fontFamily: 'var(--font-sans)', fontSize: "12px", fill: "#f1f5f9", fontWeight: 700 }}>
                      {country}
                    </text>
                    <text textAnchor="middle" y={3} style={{ fontFamily: 'var(--font-sans)', fontSize: "9px", fill: "#0f172a", fontWeight: 800 }}>
                      {count}
                    </text>
                    <text textAnchor="middle" y={20} style={{ fontFamily: 'var(--font-sans)', fontSize: "10px", fill: "#38bdf8", fontWeight: 600 }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      View Leads
                    </text>
                  </Marker>
                );
              })}
            </ComposableMap>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regions.map(r => (
            <div 
              key={r.id} 
              className={`relative overflow-hidden rounded-2xl border p-6 ${
                r.status === 'locked' ? 'bg-slate-900 border-slate-800 opacity-50' :
                r.status === 'unlocked' ? 'bg-slate-800 border-slate-700' :
                'bg-slate-800 border-cyan-500/50 shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]'
              }`}
            >
              {/* Fog of War / Status overlay */}
              {r.status === 'locked' && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center backdrop-blur-[2px] z-10">
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fog of War</span>
                </div>
              )}

              <div className="flex items-start justify-between mb-8 z-0 relative">
                <h3 className={`text-lg font-bold ${r.status === 'active' ? 'text-white' : 'text-slate-400'}`}>
                  {r.name}
                </h3>
                {r.status === 'active' && (
                  <span className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 font-bold text-xs ring-1 ring-cyan-500/50">
                    {r.clients}
                  </span>
                )}
              </div>

              <div className="mt-8 z-0 relative">
                {r.status === 'active' ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
                    <Flag className="w-4 h-4" /> Territory Claimed
                  </div>
                ) : r.status === 'unlocked' ? (
                  <div className="text-sm font-medium text-slate-500">
                    No active clients
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
