import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { Container } from 'inversify';

import prisma from '../prisma.js';
import { UserCommandRepository } from '../repository/interface/UserCommandRepository.js';
import { UserQueryRepository } from '../repository/interface/UserQueryRepository.js';
import { PostgressUserCommandRepository } from '../repository/PostgressUserCommandRepository.js';
import { PostgressUserQueryRepository } from '../repository/PostgressUserQueryRepository.js';
import UserService from '../service/UserService.js';

import { TYPES } from '../di/types.js';

const container = new Container({ defaultScope: 'Singleton' });

// Core singletons
container.bind<PrismaClient>(TYPES.Prisma).toConstantValue(prisma);

container.bind<UserService>(TYPES.UserService).to(UserService);

container
  .bind<UserCommandRepository<any>>(TYPES.UserCommandRepository)
  .to(PostgressUserCommandRepository);

container
  .bind<UserQueryRepository<any>>(TYPES.UserQueryRepository)
  .to(PostgressUserQueryRepository);

export default container;
