import { jest } from '@jest/globals';
import express from 'express';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import request from 'supertest';

import { errorHandler } from 'controller/middleware/errorHandler';
import { TYPES } from 'di/types';
import { User } from 'domain/User';
import { CreateUserDto } from 'repository/interface/UserCommandRepository';

// Ensure controller is registered for inversify-express-utils
import 'controller/UserController';

// Build an express app using inversify-express-utils with a mocked service
const setupApp = (serviceMock: { create: jest.Mock }) => {
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind(TYPES.UserService).toConstantValue(serviceMock as any);

  const server = new InversifyExpressServer(container);
  server.setConfig((app) => {
    app.use(express.json());
  });
  server.setErrorConfig((app) => {
    app.use(errorHandler);
  });
  return server.build();
};

describe('User creation', () => {
  const validId = '123e4567-e89b-12d3-a456-426614174000';

  const mockUserService = () => {
    return {
      create: jest.fn(),
    } as unknown as {
      create: jest.MockedFunction<(data: CreateUserDto) => Promise<User>>;
    };
  };

  test('should return 400 with error payload for empty body', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const res = await request(app).post('/users').send({});

    expect(res).toMatchObject({
      status: 400,
      body: expect.objectContaining({ message: 'Invalid request' }),
    });
  });
  test('should return 400 with error payload for invalid timezone', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const res = await request(app).post('/users').send({});

    expect(res).toMatchObject({
      status: 400,
      body: expect.objectContaining({ message: 'Invalid request' }),
    });
  });

  test('should not call create on validation error', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    await request(app).post('/users').send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Hawthorn' });

    expect(service.create).not.toHaveBeenCalled();
  });

  test('should return 201 with created user on success', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const created = new User(
      validId,
      'Erin',
      'Example',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
    );
    service.create.mockResolvedValueOnce(created);

    const res = await request(app)
      .post('/users')
      .send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney' });

    expect(res).toMatchObject({
      status: 201,
      body: {
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        timeZone: 'Australia/Sydney',
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  });

  test('should return 500 on service error', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    service.create.mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/users')
      .send({ firstName: 'Erin', timeZone: 'Australia/Sydney' });

    expect(res).toMatchObject({
      status: 500,
      body: expect.objectContaining({ message: 'boom' }),
    });
  });
});
