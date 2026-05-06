import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

class MapManager {
  private map: google.maps.Map | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      setOptions({
        key: apiKey,
        v: "weekly",
      });
    } else {
      console.warn("Google Maps API Key is missing. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.");
    }
  }

  async initMap(element: HTMLElement, options: google.maps.MapOptions): Promise<google.maps.Map> {
    try {
      const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;
      // Pre-load visualization and places as they are commonly used in the app
      await importLibrary("visualization");
      await importLibrary("places");
      
      this.map = new Map(element, options);
      return this.map;
    } catch (error) {
      console.error("Error loading Google Maps via importLibrary:", error);
      throw error;
    }
  }

  getMap(): google.maps.Map | null {
    return this.map;
  }
}

export const mapManager = new MapManager();
