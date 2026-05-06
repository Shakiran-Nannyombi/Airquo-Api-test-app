import { mapManager } from "../services/MapManager";
import { stateManager } from "../services/StateManager";
import { AirQoMeasurement } from "../services/AirQoService";
import { importLibrary } from "@googlemaps/js-api-loader";
import { RouteResult } from "../types";

class RouteModule {
  private routesLib: any = null;
  private polylines: google.maps.Polyline[] = [];

  async init() {
    if (this.routesLib) return;
    this.routesLib = await importLibrary("routes");
  }

  async calculateRoute(origin: string, destination: string): Promise<RouteResult[]> {
    if (!this.routesLib) await this.init();
    const map = mapManager.getMap();
    if (!map) throw new Error("Map not initialized");

    this.clear();

    const request = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: 'DRIVING',
      computeAlternativeRoutes: true,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport']
    };

    try {
      // @ts-ignore - The routes library might have different typing in @types/google.maps
      const response = await this.routesLib.Route.computeRoutes(request);
      const routes = response.routes;
      
      if (!routes || routes.length === 0) {
        throw new Error("No routes found between these locations.");
      }

      const measurements = stateManager.get<AirQoMeasurement[]>("measurements") || [];
      
      const scoredRoutes: RouteResult[] = routes.map((route: any) => {
        const score = this.evaluateRouteAQI(route.path, measurements);
        return { route, score };
      });

      // Best first
      scoredRoutes.sort((a, b) => a.score - b.score);

      scoredRoutes.forEach(({ route, score }, index) => {
        const isBest = index === 0;
        // Color intensity based on score
        const color = isBest ? '#10B981' : '#64748B'; 
        const opacity = isBest ? 0.9 : 0.4;
        const weight = isBest ? 8 : 4;

        const polyline = new google.maps.Polyline({
          path: route.path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: opacity,
          strokeWeight: weight,
          map: map,
          zIndex: isBest ? 100 : 10
        });

        this.polylines.push(polyline);
        
        // Add a click listener to show route details if needed
        polyline.addListener('click', () => {
             console.log(`Route ${index} score: ${score}`);
        });
      });

      if (routes[0].viewport) {
        map.fitBounds(routes[0].viewport);
      }
      
      return scoredRoutes;
    } catch (error) {
      console.error("Route calculation failed:", error);
      throw error;
    }
  }

  private evaluateRouteAQI(path: any[], measurements: AirQoMeasurement[]): number {
    if (!path || path.length === 0) return 0;
    
    // Sample points along the route to reduce computation
    const samplingRate = Math.max(1, Math.floor(path.length / 15));
    let totalPM25 = 0;
    let pointCount = 0;

    for (let i = 0; i < path.length; i += samplingRate) {
      const point = path[i];
      // point might be google.maps.LatLng or {lat: number, lng: number}
      const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
      const lng = typeof point.lng === 'function' ? point.lng() : point.lng;
      
      const pm25 = this.estimatePM25(lat, lng, measurements);
      totalPM25 += pm25;
      pointCount++;
    }

    return pointCount === 0 ? 0 : totalPM25 / pointCount;
  }

  private estimatePM25(lat: number, lng: number, measurements: AirQoMeasurement[]): number {
    if (measurements.length === 0) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    const p = 2; // Inverse Distance Weighting power

    for (const m of measurements) {
      const mLat = m.siteDetails.approximate_latitude;
      const mLng = m.siteDetails.approximate_longitude;
      const dist = this.haversineDistance(lat, lng, mLat, mLng);
      
      if (dist < 0.05) return m.pm2_5.value; // Snap to very close sensors
      
      const weight = 1 / Math.pow(dist, p);
      weightedSum += m.pm2_5.value * weight;
      totalWeight += weight;
    }

    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  hide() {
    this.polylines.forEach(p => p.setMap(null));
  }

  show() {
    const map = mapManager.getMap();
    this.polylines.forEach(p => p.setMap(map));
  }

  clear() {
    this.polylines.forEach(p => p.setMap(null));
    this.polylines = [];
  }
}

export const routeModule = new RouteModule();
