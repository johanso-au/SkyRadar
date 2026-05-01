import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Point } from '../utils/geo';

interface RadarMapProps {
  center: Point;
  rangeKm: number;
  rotation: number;
  size: number;
}

// Fixed ratio to match the zoom level with rangeKm
// Zoom 13 is roughly 2km radius on a typical screen
// log2(156543 / (meters_per_pixel))
/**
 * Calculates the appropriate Leaflet zoom level to match the provided radar range (km).
 * This ensures that the map zoom scales correctly as the user changes the radar's scan radius.
 */
function calculateZoom(rangeKm: number, size: number, lat: number) {
  const metersPerPixel = (rangeKm * 2 * 1000) / size;
  const zoom = Math.log2((156543.03392 * Math.cos(lat * Math.PI / 180)) / metersPerPixel);
  return zoom;
}

/**
 * Component to update map center and zoom when the parent props change.
 */
const MapUpdater: React.FC<{ center: Point; zoom: number; rotation: number }> = ({ center, zoom, rotation }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lon], zoom, { animate: false });
  }, [center, zoom, map]);

  return null;
};

/**
 * Radar Map Component
 * Renders an underlying OpenStreetMap using Leaflet.
 * The map container is rotated in reverse to the radar's orientation to simulate a rotating display.
 */
export const RadarMap: React.FC<RadarMapProps> = ({ center, rangeKm, rotation, size }) => {
  const zoom = calculateZoom(rangeKm, size, center.lat);

  // We use a dark leaflet theme
  // CartoDB Dark Matter is perfect for this
  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div 
      className="absolute inset-0 pointer-events-none opacity-70 radar-map-container"
      style={{ 
        width: size, 
        height: size,
        transform: `rotate(${-rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        touchZoom={false}
        zoomSnap={0}
        zoomDelta={0.1}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <TileLayer
          url={tileUrl}
          attribution={attribution}
        />
        <MapUpdater center={center} zoom={zoom} rotation={rotation} />
      </MapContainer>
    </div>
  );
};
