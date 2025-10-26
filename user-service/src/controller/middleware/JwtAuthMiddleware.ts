import { Request, Response, NextFunction } from 'express';
import { injectable } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import jwt from 'jsonwebtoken';

import { UnauthorizedError } from 'errors/HttpError.js';

interface AuthenticatedRequest extends Request {
  user?: any;
}

@injectable()
export class JwtAuthMiddleware extends BaseMiddleware {
  public handler(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new UnauthorizedError('No secret provided');
    }

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded; // Attach the decoded payload to the request
      next(); // Proceed to the next middleware or controller
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
