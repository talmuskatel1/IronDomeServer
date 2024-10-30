export interface Coordinate {
  lat: number;
  lng: number;
}

export interface MapCell {
  id: string;
  coordinate: Coordinate;
  buildingDensity: number;
  threatLevel: number;
  importanceLevel:number;
  isInIsrael: boolean;
}

export interface Dome {
  id: string;
  coordinate: Coordinate;
}

export interface ThreatSource {
  name: string;
  type: 'point' | 'line';
  coordinates: number[] | number[][];
  maxThreat: number;
  maxDistance: number;
}

export interface StrategicSite {
  name: string;
  coordinates: [number, number];
  importance: number;
}