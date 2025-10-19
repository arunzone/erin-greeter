import { User } from '../../domain/User.js';
import { CreateUserDto } from '../../repository/interface/UserCommandRepository.js';

export type CreateUserRequest = { firstName: string; lastName?: string };
export type UserResponse = {
  id: string;
  firstName: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
};

export const toCreateUserDto = (req: CreateUserRequest): CreateUserDto => ({
  firstName: req.firstName,
  ...(req.lastName !== undefined ? { lastName: req.lastName } : {}),
});

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  firstName: user.firstName,
  ...(user.lastName !== undefined ? { lastName: user.lastName } : {}),
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});
