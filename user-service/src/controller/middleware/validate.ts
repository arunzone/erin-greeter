import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema } from 'zod';

import { BadRequestError } from '../../errors/HttpError.js';

export const validateBody = (schema: ZodSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      const message = parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new BadRequestError('Invalid request', message);
    }
    req.body = parse.data;
    next();
  };
};
