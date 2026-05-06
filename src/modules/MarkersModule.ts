import { AirQoMeasurement } from "../services/AirQoService";
import { mapManager } from "../services/MapManager";
import { stateManager } from "../services/StateManager";
import { getAQILevel } from "../lib/aqi";

class MarkersModule {
  private markers: google.maps.Marker[] = [];
  private infoWindow: google.maps.InfoWindow | null = null;
  private isActive: boolean = true;

  async init() {
    this.infoWindow = new google.maps.InfoWindow({
      maxWidth: 320,
    });

    stateManager.subscribe<AirQoMeasurement[]>("measurements", (measurements) => {
      if (this.isActive) {
        this.updateMarkers(measurements);
      }
    });

    stateManager.subscribe<boolean>("showMarkers", (show) => {
      this.isActive = show;
      if (show) {
        this.updateMarkers(stateManager.get<AirQoMeasurement[]>("measurements") || []);
      } else {
        this.clearMarkers();
      }
    });
  }

  private clearMarkers() {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
  }

  private getMarkerScale(pm25: number): number {
    return Math.min(22, Math.max(14, 14 + (pm25 / 15)));
  }

  private updateMarkers(measurements: AirQoMeasurement[]) {
    const map = mapManager.getMap();
    if (!map || !measurements) return;

    this.clearMarkers();

    measurements.forEach(m => {
      const lat = m.siteDetails?.approximate_latitude;
      const lng = m.siteDetails?.approximate_longitude;
      
      if (!lat || !lng) return;

      const aqi = getAQILevel(m.pm2_5.value);

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: m.siteDetails.location_name || m.siteDetails.name,
        optimized: false,
        label: {
          text: aqi.emoji,
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffffff'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: aqi.color,
          fillOpacity: 0.9,
          strokeWeight: 3,
          strokeColor: "#ffffff",
          scale: this.getMarkerScale(m.pm2_5.value),
          labelOrigin: new google.maps.Point(0, 0)
        }
      });

      if (m.pm2_5.value > 55) {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 3000);
      }

      marker.addListener("click", () => {
        this.showInfoWindow(m, marker);
      });

      this.markers.push(marker);
    });
  }

  private showInfoWindow(m: AirQoMeasurement, marker: google.maps.Marker) {
    const map = mapManager.getMap();
    if (!map || !this.infoWindow) return;

    const aqi = getAQILevel(m.pm2_5.value);

    const content = `
      <div class="p-4 min-w-[280px] font-sans bg-slate-900 text-slate-200">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-base font-black text-slate-900 leading-tight">${m.siteDetails.location_name || m.siteDetails.name}</h3>
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">${m.siteDetails.city}, ${m.siteDetails.district}</p>
          </div>
          <div class="text-3xl">${aqi.emoji}</div>
        </div>
        
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
            <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">PM 2.5</p>
            <p class="text-2xl font-black text-slate-800">${m.pm2_5.value.toFixed(1)} <span class="text-[10px] font-medium text-slate-400">µg/m³</span></p>
          </div>
          <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-center" style="border-left: 4px solid ${aqi.color}">
            <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Status</p>
            <p class="text-sm font-black" style="color: ${aqi.color}">${aqi.label}</p>
          </div>
        </div>

        ${m.health_tips && m.health_tips.length > 0 ? `
          <div class="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              Safety Guide
            </p>
            <p class="text-[11px] text-slate-700 leading-relaxed font-medium italic">"${m.health_tips[0].description}"</p>
          </div>
        ` : ''}
        
        <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          <span>${new Date(m.time).toLocaleTimeString()}</span>
          <span>Sensor: ${m.device_id.slice(-6)}</span>
        </div>
      </div>
    `;

    this.infoWindow.setContent(content);
    this.infoWindow.open(map, marker);
  }
}

export const markersModule = new MarkersModule();

