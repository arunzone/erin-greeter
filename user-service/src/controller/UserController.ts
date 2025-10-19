import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';

import { TYPES } from 'di/types';
import { User } from 'domain/User';
import UserService from 'service/UserService';
import { userCreateSchema } from 'validation/zod';

@injectable()
export class UserController {
  public readonly router: Router;

  constructor(@inject(TYPES.UserService) private readonly service: UserService) {
    this.router = Router();
    this.router.post('/users', this.create);
  }

  private create = async (req: Request, res: Response) => {
    const parse = userCreateSchema.safeParse(req.body);
    if (!parse.success) {
      const message = parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      return res.status(400).json({ error: 'Invalid request', details: message });
    }

    try {
      const dto: { firstName: string; lastName?: string } = { firstName: parse.data.firstName };
      if (parse.data.lastName !== undefined) dto.lastName = parse.data.lastName;
      const created: User = await this.service.create(dto);
      return res.status(201).json(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({ error: 'Failed to create user', details: message });
    }
  };
}

export default UserController;
