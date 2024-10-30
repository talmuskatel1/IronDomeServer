// server/src/app.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  checkHealth() {
    return { status: 'ok' };
  }

  getVersion() {
    return { version: '1.0.0' }; // You might want to read this from a config file or environment variable
  }
}