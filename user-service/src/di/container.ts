import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { Container } from 'inversify';

import UserController from '../controller/UserController';
import prisma from '../prisma';
import { UserCommandRepository } from '../repository/interface/UserCommandRepository';
import { UserQueryRepository } from '../repository/interface/UserQueryRepository';
import { PostgressUserCommandRepository } from '../repository/PostgressUserCommandRepository';
import { PostgressUserQueryRepository } from '../repository/PostgressUserQueryRepository';
import UserService from '../service/UserService';

import { TYPES } from './types';

const container = new Container({ defaultScope: 'Singleton' });

// Core singletons
container.bind<PrismaClient>(TYPES.Prisma).toConstantValue(prisma);

container.bind<UserService>(TYPES.UserService).to(UserService);
container.bind<UserController>(TYPES.UserController).to(UserController);

container
  .bind<UserCommandRepository<any>>(TYPES.UserCommandRepository)
  .to(PostgressUserCommandRepository);

container
  .bind<UserQueryRepository<any>>(TYPES.UserQueryRepository)
  .to(PostgressUserQueryRepository);

export default container;
