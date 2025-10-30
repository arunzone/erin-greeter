import { Request, Response } from 'express';
import { inject } from 'inversify';
import {
  controller,
  httpPost,
  httpDelete,
  httpPut,
  request,
  response,
  requestParam,
} from 'inversify-express-utils';

import { toCreateUserDto, toUserResponse } from 'controller/dto/UserDtos.js';
import { UpdateUserDto, updateUserSchema } from 'controller/dto/UpdateUserDto.js';
import { JwtAuthMiddleware } from 'controller/middleware/JwtAuthMiddleware.js';
import { validateBody, validateParams } from 'controller/middleware/validate.js';
import { TYPES } from 'di/types.js';
import { User } from 'domain/User.js';
import UserService from 'service/UserService.js';
import { idParamSchema, userCreateSchema } from 'validation/zod.js';

@controller('/', JwtAuthMiddleware)
export class UserController {
  constructor(@inject(TYPES.UserService) private readonly userService: UserService) {}

  @httpPost('users', validateBody(userCreateSchema))
  public async create(@request() request: Request, @response() response: Response) {
    const userDto = toCreateUserDto(request.body);
    const createdUser: User = await this.userService.create(userDto);
    return response.status(201).json(toUserResponse(createdUser));
  }

  @httpDelete('users/:id', validateParams(idParamSchema))
  public async delete(@requestParam('id') id: string, @response() response: Response) {
    await this.userService.delete(id);
    return response.status(204).send();
  }

  @httpPut('users/:id', validateParams(idParamSchema), validateBody(updateUserSchema))
  public async update(
    @requestParam('id') id: string,
    @request() request: Request,
    @response() response: Response,
  ) {
    const userDto: UpdateUserDto = toCreateUserDto(request.body);
    const updatedUser: User = await this.userService.update(id, userDto);
    return response.status(200).json(toUserResponse(updatedUser));
  }
}

export default UserController;
