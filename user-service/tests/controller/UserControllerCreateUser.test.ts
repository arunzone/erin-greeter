import { jest } from '@jest/globals';
import request from 'supertest';

import { User } from 'domain/User.js';
import { CreateUserDto } from 'repository/interface/UserCommandRepository.js';

import { setupApp } from './controller-test-helpers.js';

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
    const app = setupApp(service);

    const res = await request(app).post('/users').send({});

    expect(res).toMatchObject({
      status: 400,
      body: expect.objectContaining({ message: 'Invalid request' }),
    });
  });
  test('should return 400 with error payload for invalid timezone', async () => {
    const service = mockUserService();
    const app = setupApp(service);

    const res = await request(app)
      .post('/users')
      .send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Hawthorn' });

    expect(res).toMatchObject({
      status: 400,
      body: expect.objectContaining({ message: 'Invalid request' }),
    });
  });

  test('should not call create on validation error', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    await request(app)
      .post('/users')
      .send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Hawthorn' });

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
