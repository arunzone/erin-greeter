import request from 'supertest';
import app from '../src/app';

describe('Health Check', () => {
  it('should return status code 200', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });
  it('should return status ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.body).toEqual({ status: 'ok' });
  });
});
