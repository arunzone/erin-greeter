import { jest } from '@jest/globals';
import request from 'supertest';

import { User } from 'domain/User.js';
import { NotFoundError } from 'errors/HttpError.js';
import { setupApp } from './controller-test-helpers.js';
import { UpdateUserDto } from 'controller/dto/UpdateUserDto.js';

describe('User update', () => {
  const validId = '123e4567-e89b-12d3-a456-426614174000';

  const mockUserService = () => {
    return {
      update: jest.fn(),
      getById: jest.fn(),
    } as unknown as {
      update: jest.MockedFunction<(id: string, data: UpdateUserDto) => Promise<User>>;
      getById: jest.MockedFunction<(id: string) => Promise<User | undefined>>;
    };
  };

  test('should return 400 with error payload for empty body', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const res = await request(app).put(`/users/${validId}`).send({});

    expect(res).toMatchObject({
      status: 400,
      body: expect.objectContaining({ message: 'Invalid request' }),
    });
  });

  test('should return 400 with error payload for invalid timezone', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const res = await request(app)
      .put(`/users/${validId}`)
      .send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Hawthorn' });

    expect(res).toMatchObject({
      status: 400,
      body: expect.objectContaining({ message: 'Invalid request' }),
    });
  });

  test('should return 404 if user not found', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    service.update.mockRejectedValueOnce(new NotFoundError('User not found'));

    const res = await request(app)
      .put(`/users/${validId}`)
      .send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney' });

    expect(res).toMatchObject({
      status: 404,
      body: expect.objectContaining({ message: 'User not found' }),
    });
  });

  test('should return 200 with updated user on success', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    const updated = new User(
      validId,
      'Erin',
      'Example',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
    );
    service.update.mockResolvedValueOnce(updated);

    const res = await request(app)
      .put(`/users/${validId}`)
      .send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney' });

    expect(res).toMatchObject({
      status: 200,
      body: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        timeZone: 'Australia/Sydney',
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  test('should return 500 on service error', async () => {
    const service = mockUserService();
    const app = setupApp(service as any);

    service.update.mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .put(`/users/${validId}`)
      .send({ firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney' });

    expect(res).toMatchObject({
      status: 500,
      body: expect.objectContaining({ message: 'boom' }),
    });
  });
});
