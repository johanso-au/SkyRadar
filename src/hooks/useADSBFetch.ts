/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';

export interface Aircraft {
  hex: string;
  lat?: number;
  lon?: number;
  alt_baro?: number;
  alt_geom?: number;
  gs?: number;
  track?: number;
  flight?: string;
  category?: string;
  t?: string; // type
  r?: string; // registration
  origin?: string;
  dest?: string;
  isResolving?: boolean;
  last_seen: number;
}

export interface AircraftHistory extends Aircraft {
  trail: { lat: number; lon: number; timestamp: number }[];
}

export function useADSBFetch(lat: number | null, lon: number | null, rangeNm: number = 250): { aircraft: AircraftHistory[], loading: boolean, error: string | null, debugData: any } {
  const [aircraft, setAircraft] = useState<Record<string, AircraftHistory>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const cacheRef = useRef<Record<string, AircraftHistory>>({});
  const resolutionAttempts = useRef<Set<string>>(new Set());
  const flightRouteCache = useRef<Record<string, { origin: string; dest: string }>>({});

  const paramsRef = useRef({ lat, lon, rangeNm });
  paramsRef.current = { lat, lon, rangeNm };

  useEffect(() => {
    if (lat === null || lon === null) return;

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        // Local proxy to ADS-B.FI API using latest parameters from ref
        const { lat: cLat, lon: cLon, rangeNm: cRange } = paramsRef.current;
        const url = `/api/aircraft?lat=${cLat}&lon=${cLon}&dist=${cRange}`;
        const response = await fetch(url, { signal: controller.signal });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.error || `API Error: ${response.status}`);
        }

        const data = responseData;
        setDebugData(data);
        const now = Date.now();
        const newAircraft: Record<string, AircraftHistory> = {};

        const acList = data.ac || data.aircraft || [];

        if (Array.isArray(acList)) {
          acList.forEach((a: any) => {
            // Normalize fields from various ADS-B data sources (ADSB.FI uses specific abbreviations)
            const hex = (a.hex || a.icao || a.icao24 || "").toLowerCase();
            if (!hex) return;

            const lat = a.lat ?? a.latitude ?? a.lat_deg;
            const lon = a.lon ?? a.longitude ?? a.lon_deg ?? a.lng;
            const track = a.track ?? a.heading ?? a.trak ?? a.dir ?? 0;
            const altitude = a.alt_baro ?? a.alt_geom ?? a.altitude ?? a.alt ?? 0;
            const speed = a.gs ?? a.speed ?? a.vel ?? 0;
            
            // Extract raw origin/destination strings - these are often unreliable or empty in raw streams
            const originRaw = (a.orig_icao || a.orig_iata || a.nav_origin || a.origin || a.native_from || a.p_origin || "").toString().trim();
            const destRaw = (a.dest_icao || a.dest_iata || a.nav_dest || a.destination || a.native_to || a.p_dest || "").toString().trim();

            /**
             * Helper to validate airport codes.
             * Filters out numeric data or junk strings that aren't valid IATA/ICAO codes.
             */
            const isValidCode = (val: string) => {
              const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
              // Reject if too short, too long, or purely numeric, or contains too many numbers
              if (cleaned.length < 3 || cleaned.length > 5) return false;
              if (/^\d+$/.test(cleaned)) return false;
              // If it has more than 1 number, it's likely not a standard IATA/ICAO code for major airports
              const numCount = (cleaned.match(/\d/g) || []).length;
              if (numCount > 1) return false;
              return true;
            };

            let origin = isValidCode(originRaw) ? originRaw.toUpperCase() : undefined;
            let dest = isValidCode(destRaw) ? destRaw.toUpperCase() : undefined;

            // Fallback for combined route field "SFO-LAX" (common in some ADB-S streams)
            const routeField = a.route || a.flight_plan || a.nav_route || a.plan;
            if (!origin && !dest && typeof routeField === 'string' && routeField.includes('-')) {
              const parts = routeField.split('-');
              if (parts.length === 2 && isValidCode(parts[0].trim()) && isValidCode(parts[1].trim())) {
                origin = parts[0].trim();
                dest = parts[1].trim();
              }
            }

            const flightCode = (a.flight || a.callsign || "").trim().toUpperCase();
            
            const existing = cacheRef.current[hex];
            const trail = existing ? [...existing.trail] : [];

            // Check if we already resolved this flight's route
            const cachedRoute = flightCode ? flightRouteCache.current[flightCode] : null;
            let isResolving = false;

            /**
             * BACKGROUND RESOLUTION
             * If we have a callsign but no route data, ping our server-side resolver.
             * This runs asynchronously to prevent UI blocking.
             */
            if (flightCode && flightCode.length >= 3 && !resolutionAttempts.current.has(flightCode) && !cachedRoute) {
              isResolving = true;
              const resolve = async () => {
                if (resolutionAttempts.current.has(flightCode)) return;
                resolutionAttempts.current.add(flightCode);

                try {
                  console.info(`[useADSBFetch] [DEBUG] Resolving flight: ${flightCode} (Hex: ${hex})`);
                  const res = await fetch(`/api/resolve-route?flight=${encodeURIComponent(flightCode)}`);
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const data = await res.json();
                  
                  if (data.origin && data.dest) {
                    const resolvedOrigin = String(data.origin).toUpperCase();
                    const resolvedDest = String(data.dest).toUpperCase();
                    
                    console.info(`[useADSBFetch] [DEBUG] RESOLVED ${flightCode}: ${resolvedOrigin} -> ${resolvedDest}`);
                    
                    flightRouteCache.current[flightCode] = { 
                      origin: resolvedOrigin, 
                      dest: resolvedDest 
                    };
                    
                    // Update cacheRef immediately
                    Object.keys(cacheRef.current).forEach(h => {
                      const ac = cacheRef.current[h];
                      const acFlight = (ac.flight || ac.callsign || "").trim().toUpperCase();
                      if (acFlight === flightCode) {
                        cacheRef.current[h] = { ...ac, origin: resolvedOrigin, dest: resolvedDest, isResolving: false };
                      }
                    });

                    // Update UI state
                    setAircraft(prev => {
                      const next = { ...prev };
                      let updated = false;
                      Object.keys(next).forEach(h => {
                        const ac = next[h];
                        const acFlight = (ac.flight || ac.callsign || "").trim().toUpperCase();
                        if (acFlight === flightCode) {
                          next[h] = { ...ac, origin: resolvedOrigin, dest: resolvedDest, isResolving: false };
                          updated = true;
                        }
                      });
                      return updated ? next : prev;
                    });
                  } else {
                    console.info(`[useADSBFetch] [DEBUG] API returned NULL for ${flightCode}`);
                    // Mark as resolved (but null) so we don't spam the API
                    flightRouteCache.current[flightCode] = { origin: '-', dest: '-' };
                    
                    // Stop "RESOLVING" state for all aircraft with this flight code
                    setAircraft(prev => {
                      const next = { ...prev };
                      let updated = false;
                      Object.keys(next).forEach(h => {
                        const ac = next[h];
                        const acFlight = (ac.flight || ac.callsign || "").trim().toUpperCase();
                        if (acFlight === flightCode) {
                          next[h] = { ...ac, origin: '-', dest: '-', isResolving: false };
                          updated = true;
                        }
                      });
                      return updated ? next : prev;
                    });
                  }
                } catch (e) {
                  console.error(`[useADSBFetch] [DEBUG] AI FAILED for ${flightCode}:`, e);
                  // Retry after 2 mins if it failed
                  setTimeout(() => resolutionAttempts.current.delete(flightCode), 120000);
                }
              };
              resolve();
            } else if (flightCode && flightCode.length >= 3 && !cachedRoute && resolutionAttempts.current.has(flightCode)) {
              isResolving = true;
            }
            
            // Prioritize AI resolved data
            const finalOrigin = cachedRoute?.origin || origin || existing?.origin;
            const finalDest = cachedRoute?.dest || dest || existing?.dest;
            
            // Add to trail if position exists and changed
            if (lat !== undefined && lon !== undefined) {
              const lastPoint = trail[trail.length - 1];
              if (!lastPoint || lastPoint.lat !== lat || lastPoint.lon !== lon) {
                trail.push({ lat: Number(lat), lon: Number(lon), timestamp: now });
              }
            }

            // Keep trail limited to last 30 points
            if (trail.length > 30) trail.shift();

            newAircraft[hex] = {
              ...a,
              hex,
              lat: lat !== undefined ? Number(lat) : undefined,
              lon: lon !== undefined ? Number(lon) : undefined,
              track: Number(track),
              alt_baro: Number(altitude),
              gs: Number(speed),
              origin: finalOrigin,
              dest: finalDest,
              isResolving: isResolving && !finalOrigin,
              last_seen: now,
              trail
            };
            
            // Console log suspected junk data
            if (originRaw && !origin) console.debug(`[useADSBFetch] Ignoring junk origin: ${originRaw} for ${flightCode}`);
            if (destRaw && !dest) console.debug(`[useADSBFetch] Ignoring junk dest: ${destRaw} for ${flightCode}`);
          });
        }

        // Cleanup old aircraft (not seen in last 2 minutes)
        Object.keys(cacheRef.current).forEach(hex => {
          if (!newAircraft[hex] && (now - cacheRef.current[hex].last_seen < 120000)) {
             // Keep it for a bit even if missing from one fetch to prevent flickering
             newAircraft[hex] = cacheRef.current[hex];
          }
        });

        cacheRef.current = newAircraft;
        setAircraft(newAircraft);
        setError(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [lat, lon]);

  return { aircraft: Object.values(aircraft), loading, error, debugData };
}
