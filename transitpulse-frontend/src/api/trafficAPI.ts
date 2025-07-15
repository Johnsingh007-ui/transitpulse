/**
 * Traffic API Client
 * Handles communication with the traffic data backend
 */

export interface TrafficCondition {
  road_name: string;
  direction: string;
  speed: number;
  normal_speed: number;
  congestion_level: 'light' | 'moderate' | 'heavy';
  coordinates: Array<{lat: number, lng: number}>;
}

export interface TrafficIncident {
  type: 'accident' | 'construction' | 'breakdown' | 'weather';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  location: string;
  coordinates: {lat: number, lng: number};
  reported_at: string;
  estimated_clearance?: string;
}

export interface TrafficData {
  flow: TrafficCondition[];
  incidents: TrafficIncident[];
  last_updated: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

class TrafficAPI {
  private baseUrl: string;
  private updateInterval: number = 60000; // 1 minute
  private intervalId: NodeJS.Timeout | null = null;

  constructor(baseUrl = 'http://localhost:9002/api/v1/traffic') {
    this.baseUrl = baseUrl;
  }

  async getTrafficConditions(): Promise<TrafficData> {
    try {
      const response = await fetch(`${this.baseUrl}/conditions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch traffic conditions:', error);
      throw error;
    }
  }

  async getTrafficIncidents(): Promise<TrafficIncident[]> {
    try {
      const response = await fetch(`${this.baseUrl}/incidents`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch traffic incidents:', error);
      throw error;
    }
  }

  async getRoadTraffic(roadName: string): Promise<TrafficCondition[]> {
    try {
      const response = await fetch(`${this.baseUrl}/flow/${encodeURIComponent(roadName)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error(`Failed to fetch traffic for ${roadName}:`, error);
      throw error;
    }
  }

  startRealTimeUpdates(callback: (data: TrafficData) => void): void {
    if (this.intervalId) {
      this.stopRealTimeUpdates();
    }

    // Initial fetch
    this.getTrafficConditions().then(callback).catch(console.error);

    // Set up periodic updates
    this.intervalId = setInterval(async () => {
      try {
        const data = await this.getTrafficConditions();
        callback(data);
      } catch (error) {
        console.error('Error in traffic update:', error);
      }
    }, this.updateInterval);
  }

  stopRealTimeUpdates(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getCongestionColor(level: string): string {
    switch (level) {
      case 'heavy':
        return '#FF0000';  // Red
      case 'moderate':
        return '#FFAA00';  // Orange
      case 'light':
        return '#00AA00';  // Green
      default:
        return '#808080';  // Gray
    }
  }

  getIncidentIcon(type: string): string {
    switch (type) {
      case 'accident':
        return '🚗💥';
      case 'construction':
        return '🚧';
      case 'breakdown':
        return '⚠️';
      case 'weather':
        return '🌧️';
      default:
        return '⚠️';
    }
  }
}

// Export singleton instance
export const trafficAPI = new TrafficAPI();
export default trafficAPI;
