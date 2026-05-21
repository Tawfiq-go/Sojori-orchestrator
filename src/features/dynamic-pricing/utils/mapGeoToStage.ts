/** Lat/lng Marrakech → coordonnées viewBox carte (aligné PortfolioMap). */

export function latLngToMapStage(lat: number, lng: number): { x: number; y: number } {
  const x = Math.round(((lng + 8.05) / 0.2) * 1000)
  const y = Math.round(((31.65 - lat) / 0.15) * 480)
  return {
    x: Math.max(40, Math.min(1320, x)),
    y: Math.max(40, Math.min(500, y)),
  }
}
