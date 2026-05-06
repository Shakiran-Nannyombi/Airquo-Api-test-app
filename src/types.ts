export type MapLayer = 'heatmap' | 'markers' | 'route';

export interface RouteResult {
  route: any;
  score: number;
}

export interface SiteStatistics {
  averagePM25: number;
  totalDevices: number;
  highestSite: {
    name: string;
    value: number;
  } | null;
  lowestSite: {
    name: string;
    value: number;
  } | null;
}
