import L from 'leaflet';

/**
 * SwiftFleet Map Configuration
 *
 * Defaults to clean, unwatermarked OpenStreetMap raster tiles.
 * Supports environment overrides via:
 *   - VITE_MAP_TILE_URL: Custom tile server URL (e.g. self-hosted tile server or custom style)
 *   - VITE_CARTO_API_KEY: CartoDB API Key if using Carto Voyager or Positron tiles
 */

const customTileUrl = import.meta.env.VITE_MAP_TILE_URL;
const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;

export const MAP_CONFIG = {
  tileUrl: customTileUrl
    ? customTileUrl
    : cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: customTileUrl
    ? '&copy; Map Data'
    : cartoApiKey
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  subdomains: cartoApiKey ? 'abcd' : 'abc'
};

export const DEFAULT_MAP_CENTER = [
  parseFloat(import.meta.env.VITE_DEFAULT_LAT || '28.6139'),
  parseFloat(import.meta.env.VITE_DEFAULT_LNG || '77.2090')
]; // New Delhi, India [lat, lng]

export const DEFAULT_MAP_ZOOM = 13;

export const createTileLayer = () => {
  return L.tileLayer(MAP_CONFIG.tileUrl, {
    attribution: MAP_CONFIG.attribution,
    maxZoom: MAP_CONFIG.maxZoom,
    subdomains: MAP_CONFIG.subdomains
  });
};
