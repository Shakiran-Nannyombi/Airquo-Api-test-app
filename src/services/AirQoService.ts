import axios from 'axios';

export interface AirQoMeasurement {
  device_id: string;
  time: string;
  pm2_5: {
    value: number;
  };
  siteDetails: {
    name: string;
    location_name: string;
    approximate_latitude: number;
    approximate_longitude: number;
    district: string;
    city: string;
  };
  aqi_category: string;
  aqi_index: number;
  aqi_color: string;
  health_tips?: Array<{
    title: string;
    description: string;
  }>;
}

class AirQoService {
  private baseUrl = '/api/airqo/measurements';

  async fetchLatestMeasurements(): Promise<AirQoMeasurement[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data.measurements || [];
    } catch (error: any) {
      console.error("Error fetching AirQo data:", error);
      const status = error.response?.status;
      if (status === 401) {
        throw new Error("AirQo API Authorization failed (401). Please check your API key.");
      }
      throw new Error(`Failed to fetch air quality data: ${error.message}`);
    }
  }

  normalizePM25(value: number): number {
    // Normalize PM2.5 (usually 0-500+) to a 0-100 scale for heatmap weights
    // Based on AQI categories: 0-12 (Good), 12-35 (Moderate), etc.
    return Math.min(Math.max(value, 0) / 2, 100); 
  }
}

export const airQoService = new AirQoService();
