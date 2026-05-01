/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Shared cache for routes
const routeCache: Record<string, { origin: string; dest: string; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

async function startServer() {
  const app = express();
  const PORT = 3000;

  /**
   * Flight Route Resolution API
   * Fetches origin/destination IATA codes for a given flight callsign.
   * Uses adsbdb.com as a primary data source and implements a 24-hour cache.
   */
  app.get("/api/resolve-route", async (req, res) => {
    const flight = String(req.query.flight || "").trim().toUpperCase();
    
    if (!flight || flight.length < 3) {
      return res.status(400).json({ error: "Invalid flight code" });
    }

    // Return cached data to avoid rate-limiting and improve performance
    if (routeCache[flight] && (Date.now() - routeCache[flight].timestamp < CACHE_TTL)) {
      return res.json(routeCache[flight]);
    }

    try {
      console.log(`[RouteResolver] Resolving ${flight} via adsbdb.com`);
      const response = await fetch(`https://api.adsbdb.com/v0/callsign/${flight}`, {
        headers: { "User-Agent": "SkySweep-Radar/1.0" }
      });

      if (response.ok) {
        const data = await response.json();
        const route = data.response?.flightroute;
        
        // Ensure we only cache valid airport code pairs
        if (route && route.origin?.iata_code && route.destination?.iata_code) {
          const resolved = { 
            origin: String(route.origin.iata_code).toUpperCase(), 
            dest: String(route.destination.iata_code).toUpperCase(), 
            timestamp: Date.now() 
          };
          routeCache[flight] = resolved;
          console.log(`[RouteResolver] Success for ${flight}: ${resolved.origin} -> ${resolved.dest}`);
          return res.json(resolved);
        }
      }
      
      console.log(`[RouteResolver] No data found for ${flight} on adsbdb`);
      res.json({ origin: null, dest: null });
    } catch (error: any) {
      console.error(`[RouteResolver] Failed for ${flight}:`, error);
      res.status(500).json({ error: "Resolution service error" });
    }
  });

  /**
   * ADS-B.FI Proxy
   * Acts as a CORS bridge for the opendata.adsb.fi API.
   * This allows the browser to fetch real-time aircraft data without blocked cross-origin requests.
   */
  app.get("/api/aircraft", async (req, res) => {
    const { lat, lon, dist } = req.query;
    if (!lat || !lon || !dist) {
      return res.status(400).json({ error: "Missing lat, lon, or dist parameters" });
    }

    try {
      const url = `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${dist}`;
      console.log(`Proxying request to ${url}`);
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "SkySweep-Radar/1.0 (https://ais-dev.ais-dev-7od2dzmkk6gmryehfi4g7n-44582802056.run.app)"
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `API responded with ${response.status}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from adsb.fi", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Basic static serving for production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
