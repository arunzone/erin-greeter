import { inject, injectable } from 'inversify';

import { TYPES } from 'di/types.js';
import { User } from 'domain/User.js';
import { CreateUserDto, UserCommandRepository } from 'repository/interface/UserCommandRepository.js';
import { NotFoundError } from 'errors/HttpError.js';

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserCommandRepository)
    private readonly commands: UserCommandRepository<User>,
  ) {}

  async create(data: CreateUserDto): Promise<User> {
    return this.commands.create(data);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.commands.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('User not found');
    }
  }
}

export default UserService;
