import { Module } from '@nestjs/common';
import { MapController } from './map.controller';
import { MapService } from './map.service';

@Module({
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}