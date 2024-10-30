import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MapService } from './map.service';
import { MapCell, Dome } from './map.types';

@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get()
  async getMap(): Promise<MapCell[]> {
    return this.mapService.getMap();
  }

  @Post('domes/:count')
  placeDomes(@Param('count') count: string): Dome[] {
    return this.mapService.placeDomes(parseInt(count, 10));
  }

  @Post('reset')
  resetMap() {
    return this.mapService.resetMap();
  }

  @Post('threat')
  updateThreat(@Body() data: { cellId: string; increase: number }) {
    return this.mapService.increaseThreatLevel(data.cellId, data.increase);
  }

  @Get('domes')
  getDomes(): Dome[] {
    return this.mapService.getDomes();
  }
}