export interface AlertArea {
  areaName: string;
  areaNameHe: string;
  lat: number;
  lng: number;
  threatLevel: number;}

export interface Alert {
  id: string;
  category: string;
  title: string;
  description: string;
  areas: AlertArea[];
  timestamp: Date;
}

export interface AlertHistory {
  areaName: string;
  alertCount: number;
  lastAlert: Date;
  threatLevel: number;
}
export interface CityLocation {
  lat: number;
  lng: number;
}

export interface City {
  city: string;
  region: string;
  location: CityLocation;
}