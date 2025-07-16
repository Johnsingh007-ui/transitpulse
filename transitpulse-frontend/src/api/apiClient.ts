import axios, { AxiosInstance, AxiosError } from 'axios';

// Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Add auth token if available
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    console.error('API Error:', {
      url: originalRequest?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// ------------------------- Types ------------------------

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
  route_text_color?: string;
  route_desc?: string;
  agency_id?: string;
}

export interface VehiclePosition {
  vehicle_id: string;
  trip_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  timestamp: number;
  direction_id?: number;
  direction_name?: string;
  status?: number;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

export interface TripStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_sequence: number;
  scheduled_arrival?: string;
  predicted_arrival?: string;
  delay_seconds?: number;
  status: 'completed' | 'current' | 'upcoming' | 'missed';
}

export interface ActiveTrip {
  vehicle_id: string;
  route_id: string;
  route_short_name: string;
  trip_headsign: string;
  status: 'on_time' | 'late' | 'early' | 'delayed';
  delay_minutes: number;
  progress_percentage: number;
  current_stop_name?: string;
  last_updated: string;
  latitude: number;
  longitude: number;
  trip_id: string;
}

export interface VehicleTripSummary {
  status: string;
  vehicle: {
    id: string;
    route: {
      number: string;
      name: string;
      destination: string;
      color: string;
      text_color: string;
    };
    position: {
      lat: number;
      lon: number;
      last_updated: string;
    };
  };
  progress: {
    completed_stops: number;
    total_stops: number;
    upcoming_stops: number;
    progress_percentage: number;
  };
  upcoming_stops: any[];
  has_real_time_data: boolean;
  last_updated: string;
}

// ------------------------- API Calls ------------------------

export const getRoutes = async (): Promise<Route[]> => {
  const res = await apiClient.get('/routes');
  return res.data.routes || [];
};

export const getRouteStops = async (routeId: string): Promise<Stop[]> => {
  const res = await apiClient.get(`/gtfs/stops?route_id=${routeId}`);
  return res.data.data || [];
};

export const getActiveTrips = async (): Promise<ActiveTrip[]> => {
  const res = await apiClient.get('/vehicles/realtime');
  return Array.isArray(res.data) ? res.data : [];
};

export const getVehicleTripSummary = async (
  vehicleId: string
): Promise<VehicleTripSummary | null> => {
  try {
    const res = await apiClient.get(`/trips/vehicle-trip-summary/${vehicleId}`);
    return res.data.status === 'success' ? res.data : null;
  } catch {
    return null;
  }
};

// ------------------------- Real Stop Builder ------------------------

export const buildRealStopData = async (routeId: string): Promise<TripStop[]> => {
  try {
    console.log(`🔄 Building stop data for route ${routeId}...`);

    const [stops, activeTrips] = await Promise.all([
      getRouteStops(routeId),
      getActiveTrips(),
    ]);

    if (stops.length === 0) {
      console.warn(`⚠️ No stops found for route ${routeId}`);
      return [];
    }

    const stopData: TripStop[] = await Promise.all(
      stops.map(async (stop, index) => {
        const stopPos = { lat: stop.stop_lat, lon: stop.stop_lon };
        let enrichedStop: TripStop = {
          stop_id: stop.stop_id,
          stop_name: stop.stop_name,
          stop_lat: stop.stop_lat,
          stop_lon: stop.stop_lon,
          stop_sequence: index + 1,
          status: 'upcoming',
        };

        // Find nearest trip to this stop
        const nearbyTrip = activeTrips.find((trip) => {
          const dx = trip.latitude - stopPos.lat;
          const dy = trip.longitude - stopPos.lon;
          return Math.sqrt(dx * dx + dy * dy) < 0.01;
        });

        if (nearbyTrip) {
          const summary = await getVehicleTripSummary(nearbyTrip.vehicle_id);
          const matched = summary?.upcoming_stops?.find(
            (s) => s.stop_name === stop.stop_name
          );

          if (matched) {
            enrichedStop.scheduled_arrival = matched.scheduled_time;
            enrichedStop.predicted_arrival = matched.predicted_time;
            enrichedStop.delay_seconds = matched.delay?.seconds;
            enrichedStop.status = 'current';
          }
        } else {
          enrichedStop.status = index < stops.length / 2 ? 'completed' : 'upcoming';
        }

        return enrichedStop;
      })
    );

    console.log(`✅ Finished building ${stopData.length} stops for ${routeId}`);
    return stopData;
  } catch (error) {
    console.error(`❌ Failed to build stop data for ${routeId}`, error);
    return [];
  }
};

// ------------------------- Export ------------------------

export default apiClient;
