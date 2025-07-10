import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// Base URL for API requests - will be proxied by Vite in development
const API_BASE_URL = '/api/v1';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Type definitions for GTFS data
export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
  route_text_color?: string;
  route_desc?: string;
  route_url?: string;
  agency_id?: string;
  route_sort_order?: number;
  continuous_pickup?: number;
  continuous_drop_off?: number;
  network_id?: string;
  geometry?: any;
  created_at?: string;
  updated_at?: string;
}

export interface VehiclePosition {
  id?: string;
  vehicle_id: string;
  trip_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  timestamp: number;
  vehicle_label?: string;
  occupancy_status?: string;
  current_stop_sequence?: number;
  current_status?: string;
  updated_at: string;
  direction_id?: number;
  direction_name?: string;
  headsign?: string;
  agency?: string;
  status?: number;
}

export interface Direction {
  direction_id: number;
  direction_name: string;
  headsigns: string[];
  trip_count: number;
}

export interface RouteWithDirections {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_color?: string;
  route_text_color?: string;
  directions: Direction[];
}

export interface Trip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
  direction_id?: number;
  block_id?: string;
  shape_id?: string;
  wheelchair_accessible?: number;
  bikes_allowed?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  wheelchair_boarding?: boolean | null;
}

export interface ShapePoint {
  lat: number;
  lon: number;
  sequence: number;
}

export interface Shape {
  shape_id: string;
  points: ShapePoint[];
}

export interface RouteDetails {
  route: Route;
  shapes: Shape[];
  stops: Stop[];
}

interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Helper function to create request config
const createRequestConfig = (options: any = {}): AxiosRequestConfig => {
  return {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
};

// Type for custom request config
interface CustomRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// Add request interceptor to handle auth token
apiClient.interceptors.request.use(
  (config: any) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        url: response.config.url,
        method: response.config.method,
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomRequestConfig;
    
    // Log the error with detailed information
    console.error('API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
      config: error.config
    });
    
    // Handle specific error statuses
    if (error.response) {
      if (error.response.status === 401) {
        // Handle unauthorized
        console.warn('Authentication required');
      } else if (error.response.status === 404) {
        console.error('API endpoint not found:', originalRequest?.url);
      } else if (error.response.status >= 500) {
        console.error('Server error:', error.response.status);
      } else if (error.response.status === 429) {
        console.warn('Rate limit exceeded, please try again later');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server. Network error?');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Test the API connection
 */
interface RoutesResponse {
  routes: Route[];
  status: 'success' | 'error';
  message: string;
}

interface TestConnectionResponse {
  port: number;
}

export const testApiConnection = async (): Promise<ApiResponse<TestConnectionResponse>> => {
  try {
    const response = await apiClient.get<TestConnectionResponse>('/test');
    return {
      data: response.data,
      status: 'success',
      message: 'API connection successful'
    };
  } catch (error) {
    console.error('API connection test failed:', error);
    return {
      data: { port: 0 },
      status: 'error',
      message: error instanceof Error ? error.message : 'API connection failed'
    };
  }
};

/**
 * Get all transit routes with pagination
 */
interface RoutesResponse {
  routes: Route[];
  status: 'success' | 'error';
  message: string;
}

export const getRoutes = async (): Promise<Route[]> => {
  try {
    console.log('Fetching bus routes...');
    const response = await apiClient.get<RoutesResponse>('/routes');
    
    if (!response.data || !Array.isArray(response.data.routes)) {
      console.warn('Invalid response format - missing routes array');
      return [];
    }
    
    const routes = response.data.routes;
    
    // Filter for bus routes (route_type = 3) and map to Route objects
    const busRoutes = routes
      .filter(route => route.route_type === 3)
      .map(route => ({
        route_id: String(route.route_id || ''),
        route_short_name: String(route.route_short_name || ''),
        route_long_name: String(route.route_long_name || ''),
        route_type: 3, // Ensure it's a bus route
        route_color: String(route.route_color || '3182ce').replace(/^#/, ''),
        route_text_color: String(route.route_text_color || 'ffffff').replace(/^#/, ''),
        route_desc: String(route.route_desc || ''),
        route_url: String(route.route_url || ''),
        agency_id: String(route.agency_id || '')
      }));
    
    console.log(`Fetched ${busRoutes.length} bus routes`);
    return busRoutes;
    
  } catch (error) {
    console.error('Error fetching bus routes:', error);
    // Return empty array instead of throwing to prevent uncaught promise rejections
    return [];
  }
};

/**
 * Get detailed information about a specific route
 */
export const getRouteDetails = async (routeId: string): Promise<ApiResponse<RouteDetails>> => {
  try {
    console.log(`Fetching details for route ${routeId}`);
    
    // The new API returns route details with shapes and stops in one call
    const routeRes = await apiClient.get(`/routes/${routeId}`);
    
    // Extract data from response
    const routeData = routeRes.data;
    
    // Process shapes from the combined response
    const shapes: Shape[] = [];
    if (routeData.shapes && Array.isArray(routeData.shapes)) {
      routeData.shapes.forEach((shape: any) => {
        if (shape.shape_id && Array.isArray(shape.points)) {
          shapes.push({
            shape_id: shape.shape_id,
            points: shape.points.map((p: any) => ({
              lat: p.lat,
              lon: p.lon,
              sequence: p.sequence
            }))
          });
        }
      });
    }
    
    // Process stops from the combined response
    const stops: Stop[] = [];
    if (routeData.stops && Array.isArray(routeData.stops)) {
      routeData.stops.forEach((stop: any) => {
        if (stop.stop_id) {
          stops.push({
            stop_id: stop.stop_id,
            stop_name: stop.stop_name || '',
            stop_lat: parseFloat(stop.stop_lat) || 0,
            stop_lon: parseFloat(stop.stop_lon) || 0,
            wheelchair_boarding: stop.wheelchair_boarding
          });
        }
      });
    }
    
    return {
      data: {
        route: routeData.route,
        shapes,
        stops
      },
      status: 'success' as const
    };
  } catch (error) {
    console.error(`Error fetching details for route ${routeId}:`, error);
    return {
      data: {} as RouteDetails,
      status: 'error' as const,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get real-time vehicle positions
export const getVehiclePositions = async (routeId?: string): Promise<ApiResponse<VehiclePosition[]>> => {
  try {
    console.log(`Fetching vehicle positions${routeId ? ` for route ${routeId}` : ''}`);
    
    const params: Record<string, any> = {};
    if (routeId) {
      params.route_id = routeId;
    }
    
    const response = await apiClient.get(
      '/gtfs-rt/vehicles',
      createRequestConfig({ params })
    );
    
    // Process vehicle positions
    let vehicles: VehiclePosition[] = [];
    const responseData = response.data?.data || response.data;
    
    if (Array.isArray(responseData)) {
      vehicles = responseData.map((v: any) => ({
        vehicle_id: v.vehicle_id || '',
        trip_id: v.trip_id || '',
        route_id: v.route_id || '',
        latitude: parseFloat(v.latitude) || 0,
        longitude: parseFloat(v.longitude) || 0,
        bearing: parseFloat(v.bearing) || 0,
        speed: parseFloat(v.speed) || 0,
        timestamp: v.timestamp || Math.floor(Date.now() / 1000),
        vehicle_label: v.vehicle_label || '',
        occupancy_status: v.occupancy_status || 'UNKNOWN',
        current_stop_sequence: v.current_stop_sequence || 0,
        current_status: v.current_status || 'IN_TRANSIT_TO',
        updated_at: v.updated_at || new Date().toISOString()
      }));
    }
    
    return {
      data: vehicles,
      status: 'success' as const
    };
  } catch (error) {
    console.error('Error fetching vehicle positions:', error);
    return {
      data: [],
      status: 'error' as const,
      message: error instanceof Error ? error.message : 'Failed to fetch vehicle positions'
    };
  }
};

// Get GTFS shapes for drawing on the map
export const getShapes = async (shapeId?: string): Promise<ApiResponse<Record<string, ShapePoint[]>>> => {
  try {
    const response = await apiClient.get<Record<string, ShapePoint[]>>('/shapes', {
      params: shapeId ? { shape_id: shapeId } : {}
    });
    
    return {
      data: response.data,
      status: 'success',
      message: 'Shapes fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching shapes:', error);
    return {
      data: {},
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch shapes'
    };
  }
};

/**
 * Get stops for a specific route
 */
export const getRouteStops = async (routeId: string): Promise<ApiResponse<Stop[]>> => {
  try {
    console.log(`Fetching stops for route ${routeId}`);
    
    const response = await apiClient.get(`/stops?route_id=${routeId}`);
    
    if (response.data.status === 'success') {
      return {
        data: response.data.data || [],
        status: 'success',
        message: response.data.message
      };
    } else {
      return {
        data: [],
        status: 'error',
        message: response.data.message || 'Failed to fetch stops'
      };
    }
  } catch (error) {
    console.error(`Error fetching stops for route ${routeId}:`, error);
    return {
      data: [],
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get routes with their direction information
 */
export const getRoutesWithDirections = async (routeId?: string): Promise<ApiResponse<RouteWithDirections[]>> => {
  try {
    console.log(`Fetching routes with directions${routeId ? ` for route ${routeId}` : ''}`);
    
    const params: Record<string, any> = {};
    if (routeId) {
      params.route_id = routeId;
    }
    
    const response = await apiClient.get('/routes/directions', { params });
    
    return {
      data: response.data.data || [],
      status: response.data.status || 'success',
      message: response.data.message || 'Routes with directions retrieved successfully'
    };
  } catch (error) {
    console.error('Error fetching routes with directions:', error);
    return {
      data: [],
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get real-time vehicle positions with direction information
 */
export const getRealTimeVehicles = async (routeId?: string, agency: string = 'golden_gate'): Promise<ApiResponse<VehiclePosition[]>> => {
  try {
    console.log(`Fetching real-time vehicles${routeId ? ` for route ${routeId}` : ''}`);
    
    const params: Record<string, any> = { agency };
    if (routeId) {
      params.route_id = routeId;
    }
    
    const response = await apiClient.get('/vehicles/realtime', { params });
    
    // Process vehicle positions to ensure correct types
    const vehicles: VehiclePosition[] = (response.data.data || []).map((v: any) => ({
      vehicle_id: v.vehicle_id || '',
      trip_id: v.trip_id || '',
      route_id: v.route_id || '',
      latitude: parseFloat(v.latitude) || 0,
      longitude: parseFloat(v.longitude) || 0,
      bearing: v.bearing ? parseFloat(v.bearing) : 0,
      speed: v.speed ? parseFloat(v.speed) : 0,
      timestamp: typeof v.timestamp === 'string' ? new Date(v.timestamp).getTime() / 1000 : v.timestamp || Math.floor(Date.now() / 1000),
      vehicle_label: v.vehicle_label || v.vehicle_id || '',
      occupancy_status: v.occupancy_status || 'UNKNOWN',
      current_stop_sequence: v.current_stop_sequence || 0,
      current_status: v.current_status || 'IN_TRANSIT_TO',
      updated_at: v.updated_at || new Date().toISOString(),
      direction_id: v.direction_id,
      direction_name: v.direction_name,
      headsign: v.headsign,
      agency: v.agency,
      status: v.status
    }));
    
    return {
      data: vehicles,
      status: response.data.status || 'success',
      message: response.data.message || 'Real-time vehicles retrieved successfully'
    };
  } catch (error) {
    console.error('Error fetching real-time vehicles:', error);
    return {
      data: [],
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Trigger manual update of GTFS static data
 */
export const triggerStaticDataUpdate = async (agency: string = 'golden_gate'): Promise<ApiResponse<any>> => {
  try {
    console.log(`Triggering static data update for ${agency}`);
    
    const response = await apiClient.post(`/data/update-static?agency=${agency}`);
    
    return {
      data: response.data,
      status: response.data.status || 'success',
      message: response.data.message
    };
  } catch (error) {
    console.error('Error triggering static data update:', error);
    return {
      data: {},
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get data update status
 */
export const getDataStatus = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.get('/data/status');
    
    return {
      data: response.data.data || {},
      status: 'success',
      message: 'Data status retrieved successfully'
    };
  } catch (error) {
    console.error('Error getting data status:', error);
    return {
      data: {},
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export default apiClient;
