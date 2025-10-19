import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, request, response } from 'inversify-express-utils';

import { TYPES } from 'di/types';
import { User } from 'domain/User';
import UserService from 'service/UserService';
import { userCreateSchema } from 'validation/zod';

import { toCreateUserDto, toUserResponse } from './dto/UserDtos';
import { validateBody } from './middleware/validate';

@controller('/')
export class UserController {
  constructor(@inject(TYPES.UserService) private readonly userService: UserService) {}

  @httpPost('users', validateBody(userCreateSchema))
  public async create(@request() request: Request, @response() response: Response) {
    const userDto = toCreateUserDto(request.body);
    const createdUser: User = await this.userService.create(userDto);
    return response.status(201).json(toUserResponse(createdUser));
  }
}

export default UserController;
