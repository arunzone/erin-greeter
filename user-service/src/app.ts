import express, { Request, Response } from 'express';

import UserController from 'controller/UserController';
import container from 'di/container';
import { TYPES } from 'di/types';

import prisma from './prisma';

const app = express();

app.use(express.json());

// Register routes via DI-resolved controller
const userController = container.get<UserController>(TYPES.UserController);
app.use('/', userController.router);

app.get('/healthz', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health/db', async (req: Request, res: Response) => {
  try {
    const result = await prisma.$queryRawUnsafe('SELECT 1 as ok');
    res.status(200).json({ db: 'ok', result });
  } catch (_err) {
    res.status(500).json({ db: 'error' });
  }
});

export default app;
