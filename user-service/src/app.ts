import 'reflect-metadata';
import express from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';

import { errorHandler } from './controller/middleware/errorHandler.js';
import container from './di/container.js';

// Ensure controllers are registered
import './controller/UserController.js';
import './controller/HealthController.js';

const server = new InversifyExpressServer(container);

server
  .setConfig((app: express.Application) => {
    app.use(express.json());
  })
  .setErrorConfig((app: express.Application) => {
    app.use(errorHandler);
  });

const app = server.build();
export default app;
