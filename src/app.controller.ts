// server/src/app.controller.ts

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  checkHealth() {
    return this.appService.checkHealth();
  }

  @Get('version')
  getVersion() {
    return this.appService.getVersion();
  }
}