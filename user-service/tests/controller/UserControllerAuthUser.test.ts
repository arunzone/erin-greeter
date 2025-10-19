import { jest } from '@jest/globals';
import express from 'express';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { errorHandler } from 'controller/middleware/errorHandler';
import { TYPES } from 'di/types';
import { User } from 'domain/User';
import { JwtAuthMiddleware } from 'controller/middleware/JwtAuthMiddleware';

// Ensure controller is registered for inversify-express-utils
import 'controller/UserController';

// Build an express app using inversify-express-utils with a mocked service
const setupApp = (serviceMock: { delete: jest.Mock }) => {
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind(TYPES.UserService).toConstantValue(serviceMock as any);
  container.bind<JwtAuthMiddleware>(JwtAuthMiddleware).toConstantValue(new JwtAuthMiddleware());

  const server = new InversifyExpressServer(container);
  server.setConfig((app) => {
    app.use(express.json());
  });
  server.setErrorConfig((app) => {
    app.use(errorHandler);
  });
  return server.build();
};

describe('User auth', () => {
  const validId = '123e4567-e89b-12d3-a456-426614174000';

  const mockUserService = () => {
    return {
      delete: jest.fn(),
    } as unknown as {
      delete: jest.MockedFunction<(id: string) => Promise<void>>;
    };
  };

  test('should return 401 on delete when no token provided', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const res = await request(app).delete('/users/invalid');

    expect(res).toMatchObject({
      status: 401,
    });
  });

  test('should return 401 on create when invalid token provided', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const res = await request(app).post('/users').send({firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney'});

    expect(res).toMatchObject({
      status: 401,
    });
  });

  test('should allow with valid Authorization header and fail on body validation (400)', async () => {
    const service = mockUserService();
    // Ensure middleware has a secret to verify against
    process.env.JWT_SECRET = 'test-secret';
    const app = setupApp(service as any);

    const token = jwt.sign({ sub: 'tester', role: 'user' }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res).toMatchObject({
      status: 400,
    });
  });

  test('should allow with valid Authorization header and fail on body validation (400)', async () => {
    const service = mockUserService();
    // Ensure middleware has a secret to verify against
    const app = setupApp(service as any);

    const res = await request(app)
      .post('/users')
      .set('Authorization', 'Bearer some-token')
      .send({firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney'});

    expect(res).toMatchObject({
      status: 401,
    });
  });

  test('should return 401 when JWT secret is not configured', async () => {
    const service = mockUserService();
    const previous = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      const app = setupApp(service as any);

      const res = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer whatever')
        .send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney' });

      expect(res).toMatchObject({ status: 401 });
    } finally {
      if (previous === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = previous;
      }
    }
  });

  
});
