// Using relative path to let Vite proxy handle the request
const API_BASE_URL = '/api';

export interface KPISummary {
  id: number;
  timestamp: string;
  attendance_rate: number;
  absences_today: number;
  vehicles_on_road: string;
  coach_swaps: number;
  on_time_performance: number;
  canceled_trips: string;
  operator_cost: string;
}

export const fetchKPISummary = async (): Promise<KPISummary> => {
  try {
    const response = await fetch(`${API_BASE_URL}/kpi/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching KPI summary:', error);
    throw error;
  }
};

export const fetchWithRetry = async <T>(url: string, options: RequestInit = {}, retries = 3): Promise<T> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry<T>(url, options, retries - 1);
    }
    console.error(`Failed to fetch after multiple retries: ${url}`, error);
    throw error;
  }
};
