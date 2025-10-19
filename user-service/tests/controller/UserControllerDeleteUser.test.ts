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
const setupApp = (serviceMock: { delete: jest.Mock }) => {
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

describe('User deletion', () => {
  const validId = '123e4567-e89b-12d3-a456-426614174000';

  const mockUserService = () => {
    return {
      delete: jest.fn(),
    } as unknown as {
      delete: jest.MockedFunction<(id: string) => Promise<void>>;
    };
  };

  test('should return 400 with non uuid id', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const res = await request(app).delete('/users/invalid');

    expect(res).toMatchObject({
      status: 400,
      body: expect.objectContaining({ message: 'Invalid request' }),
    });
  });

  test('should not call delete on validation error', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    await request(app).delete('/users/invalid');

    expect(service.delete).not.toHaveBeenCalled();
  });

  test('should return 204 with no content on success', async () => {
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
    service.delete.mockResolvedValueOnce();

    const res = await request(app)
      .delete(`/users/${validId}`);

    expect(res).toMatchObject({
      status: 204,
    });
  });

  test('should return 500 on service error', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    service.delete.mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .delete(`/users/${validId}`);

    expect(res).toMatchObject({
      status: 500,
      body: expect.objectContaining({ message: 'boom' }),
    });
  });
});
