import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, request, response } from 'inversify-express-utils';

import { TYPES } from 'di/types.js';
import { User } from 'domain/User.js';
import UserService from 'service/UserService.js';
import { userCreateSchema } from 'validation/zod.js';

import { toCreateUserDto, toUserResponse } from 'controller/dto/UserDtos.js';
import { validateBody } from 'controller/middleware/validate.js';

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
