import { Controller, Get } from '@nestjs/common';
import { PikudHaorefService } from './pikud-haoref.service';
import { Alert } from './pikud-haoref.types';

@Controller('pikud-haoref')
export class PikudHaorefController {
    constructor(private readonly pikudHaorefService: PikudHaorefService) {}

    @Get('alerts')
    getCurrentAlerts(): Alert[] {
        return this.pikudHaorefService.getCurrentAlerts();
    }
}