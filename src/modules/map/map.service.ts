import { Injectable, Logger } from '@nestjs/common';
import { MapCell, Coordinate, Dome } from './map.types';
import * as turf from '@turf/turf';
import * as fs from 'fs';
import * as path from 'path';

interface StrategicSite {
  name: string;
  coordinates: [number, number];
  importance: number;
}

interface ThreatSource {
  name: string;
  type: 'point' | 'line';
  coordinates: [number, number] | [number, number][];
  maxThreat: number;
  maxDistance: number;
}

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  private originalMap: MapCell[] = [];
  private currentMap: MapCell[] = [];
  private domes: Dome[] = [];
  private readonly coverageRadius = 40;
  private readonly cellSize = 0.025;

  private readonly strategicSites: StrategicSite[] = [
    { name: 'Dimona Nuclear Facility', coordinates: [35.1397, 31.0597], importance: 1.0 },
    { name: 'Haifa Port', coordinates: [34.9950, 32.8219], importance: 0.9 },
    { name: 'Ashdod Port', coordinates: [34.6500, 31.8044], importance: 0.9 },
    { name: 'Ben Gurion Airport', coordinates: [34.8867, 32.0094], importance: 0.8 },
    { name: 'Ramat David Airbase', coordinates: [35.1819, 32.6653], importance: 0.8 },
    { name: 'Tel Nof Airbase', coordinates: [34.8194, 31.8397], importance: 0.8 },
    { name: 'Kirya Military HQ', coordinates: [34.7892, 32.0733], importance: 0.7 },
    { name: 'Hadera Power Station', coordinates: [34.8833, 32.4700], importance: 0.7 },
    { name: 'Ashkelon Power Station', coordinates: [34.5375, 31.6589], importance: 0.7 }
  ];

  private readonly threatSources: ThreatSource[] = [
    { 
      name: 'Gaza', 
      type: 'line',
      coordinates: [[34.2674, 31.5], [34.2674, 31.1342], [34.5388, 31.1342]], 
      maxThreat: 1.0, 
      maxDistance: 100 
    },
    { 
      name: 'Lebanon', 
      type: 'line',
      coordinates: [[35.1714, 33.0906], [35.5732, 33.0906]], 
      maxThreat: 0.9, 
      maxDistance: 80 
    },
    { 
      name: 'Syria', 
      type: 'line',
      coordinates: [[35.5732, 33.0906], [35.5732, 32.7091]], 
      maxThreat: 0.8, 
      maxDistance: 70 
    },
    { 
      name: 'Yemen', 
      type: 'point',
      coordinates: [44.0000, 15.0000], 
      maxThreat: 0.7, 
      maxDistance: 200 
    },
    { 
      name: 'Iraq', 
      type: 'point',
      coordinates: [44.0000, 33.0000], 
      maxThreat: 0.6, 
      maxDistance: 150 
    },
    { 
      name: 'Egypt', 
      type: 'line',
      coordinates: [[34.2674, 31.1342], [34.9196, 29.4977]], 
      maxThreat: 0.6, 
      maxDistance: 60 
    },
    { 
      name: 'Jordan', 
      type: 'line',
      coordinates: [[35.5732, 32.7091], [35.5732, 31.3], [35.0849, 29.5607]], 
      maxThreat: 0.4, 
      maxDistance: 50 
    }
  ];

  async onModuleInit() {
    this.logger.log('MapService initializing...');
    try {
      await this.initializeMap();
      this.logger.log('MapService initialization complete.');
    } catch (error) {
      this.logger.error(`MapService initialization failed: ${error.message}`);
      throw error;
    }
  }

  private async initializeMap() {
    const geojsonPath = path.resolve(__dirname, '..', '..', '..', 'src', 'modules', 'map', 'map.geojson');
    const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    
    const israelPolygon = geojsonData.features[0];
    const bbox = turf.bbox(geojsonData);
    const gridFeatures = turf.squareGrid(bbox, this.cellSize, { units: 'degrees' });

    this.originalMap = gridFeatures.features
      .filter(cell => {
        const center = turf.center(cell);
        return turf.booleanPointInPolygon(center, israelPolygon);
      })
      .map((cell, index) => {
        const center = turf.center(cell);
        const [lng, lat] = center.geometry.coordinates;
        const point = turf.point([lng, lat]);

        return {
          id: `cell-${index}`,
          coordinate: { lat, lng },
          buildingDensity: Math.random(),
          threatLevel: this.calculateThreatLevel(point),
          importanceLevel: this.calculateImportanceLevel([lng, lat]),
          isInIsrael: true,
        };
      });

    this.currentMap = this.cloneMap(this.originalMap);
    this.logger.log(`Map initialized with ${this.originalMap.length} cells`);
  }

  private calculateThreatLevel(point: ReturnType<typeof turf.point>): number {
    return Math.max(...this.threatSources.map(source => {
      try {
        let distance: number;
        if (source.type === 'line') {
          const coordinates = source.coordinates as [number, number][];
          const border = turf.lineString([...coordinates]);
          distance = turf.pointToLineDistance(point, border, { units: 'kilometers' });
        } else {
          const coordinates = source.coordinates as [number, number];
          const threatPoint = turf.point([...coordinates]);
          distance = turf.distance(point, threatPoint, { units: 'kilometers' });
        }
        return this.calculateBorderThreat(distance, source.maxDistance, source.maxThreat);
      } catch (error) {
        this.logger.warn(`Error calculating threat for source ${source.name}: ${error.message}`);
        return 0;
      }
    }));
  }

  private calculateImportanceLevel(point: [number, number]): number {
    return Math.max(...this.strategicSites.map(site => {
      const distance = turf.distance(
        turf.point(point),
        turf.point([...site.coordinates]),
        { units: 'kilometers' }
      );
      return this.calculateSiteImportance(distance, site.importance);
    }));
  }

  private calculateBorderThreat(distance: number, maxDistance: number, maxThreat: number): number {
    if (distance > maxDistance) return 0;
    return maxThreat * Math.exp(-distance / (maxDistance / 3));
  }

  private calculateSiteImportance(distance: number, maxImportance: number): number {
    const maxDistance = 50;
    if (distance > maxDistance) return 0;
    return maxImportance * Math.exp(-distance / (maxDistance / 3));
  }

  async getMap(): Promise<MapCell[]> {
    return this.currentMap;
  }

  placeDomes(count: number): Dome[] {
    this.currentMap = this.cloneMap(this.originalMap);
    const newDomePositions = this.simulatedAnnealing(count, 5);
    this.domes = newDomePositions.map((coord, index) => ({
      id: `dome-${index}`,
      coordinate: coord
    }));
    this.applyThreatReductionForAllDomes();
    
    return this.domes;
  }

  private simulatedAnnealing(count: number, iterations: number = 5): Coordinate[] {
    let bestSolution = this.generateInitialSolution(count);
    let bestEnergy = this.calculateEnergy(bestSolution);
  
    for (let i = 0; i < iterations; i++) {
      let currentSolution = [...bestSolution];
      let currentEnergy = bestEnergy;
      let temperature = 100;
      const coolingRate = 0.995;
  
      while (temperature > 1) {
        const newSolution = this.generateNeighborSolution(currentSolution);
        const newEnergy = this.calculateEnergy(newSolution);
  
        if (this.acceptanceProbability(currentEnergy, newEnergy, temperature) > Math.random()) {
          currentSolution = newSolution;
          currentEnergy = newEnergy;
  
          if (newEnergy < bestEnergy) {
            bestSolution = [...newSolution];
            bestEnergy = newEnergy;
          }
        }
  
        temperature *= coolingRate;
      }
      
      this.logger.log(`Iteration ${i + 1} completed. Best energy: ${bestEnergy}`);
    }
  
    return bestSolution;
  }

  private generateInitialSolution(count: number): Coordinate[] {
    return this.originalMap
      .filter(cell => cell.isInIsrael)
      .sort((a, b) => {
        const aScore = a.threatLevel * (a.importanceLevel + 1);
        const bScore = b.threatLevel * (b.importanceLevel + 1);
        return bScore - aScore;
      })
      .slice(0, count)
      .map(cell => cell.coordinate);
  }

  private generateNeighborSolution(solution: Coordinate[]): Coordinate[] {
    const newSolution = [...solution];
    const indexToChange = Math.floor(Math.random() * newSolution.length);
    const availableCells = this.originalMap.filter(cell => 
      cell.isInIsrael && 
      !solution.some(coord => this.calculateDistance(coord, cell.coordinate) < this.coverageRadius / 2)
    );
    
    if (availableCells.length > 0) {
      const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
      newSolution[indexToChange] = randomCell.coordinate;
    }
    
    return newSolution;
  }

  private calculateEnergy(solution: Coordinate[]): number {
    const tempMap = this.cloneMap(this.originalMap);
    solution.forEach(domeCoord => this.applyThreatReduction(tempMap, domeCoord));
    return tempMap.reduce((total, cell) => 
      total + cell.threatLevel * cell.buildingDensity * (cell.importanceLevel + 1), 0);
  }

  increaseThreatLevel(cellId: string, increase: number) {
    const cell = this.currentMap.find(c => c.id === cellId);
    if (!cell) return;

    // Update the clicked cell
    cell.threatLevel = Math.min(1, cell.threatLevel + increase);

    // Propagate the threat to neighboring cells
    const centerPoint = turf.point([cell.coordinate.lng, cell.coordinate.lat]);
    const maxPropagationDistance = 20; // km

    this.currentMap.forEach(neighborCell => {
      if (neighborCell.id !== cellId) {
        const neighborPoint = turf.point([neighborCell.coordinate.lng, neighborCell.coordinate.lat]);
        const distance = turf.distance(centerPoint, neighborPoint, { units: 'kilometers' });
        
        if (distance <= maxPropagationDistance) {
          const propagationFactor = Math.exp(-distance / (maxPropagationDistance / 3));
          const threatIncrease = increase * propagationFactor;
          neighborCell.threatLevel = Math.min(1, neighborCell.threatLevel + threatIncrease);
        }
      }
    });

    this.recalculateDomePositions();
    return { message: 'Threat level updated and domes repositioned' };
  }

  private applyThreatReduction(map: MapCell[], domeCoord: Coordinate): void {
    map.forEach(cell => {
      const distance = this.calculateDistance(cell.coordinate, domeCoord);
      if (distance <= this.coverageRadius) {
        const protectionFactor = Math.max(0, 1 - (distance / this.coverageRadius));
        cell.threatLevel *= (1 - protectionFactor);
        cell.threatLevel = Math.max(0, cell.threatLevel);
      }
    });
  }

  private applyThreatReductionForAllDomes(): void {
    this.currentMap = this.cloneMap(this.originalMap);
    this.domes.forEach(dome => this.applyThreatReduction(this.currentMap, dome.coordinate));
  }

  private recalculateDomePositions() {
    if (this.domes.length === 0) return;
    const newDomePositions = this.simulatedAnnealing(this.domes.length);
    this.domes = newDomePositions.map((coord, index) => ({
      id: `dome-${index}`,
      coordinate: coord
    }));
    this.applyThreatReductionForAllDomes();
  }

  getDomes(): Dome[] {
    return this.domes;
  }

  resetMap() {
    this.domes = [];
    this.currentMap = this.cloneMap(this.originalMap);
    return { message: 'Map reset successfully' };
  }

  private calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    return turf.distance(
      turf.point([coord1.lng, coord1.lat]),
      turf.point([coord2.lng, coord2.lat]),
      { units: 'kilometers' }
    );
  }

  private cloneMap(map: MapCell[]): MapCell[] {
    return map.map(cell => ({...cell}));
  }

  private acceptanceProbability(currentEnergy: number, newEnergy: number, temperature: number): number {
    if (newEnergy < currentEnergy) return 1;
    return Math.exp((currentEnergy - newEnergy) / temperature);
  }
}