import { injectable } from "inversify";
import { BaseMiddleware } from "inversify-express-utils";
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends  Request {
    user?: any;
}

@injectable()
export class MockJwtAuthMiddleware extends BaseMiddleware {
    public handler(
        req: AuthenticatedRequest,
        _res: Response,
        next: NextFunction
    ): void {
        req.user = {
            userId: 123,
            email: "test@example.com",
            role: "user"
        };
        
        next();
    }
}