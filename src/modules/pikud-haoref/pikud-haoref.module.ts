import { Module } from '@nestjs/common';
import { PikudHaorefController } from './pikud-haoref.controller';
import { PikudHaorefService } from './pikud-haoref.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
    imports: [EventEmitterModule.forRoot()],
    controllers: [PikudHaorefController],
    providers: [PikudHaorefService],
    exports: [PikudHaorefService],
})
export class PikudHaorefModule {}