import { mapManager } from "./MapManager";
import { stateManager } from "./StateManager";
import { airQoService } from "./AirQoService";
import { heatmapModule } from "../modules/HeatmapModule";
import { markersModule } from "../modules/MarkersModule";
import { routeModule } from "../modules/RouteModule";

class StageManager {
  async init(mapElement: HTMLElement) {
    try {
      // 1. Initialize Map
      const map = await mapManager.initMap(mapElement, {
        center: { lat: 0.3476, lng: 32.5825 }, // Kampala, Uganda
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            "elementType": "geometry",
            "stylers": [{ "color": "#1d2c4d" }]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#8ec3b9" }]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#1a3646" }]
          },
          {
            "featureType": "administrative.country",
            "elementType": "geometry.stroke",
            "stylers": [{ "color": "#4b6878" }]
          },
          {
            "featureType": "administrative.land_parcel",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#64779e" }]
          },
          {
            "featureType": "administrative.province",
            "elementType": "geometry.stroke",
            "stylers": [{ "color": "#4b6878" }]
          },
          {
            "featureType": "landscape.man_made",
            "elementType": "geometry.stroke",
            "stylers": [{ "color": "#334e87" }]
          },
          {
            "featureType": "landscape.natural",
            "elementType": "geometry",
            "stylers": [{ "color": "#023e58" }]
          },
          {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{ "color": "#283d6a" }]
          },
          {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#6f9ba5" }]
          },
          {
            "featureType": "poi",
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#1d2c4d" }]
          },
          {
            "featureType": "poi.park",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#023e58" }]
          },
          {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#3C7680" }]
          },
          {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{ "color": "#304a7d" }]
          },
          {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#98a5be" }]
          },
          {
            "featureType": "road",
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#1d2c4d" }]
          },
          {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{ "color": "#2c6675" }]
          },
          {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [{ "color": "#255763" }]
          },
          {
            "featureType": "road.highway",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#b0d5ce" }]
          },
          {
            "featureType": "road.highway",
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#023e58" }]
          },
          {
            "featureType": "transit",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#98a5be" }]
          },
          {
            "featureType": "transit",
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#1d2c4d" }]
          },
          {
            "featureType": "transit.line",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#283d6a" }]
          },
          {
            "featureType": "transit.station",
            "elementType": "geometry",
            "stylers": [{ "color": "#3a4762" }]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#0e1626" }]
          },
          {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#4e6d70" }]
          }
        ]
      });

      // 2. Initialize Modules
      stateManager.set("showHeatmap", true);
      stateManager.set("showMarkers", false);

      await heatmapModule.init();
      await markersModule.init();
      await routeModule.init();

      // 3. Fetch Data
      try {
        const measurements = await airQoService.fetchLatestMeasurements();
        stateManager.set("measurements", measurements);
        console.log("Stage Manager initialized with", measurements.length, "measurements");
      } catch (error) {
        console.error("Data fetch failed in StageManager:", error);
        throw error;
      }
    } catch (error) {
      console.error("Failed to initialize Stage Manager:", error);
      throw error;
    }
  }
}

export const stageManager = new StageManager();
