import { airQoService, AirQoMeasurement } from "../services/AirQoService";
import { mapManager } from "../services/MapManager";
import { stateManager } from "../services/StateManager";

class HeatmapModule {
  private heatmap: google.maps.visualization.HeatmapLayer | null = null;
  private isActive: boolean = true;

  async init() {
    const map = mapManager.getMap();
    if (!map) return;

    stateManager.subscribe<AirQoMeasurement[]>("measurements", (measurements) => {
      if (this.isActive) {
        this.updateHeatmap(measurements);
      }
    });

    stateManager.subscribe<boolean>("showHeatmap", (show) => {
      this.isActive = show;
      if (show) {
        this.updateHeatmap(stateManager.get<AirQoMeasurement[]>("measurements") || []);
      } else {
        if (this.heatmap) {
          this.heatmap.setMap(null);
        }
      }
    });
  }

  private updateHeatmap(measurements: AirQoMeasurement[]) {
    const map = mapManager.getMap();
    if (!map || !measurements) return;

    if (this.heatmap) {
      this.heatmap.setMap(null);
    }

    const heatmapData = measurements
      .filter(m => m.siteDetails?.approximate_latitude && m.siteDetails?.approximate_longitude && m.pm2_5?.value !== undefined)
      .map(m => ({
        location: new google.maps.LatLng(m.siteDetails.approximate_latitude, m.siteDetails.approximate_longitude),
        weight: airQoService.normalizePM25(m.pm2_5.value)
      }));

    this.heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map,
      radius: 30,
      opacity: 0.8
    });
  }
}

export const heatmapModule = new HeatmapModule();
