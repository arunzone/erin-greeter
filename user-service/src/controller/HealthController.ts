import { Request, Response } from 'express';
import { controller, httpGet, response, request } from 'inversify-express-utils';

import prisma from '../prisma.js';

@controller('/')
export class HealthController {
  @httpGet('healthz')
  public healthz(@response() res: Response) {
    return res.status(200).json({ status: 'ok' });
  }

  @httpGet('health/db')
  public async healthDb(@request() _req: Request, @response() res: Response) {
    try {
      const result = await prisma.$queryRawUnsafe('SELECT 1 as ok');
      return res.status(200).json({ db: 'ok', result });
    } catch (_err) {
      return res.status(500).json({ db: 'error' });
    }
  }
}

export default HealthController;
