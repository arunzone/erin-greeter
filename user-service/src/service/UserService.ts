import { inject, injectable } from 'inversify';

import { TYPES } from 'di/types';
import { User } from 'domain/User';
import { CreateUserDto, UserCommandRepository } from 'repository/interface/UserCommandRepository';

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserCommandRepository)
    private readonly commands: UserCommandRepository<User>,
  ) {}

  async create(data: CreateUserDto): Promise<User> {
    return this.commands.create(data);
  }
}

export default UserService;
