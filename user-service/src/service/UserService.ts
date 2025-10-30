import { inject, injectable } from 'inversify';

import { TYPES } from 'di/types.js';
import { User } from 'domain/User.js';
import { UserEventType } from 'domain/UserEventType.js';
import { NotFoundError } from 'errors/HttpError.js';
import {
  CreateUserDto,
  UserCommandRepository,
} from 'repository/interface/UserCommandRepository.js';
import { UserQueryRepository } from 'repository/interface/UserQueryRepository.js';
import { SqsService } from 'service/interface/SqsService.js';
import { UpdateUserDto } from '../controller/dto/UpdateUserDto.js';

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserCommandRepository)
    private readonly commands: UserCommandRepository<User>,
    @inject(TYPES.UserQueryRepository)
    private readonly queries: UserQueryRepository<User>,
    @inject(TYPES.SqsService)
    private readonly sqsService: SqsService,
  ) {}

  async create(data: CreateUserDto): Promise<User> {
    const user = await this.commands.create(data);
    await this.sqsService.sendUserEvent(user, UserEventType.CREATED);
    return user;
  }

  async delete(id: string): Promise<void> {
    const user = await this.queries.getById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.commands.deleteById(id);

    await this.sqsService.sendUserEvent(user, UserEventType.DELETED);
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const user = await this.queries.getById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const partialUser: Partial<User> = {
      firstName: data.firstName,
      lastName: data.lastName,
      timeZone: data.timeZone,
      birthday: data.birthday,
    };

    const persistedUser = await this.commands.update(id, partialUser);
    await this.sqsService.sendUserEvent(persistedUser, UserEventType.UPDATED);
    return persistedUser;
  }
}

export default UserService;
