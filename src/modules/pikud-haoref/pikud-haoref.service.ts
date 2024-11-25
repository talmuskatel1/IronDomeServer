import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Alert, AlertArea, AlertHistory, City } from './pikud-haoref.types';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PikudHaorefService {
    private readonly logger = new Logger(PikudHaorefService.name);
    private currentAlerts: Alert[] = [];
    private alertHistory: Map<string, AlertHistory> = new Map();
    private cities: City[] = [];
    private readonly POLLING_INTERVAL = 5000;

    constructor(private eventEmitter: EventEmitter2) {
        this.loadCities();
        this.startPolling();
        this.logger.log('PikudHaoref Service started');
    }

    private loadCities() {
        try {
            const filePath = path.resolve(__dirname, '..', '..', '..', 'src', 'data', 'city-locations.json');
            const cityData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            this.cities = cityData.cities;
            this.logger.log(`Loaded ${this.cities.length} cities`);
        } catch (error) {
            this.logger.error('Failed to load city data:', error.message);
        }
    }

    private async startPolling() {
        const poll = async () => {
            try {
                const response = await axios.get('https://www.oref.org.il/WarningMessages/Alert/alerts.json', {
                    headers: {
                        'Referer': 'https://www.oref.org.il/',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                        'Accept-Language': 'he'
                    }
                });

                const alert = this.processAlert(response.data);
                if (alert) {
                    this.currentAlerts = [...this.currentAlerts, alert];
                    this.updateAlertHistory(alert);
                    this.eventEmitter.emit('alert.new', alert);
                    this.logger.log(`Alert processed for ${alert.areas.length} areas`);
                }

            } catch (error) {
                this.logger.error('Failed to fetch alerts:', error.message);
            } finally {
                setTimeout(poll, this.POLLING_INTERVAL);
            }
        };

        poll();
    }

    private processAlert(rawAlert: any): Alert | null {
        try {
            if (!rawAlert || !rawAlert.data) return null;

            const alertedCities = rawAlert.data as string[];
            const areas = alertedCities
                .map(cityName => {
                    const city = this.findCity(cityName);
                    if (!city) return null;

                    return {
                        areaName: cityName,
                        areaNameHe: cityName,
                        lat: city.location.lat,
                        lng: city.location.lng,
                        threatLevel: this.calculateAreaThreatLevel(cityName)
                    };
                })
                .filter((area): area is AlertArea => area !== null);

            if (areas.length === 0) return null;

            return {
                id: rawAlert.id || Date.now().toString(),
                category: rawAlert.category || 'unknown',
                title: rawAlert.title || '',
                description: rawAlert.description || '',
                areas,
                timestamp: new Date()
            };
        } catch (error) {
            this.logger.  error('Error processing alert:', error);
            return null;
        }
    }

    private findCity(cityName: string): City | undefined {
        return this.cities.find(c => 
            c.city === cityName || 
            c.city.toLowerCase() === cityName.toLowerCase()
        );
    }

    private calculateAreaThreatLevel(areaName: string): number {
        const history = this.alertHistory.get(areaName);
        if (!history) return 0;

        const hoursSinceLastAlert = (Date.now() - history.lastAlert.getTime()) / (1000 * 60 * 60);
        const baseLevel = Math.min(1, history.alertCount / 10);
        const recencyFactor = Math.exp(-hoursSinceLastAlert / 24);

        return baseLevel * recencyFactor;
    }

    private updateAlertHistory(alert: Alert) {
        alert.areas.forEach(area => {
            const existing = this.alertHistory.get(area.areaName) || {
                areaName: area.areaName,
                alertCount: 0,
                lastAlert: new Date(0),
                threatLevel: 0
            };

            this.alertHistory.set(area.areaName, {
                ...existing,
                alertCount: existing.alertCount + 1,
                lastAlert: new Date(),
                threatLevel: this.calculateAreaThreatLevel(area.areaName)
            });
        });
    }

    getCurrentAlerts(): Alert[] {
        return this.currentAlerts;
    }

    getAlertHistory(): AlertHistory[] {
        return Array.from(this.alertHistory.values());
    }

    getAreaThreatLevel(areaName: string): number {
        return this.alertHistory.get(areaName)?.threatLevel || 0;
    }

    getAllCities(): City[] {
        return this.cities;
    }

    getCitiesByRegion(region: string): City[] {
        return this.cities.filter(city => city.region === region);
    }

    getCityLocation(cityName: string) {
        return this.findCity(cityName)?.location;
    }
}