/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  lat: number;
  lon: number;
}

/**
 * Calculates distance between two points in km using Haversine formula
 */
export function getDistance(p1: Point, p2: Point): number {
  const R = 6371; // Earth radius in km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lon - p1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates bearing between two points in degrees (0 = North)
 */
export function getBearing(p1: Point, p2: Point): number {
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const lon1 = p1.lon * Math.PI / 180;
  const lon2 = p2.lon * Math.PI / 180;

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Converts polar coordinates (distance, bearing) to Cartesian (x, y)
 * relative to a center point.
 * distance: km
 * bearing: degrees (0 = North)
 * rotation: degrees (offset for North)
 */
export function polarToCartesian(
  distance: number,
  bearing: number,
  rotation: number,
  maxDistance: number,
  canvasSize: number
): { x: number; y: number } {
  // Adjustment for rotation: bearing is where the plane is relative to North.
  // rotation is which way "radar North" points.
  // Effective angle = bearing - rotation
  const angle = (bearing - rotation - 90) * Math.PI / 180;
  const radius = (distance / maxDistance) * (canvasSize / 2);

  return {
    x: (canvasSize / 2) + radius * Math.cos(angle),
    y: (canvasSize / 2) + radius * Math.sin(angle),
  };
}
