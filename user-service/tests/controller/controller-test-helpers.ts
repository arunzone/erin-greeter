
import { jest } from '@jest/globals';
import express from 'express';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';

import { errorHandler } from 'controller/middleware/errorHandler.js';
import { JwtAuthMiddleware } from 'controller/middleware/JwtAuthMiddleware.js';
import { TYPES } from 'di/types.js';
import { MockJwtAuthMiddleware } from '../__mocks__/MockJwtAuthMiddleware.js';

// Ensure controller is registered for inversify-express-utils
import 'controller/UserController.js';
import { UserService } from 'service/UserService.js';

// Build an express app using inversify-express-utils with a mocked service
export const setupApp = (serviceMock: Partial<UserService>, useAuth = false) => {
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind<Partial<UserService>>(TYPES.UserService).toConstantValue(serviceMock);
  if (useAuth) {
    container.bind<JwtAuthMiddleware>(JwtAuthMiddleware).toSelf();
  } else {
    container.bind<JwtAuthMiddleware>(JwtAuthMiddleware).to(MockJwtAuthMiddleware);
  }

  const server = new InversifyExpressServer(container);
  server.setConfig((app) => {
    app.use(express.json());
  });
  server.setErrorConfig((app) => {
    app.use(errorHandler);
  });
  return server.build();
};
