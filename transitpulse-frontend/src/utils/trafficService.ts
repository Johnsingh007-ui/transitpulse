/**
 * Traffic Service Configuration
 * Provides real-time traffic data from multiple providers
 */

export interface TrafficProvider {
  name: string;
  url: string;
  attribution: string;
  opacity: number;
  zIndex: number;
  maxZoom: number;
  requiresAuth: boolean;
}

// OpenStreetMap Traffic (Free)
export const osmTraffic: TrafficProvider = {
  name: 'OpenStreetMap Traffic',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  opacity: 0.6,
  zIndex: 1000,
  maxZoom: 18,
  requiresAuth: false
};

// HERE Traffic (Free tier available)
export const hereTraffic: TrafficProvider = {
  name: 'HERE Traffic',
  url: 'https://2.traffic.maps.ls.hereapi.com/maptile/2.1/traffictile/newest/normal.day/{z}/{x}/{y}/256/png8',
  attribution: 'Traffic &copy; <a href="https://developer.here.com/">HERE</a>',
  opacity: 0.7,
  zIndex: 1000,
  maxZoom: 18,
  requiresAuth: false
};

// HERE Incidents
export const hereIncidents: TrafficProvider = {
  name: 'HERE Incidents',
  url: 'https://2.traffic.maps.ls.hereapi.com/maptile/2.1/incidenttile/newest/normal.day/{z}/{x}/{y}/256/png8',
  attribution: 'Incidents &copy; HERE',
  opacity: 0.8,
  zIndex: 1001,
  maxZoom: 18,
  requiresAuth: false
};

// Bing Maps Traffic (Alternative)
export const bingTraffic: TrafficProvider = {
  name: 'Bing Traffic',
  url: 'https://t0.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{quadkey}?mkt=en-US&it=Z,TF&shading=hill&og=2&n=z',
  attribution: 'Traffic &copy; <a href="https://www.bing.com/maps">Bing Maps</a>',
  opacity: 0.6,
  zIndex: 1000,
  maxZoom: 18,
  requiresAuth: false
};

// Get color-coded traffic layers (Google Maps style)
export const getTrafficColorScheme = () => ({
  heavy: '#FF0000',    // Red for heavy traffic
  moderate: '#FFAA00', // Orange for moderate traffic
  light: '#00AA00',    // Green for light traffic
  unknown: '#808080'   // Gray for unknown
});

// Real-time traffic update interval (in milliseconds)
export const TRAFFIC_UPDATE_INTERVAL = 60000; // 1 minute

export default {
  osmTraffic,
  hereTraffic,
  hereIncidents,
  bingTraffic,
  getTrafficColorScheme,
  TRAFFIC_UPDATE_INTERVAL
};
