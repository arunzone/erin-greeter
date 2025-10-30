import { User } from '../../domain/User.js';
import { CreateUserDto } from '../../repository/interface/UserCommandRepository.js';
import { UpdateUserDto } from '../dto/UpdateUserDto.js';

export type CreateUserRequest = {
  firstName: string;
  lastName?: string;
  timeZone: string;
  birthday?: Date;
};
export type UserResponse = {
  id: string;
  firstName: string;
  lastName?: string;
  timeZone: string;
  createdAt: Date;
  updatedAt: Date;
  birthday?: Date;
};

export const toCreateUserDto = (req: CreateUserRequest): CreateUserDto => ({
  firstName: req.firstName,
  ...(req.lastName !== undefined ? { lastName: req.lastName } : {}),
  timeZone: req.timeZone,
  ...(req.birthday ? { birthday: new Date(req.birthday) } : {}),
});
export const toUpdateUserDto = (req: CreateUserRequest): UpdateUserDto => ({
  firstName: req.firstName,
  ...(req.lastName !== undefined ? { lastName: req.lastName } : {}),
  timeZone: req.timeZone,
  ...(req.birthday ? { birthday: new Date(req.birthday) } : {}),
});

export const toUserResponse = (user: User): UserResponse => ({
  ...user,
});
