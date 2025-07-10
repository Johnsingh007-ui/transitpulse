export interface Vehicle {
  vehicle_id: string | number;
  latitude: number;
  longitude: number;
  bearing?: number;
  route_id?: string | null;
  trip_id?: string | null;
  current_status?: number | string | null;
  speed?: number | null;
  timestamp: string | Date;
  direction_id?: number;
  direction_name?: string;
  headsign?: string;
  agency?: string;
  status?: number;
  [key: string]: any; // Allow for additional properties
}

export interface KPISummary {
  attendance_rate: number;
  absences_today: number;
  vehicles_on_road: string;
  coach_swaps: number;
  on_time_performance: number;
  canceled_trips: string;
  operator_cost: string;
  id: number;
  timestamp: string;
}

export interface RouteDirection {
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
  directions: RouteDirection[];
}
