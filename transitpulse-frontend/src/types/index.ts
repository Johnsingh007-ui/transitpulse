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
