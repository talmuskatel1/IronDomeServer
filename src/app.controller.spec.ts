// server/src/app.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { beforeEach, describe, it } from 'node:test';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn(),
            checkHealth: jest.fn(),
            getVersion: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      jest.spyOn(appService, 'getHello').mockReturnValue('Hello World!');
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const healthStatus = { status: 'ok' };
      jest.spyOn(appService, 'checkHealth').mockReturnValue(healthStatus);
      expect(appController.checkHealth()).toBe(healthStatus);
    });
  });

  describe('version', () => {
    it('should return app version', () => {
      const versionInfo = { version: '1.0.0' };
      jest.spyOn(appService, 'getVersion').mockReturnValue(versionInfo);
      expect(appController.getVersion()).toBe(versionInfo);
    });
  });
});