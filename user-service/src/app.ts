import 'reflect-metadata';
import express from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';

import { errorHandler } from 'controller/middleware/errorHandler';
import container from 'di/container';

// Ensure controllers are registered
import 'controller/UserController';
import 'controller/HealthController';

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
