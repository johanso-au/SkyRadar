/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, Info } from 'lucide-react';
import { Point, getDistance, getBearing, polarToCartesian } from '../utils/geo';
import { AircraftHistory } from '../hooks/useADSBFetch';
import { RadarMap } from './RadarMap';

interface RadarDisplayProps {
  userLoc: Point;
  aircraft: AircraftHistory[];
  rangeKm: number;
  rotation: number;
  size: number;
  showSweep?: boolean;
  onSelectAircraft?: (a: AircraftHistory) => void;
  isRetro?: boolean;
}

const cardinalPoints = [
  { name: 'N', deg: 0 },
  { name: 'NE', deg: 45 },
  { name: 'E', deg: 90 },
  { name: 'SE', deg: 135 },
  { name: 'S', deg: 180 },
  { name: 'SW', deg: 225 },
  { name: 'W', deg: 270 },
  { name: 'NW', deg: 315 },
];

export const RadarDisplay: React.FC<RadarDisplayProps> = ({ 
  userLoc, 
  aircraft, 
  rangeKm, 
  rotation,
  size,
  showSweep = true,
  onSelectAircraft,
  isRetro = false
}) => {
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  const processedAircraft = useMemo(() => {
    return aircraft.map(a => {
      if (typeof a.lat !== 'number' || typeof a.lon !== 'number') return null;
      const target = { lat: a.lat, lon: a.lon };
      
      // Calculate distance and bearing relative to the user's location
      const dist = getDistance(userLoc, target);
      if (dist > rangeKm) return null; // Filter out aircraft outside the chosen range
      
      const bearing = getBearing(userLoc, target);
      
      // Convert polar coordinates (dist, bearing) to screen coordinates (x, y)
      // This helper accounts for map rotation and scaling relative to radar size
      const pos = polarToCartesian(dist, bearing, rotation, rangeKm, size);
      
      // Also convert the history trail to screen coordinates
      const trailPositions = (a.trail || []).map(p => {
        const d = getDistance(userLoc, p);
        const b = getBearing(userLoc, p);
        return polarToCartesian(d, b, rotation, rangeKm, size);
      });

      return { 
        ...a, 
        pos, 
        trailPositions, 
        bearingToUser: bearing, 
        distanceToUser: dist 
      };
    }).filter((a): a is any => a !== null);
  }, [userLoc, aircraft, rangeKm, rotation, size]);

  return (
    <div 
      className="relative rounded-full border-2 border-[#3fb37f]/30 overflow-hidden shadow-[inset_0_0_50px_rgba(63,179,127,0.1)] bg-black"
      style={{ width: size, height: size }}
    >
      {/* Background Map - Hidden in retro mode for better performance/look */}
      {!isRetro && (
        <RadarMap 
          center={userLoc} 
          rangeKm={rangeKm} 
          rotation={rotation} 
          size={size} 
        />
      )}

      {/* Radial Gradient Overlay for Radar Look */}
      {!isRetro && <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(7,9,12,0.8)_100%)] z-[1]" />}

      {/* Rings */}
      {rings.map(r => (
        <div 
          key={r}
          className="absolute border border-[#3fb37f]/20 rounded-full pointer-events-none z-[2]"
          style={{
            width: size * r,
            height: size * r,
            left: (size * (1 - r)) / 2,
            top: (size * (1 - r)) / 2,
          }}
        />
      ))}

      {/* Axis Lines */}
      <div className="absolute top-0 left-1/2 w-px h-full bg-[#3fb37f]/10 pointer-events-none z-[2]" />
      <div className="absolute top-1/2 left-0 w-full h-px bg-[#3fb37f]/10 pointer-events-none z-[2]" />

      {/* Cardinal Markers (Fixed Orientation) */}
      <div className="absolute inset-0 pointer-events-none z-[3]">
        {cardinalPoints.map((p) => {
          const offsetDeg = (p.deg - rotation + 360) % 360;
          const rad = (offsetDeg - 90) * (Math.PI / 180);
          const x = (size / 2) + (size / 2 - 15) * Math.cos(rad);
          const y = (size / 2) + (size / 2 - 15) * Math.sin(rad);
          
          return (
            <div 
              key={p.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-[#3fb37f] drop-shadow-[0_0_2px_rgba(63,179,127,1)]"
              style={{ left: x, top: y }}
            >
              {p.name}
            </div>
          );
        })}
      </div>

      {/* Trails & Aircraft */}
      <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
        {processedAircraft.map((a: any) => (
          <g key={`trail-${a.hex}`}>
            {a.trailPositions.length > 1 && (
              <polyline
                points={a.trailPositions.map((p: any) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(63, 179, 127, 0.4)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            )}
          </g>
        ))}
      </svg>

      <AnimatePresence>
        {processedAircraft.map((a: any) => (
          <motion.div
            key={a.hex}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
            style={{ left: `${a.pos.x}px`, top: `${a.pos.y}px` }}
          >
            {/* Plane Icon */}
            <div 
              style={{ transform: `rotate(${(a.track || 0) - rotation - (isRetro ? 0 : 45)}deg)` }}
              className={`text-[#3fb37f] hover:text-[#ff4e00] cursor-pointer transition-colors ${isRetro ? 'drop-shadow-[0_0_2px_rgba(63,179,127,1)]' : ''}`}
              onClick={() => onSelectAircraft?.(a)}
            >
              {isRetro ? (
                <div className="w-2 h-2 border border-current flex items-center justify-center transform rotate-45">
                   <div className="w-0.5 h-0.5 bg-current" />
                </div>
              ) : (
                <Plane size={16} fill="currentColor" />
              )}
            </div>

            {/* Permanent Basic ID & Route */}
            <div className={`absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none ${isRetro ? 'font-retro' : ''}`}>
              <div className={`text-[8px] font-bold text-[#3fb37f] bg-black/95 px-1 rounded-sm border border-[#3fb37f]/40 uppercase whitespace-nowrap shadow-lg ${isRetro ? 'text-[5px] border-none bg-transparent shadow-none' : ''}`}>
                {a.flight?.trim() || a.hex}
              </div>
              {!isRetro && (
                <div className="text-[7px] font-mono font-bold text-white bg-[#0e141a]/95 px-1.5 py-0.5 rounded-sm mt-0.5 whitespace-nowrap uppercase border border-[#3fb37f]/30 shadow-md flex items-center gap-1">
                  {a.isResolving ? (
                    <span className="animate-pulse text-[#3fb37f]">RESOLVING...</span>
                  ) : (
                    <>
                      <span>{a.origin || "-"}</span>
                      <span className="text-[#3fb37f]/60">➔</span>
                      <span>{a.dest || "-"}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Detailed Label on Hover */}
            <div className="absolute top-8 left-4 whitespace-nowrap bg-[#050608]/90 border border-[#3fb37f]/40 p-1 text-[8px] font-mono text-[#3fb37f] opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-lg">
              <div className="font-bold">{a.flight?.trim() || a.hex}</div>
              {a.origin && a.dest && <div className="text-[#3fb37f] border-b border-[#3fb37f]/20 mb-1 pb-1">{a.origin} → {a.dest}</div>}
              <div className="opacity-70">{a.alt_baro || a.alt_geom || '---'} FT | {a.gs || '--'} KTS</div>
              <div className="opacity-70">TYPE: {a.t || '---'}</div>
            </div>
            
            {/* Tiny blip for distant ones */}
            {!a.flight && (
              <div className="w-1 h-1 bg-[#3fb37f] rounded-full shadow-[0_0_5px_rgba(63,179,127,0.5)]" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Center Point (User) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#ff4e00] rounded-full shadow-[0_0_10px_rgba(255,78,0,0.5)] z-50">
      </div>
    </div>
  );
};
