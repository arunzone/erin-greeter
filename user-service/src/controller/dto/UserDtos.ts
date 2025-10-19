import { User } from '../../domain/User.js';
import { CreateUserDto } from '../../repository/interface/UserCommandRepository.js';

export type CreateUserRequest = { firstName: string; lastName?: string; timeZone: string };
export type UserResponse = {
  id: string;
  firstName: string;
  lastName?: string;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
};

export const toCreateUserDto = (req: CreateUserRequest): CreateUserDto => ({
  firstName: req.firstName,
  ...(req.lastName !== undefined ? { lastName: req.lastName } : {}),
  timeZone: req.timeZone,
});

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  firstName: user.firstName,
  ...(user.lastName !== undefined ? { lastName: user.lastName } : {}),
  timeZone: user.timeZone,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});
