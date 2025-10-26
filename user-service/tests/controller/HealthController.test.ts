import request from 'supertest';

import app from 'app';

jest.mock('../../src/prisma', () => ({
  __esModule: true,
  default: { $queryRawUnsafe: jest.fn() },
}));
import prisma from '../../src/prisma';

describe('Health Check', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('should return status code 200', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });
  test('should return status ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('should return 200 status code when database responds', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ ok: 1 }] as any);
    const res = await request(app).get('/health/db');

    expect(res.status).toBe(200);
  });

  test('should return ok payload when database responds', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ ok: 1 }] as any);
    const res = await request(app).get('/health/db');

    expect(res.body).toEqual({ db: 'ok', result: [{ ok: 1 }] });
  });

  test('should return db error when database call throws', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).get('/health/db');

    expect(res).toMatchObject({
      status: 500,
      body: { db: 'error' },
    });
  });
});
